import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassType } from './entities/class-type.entity';
import { ClassSchedule } from './entities/class-schedule.entity';
import { ClassCancellation } from './entities/class-cancellation.entity';
import { NewsService } from '../news/news.service';
import { NewsType } from '../news/entities/news.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CancelClassDto } from './dto/cancel-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(ClassType)
    private classTypeRepository: Repository<ClassType>,
    @InjectRepository(ClassSchedule)
    private scheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(ClassCancellation)
    private cancellationRepository: Repository<ClassCancellation>,
    private newsService: NewsService,
  ) {}

  // ===== CLASS TYPES =====

  async getAllClassTypes(): Promise<ClassType[]> {
    return this.classTypeRepository.find({
      order: { name: 'ASC' },
    });
  }

  async getClassTypeById(id: string): Promise<ClassType> {
    const classType = await this.classTypeRepository.findOne({
      where: { id },
    });

    if (!classType) {
      throw new NotFoundException('Typ zajęć nie został znaleziony');
    }

    return classType;
  }

  // ===== SCHEDULE =====

  async getSchedule(dayOfWeek?: number): Promise<ClassSchedule[]> {
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.classType', 'classType')
      .leftJoinAndSelect('schedule.trainer', 'trainer')
      .where('schedule.isActive = :isActive', { isActive: true });

    if (dayOfWeek !== undefined) {
      queryBuilder.andWhere('schedule.dayOfWeek = :dayOfWeek', { dayOfWeek });
    }

    queryBuilder.orderBy('schedule.dayOfWeek', 'ASC');
    queryBuilder.addOrderBy('schedule.startTime', 'ASC');

    return queryBuilder.getMany();
  }

  async getScheduleWithCancellations(
    dayOfWeek?: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<(ClassSchedule & { cancellations: ClassCancellation[] })[]> {
    const schedules = await this.getSchedule(dayOfWeek);

    // Pobierz odwołania dla dat w zakresie
    const scheduleIds = schedules.map((s) => s.id);

    if (scheduleIds.length === 0) {
      return [];
    }

    const queryBuilder = this.cancellationRepository
      .createQueryBuilder('cancellation')
      .where('cancellation.classScheduleId IN (:...scheduleIds)', { scheduleIds });

    if (startDate) {
      queryBuilder.andWhere('cancellation.date >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('cancellation.date <= :endDate', { endDate });
    }

    const cancellations = await queryBuilder.getMany();

    // Mapuj odwołania do harmonogramów
    return schedules.map((schedule) => ({
      ...schedule,
      cancellations: cancellations.filter((c) => c.classScheduleId === schedule.id),
    }));
  }

  async createSchedule(dto: CreateScheduleDto, trainerId: string): Promise<ClassSchedule> {
    // Sprawdź czy typ zajęć istnieje
    const classType = await this.classTypeRepository.findOne({
      where: { id: dto.classTypeId },
    });

    if (!classType) {
      throw new NotFoundException('Typ zajęć nie został znaleziony');
    }

    // Walidacja kolizji
    await this.validateNoConflict(dto.dayOfWeek, dto.startTime, dto.endTime);

    const schedule = this.scheduleRepository.create({
      classTypeId: dto.classTypeId,
      trainerId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      isActive: true,
    });

    return this.scheduleRepository.save(schedule);
  }

  async updateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    trainerId: string,
  ): Promise<ClassSchedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Termin nie został znaleziony');
    }

    // Sprawdź czy trener jest właścicielem terminu
    if (schedule.trainerId !== trainerId) {
      throw new ForbiddenException('Nie masz uprawnień do edycji tego terminu');
    }

    // Walidacja kolizji (jeśli zmieniane są godziny lub dzień)
    if (dto.dayOfWeek !== undefined || dto.startTime || dto.endTime) {
      await this.validateNoConflict(
        dto.dayOfWeek ?? schedule.dayOfWeek,
        dto.startTime ?? schedule.startTime,
        dto.endTime ?? schedule.endTime,
        id,
      );
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  async deleteSchedule(id: string, trainerId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Termin nie został znaleziony');
    }

    if (schedule.trainerId !== trainerId) {
      throw new ForbiddenException('Nie masz uprawnień do usunięcia tego terminu');
    }

    // Soft delete - oznacz jako nieaktywny
    schedule.isActive = false;
    await this.scheduleRepository.save(schedule);
  }

  // ===== CANCELLATIONS =====

  async cancelClass(
    scheduleId: string,
    dto: CancelClassDto,
    trainerId: string,
    trainerName: string,
  ): Promise<ClassCancellation> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ['classType'],
    });

    if (!schedule) {
      throw new NotFoundException('Termin nie został znaleziony');
    }

    if (schedule.trainerId !== trainerId) {
      throw new ForbiddenException('Nie masz uprawnień do odwołania tego terminu');
    }

    // Sprawdź czy zajęcia nie są już odwołane w tym dniu
    const cancellationDate = new Date(dto.date);
    const existingCancellation = await this.cancellationRepository.findOne({
      where: {
        classScheduleId: scheduleId,
        date: cancellationDate,
      },
    });

    if (existingCancellation) {
      throw new ConflictException('Zajęcia są już odwołane w tym dniu');
    }

    const cancellation = this.cancellationRepository.create({
      classScheduleId: scheduleId,
      date: cancellationDate,
      reason: dto.reason,
    });

    await this.cancellationRepository.save(cancellation);

    // Automatycznie utwórz aktualność o odwołaniu
    const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const formattedDate = cancellationDate.toLocaleDateString('pl-PL');

    await this.newsService.create(
      {
        title: `Odwołane zajęcia: ${schedule.classType.name}`,
        content: `Zajęcia ${schedule.classType.name} zaplanowane na ${dayNames[schedule.dayOfWeek]} (${formattedDate}) zostały odwołane.${dto.reason ? ` Powód: ${dto.reason}` : ''}`,
        type: NewsType.CANCELLATION,
      },
      trainerId,
    );

    return cancellation;
  }

  // ===== HELPERS =====

  private async validateNoConflict(
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder('schedule')
      .where('schedule.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('schedule.isActive = true')
      .andWhere(
        '(schedule.startTime < :endTime AND schedule.endTime > :startTime)',
        { startTime, endTime },
      );

    if (excludeId) {
      queryBuilder.andWhere('schedule.id != :excludeId', { excludeId });
    }

    const conflicts = await queryBuilder.getMany();

    if (conflicts.length > 0) {
      throw new ConflictException(
        'Istnieje już inny termin w tym przedziale czasowym',
      );
    }
  }
}
