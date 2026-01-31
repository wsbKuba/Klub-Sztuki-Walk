import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getAllTrainers(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.TRENER },
      order: { lastName: 'ASC', firstName: 'ASC' },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'isActive', 'createdAt'],
    });
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      order: { role: 'ASC', lastName: 'ASC' },
      select: ['id', 'email', 'firstName', 'lastName', 'phone', 'role', 'isActive', 'createdAt'],
    });
  }

  async createTrainer(dto: CreateTrainerDto): Promise<{ user: User; temporaryPassword?: string }> {
    // Sprawdź czy email jest już zajęty
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Użytkownik o tym adresie email już istnieje');
    }

    // Wygeneruj hasło tymczasowe jeśli nie podano
    const password = dto.password || this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const trainer = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: UserRole.TRENER,
      isActive: true,
    });

    const savedTrainer = await this.userRepository.save(trainer);

    // Usuń hasło z odpowiedzi
    const { passwordHash: _, ...userWithoutPassword } = savedTrainer;

    return {
      user: userWithoutPassword as User,
      temporaryPassword: dto.password ? undefined : password,
    };
  }

  async updateTrainer(id: string, dto: UpdateTrainerDto): Promise<User> {
    const trainer = await this.userRepository.findOne({
      where: { id, role: UserRole.TRENER },
    });

    if (!trainer) {
      throw new NotFoundException('Trener nie został znaleziony');
    }

    Object.assign(trainer, dto);
    const savedTrainer = await this.userRepository.save(trainer);

    // Usuń hasło z odpowiedzi
    const { passwordHash: _, ...userWithoutPassword } = savedTrainer;
    return userWithoutPassword as User;
  }

  async deactivateTrainer(id: string): Promise<User> {
    const trainer = await this.userRepository.findOne({
      where: { id, role: UserRole.TRENER },
    });

    if (!trainer) {
      throw new NotFoundException('Trener nie został znaleziony');
    }

    trainer.isActive = false;
    const savedTrainer = await this.userRepository.save(trainer);

    const { passwordHash: _, ...userWithoutPassword } = savedTrainer;
    return userWithoutPassword as User;
  }

  async activateTrainer(id: string): Promise<User> {
    const trainer = await this.userRepository.findOne({
      where: { id, role: UserRole.TRENER },
    });

    if (!trainer) {
      throw new NotFoundException('Trener nie został znaleziony');
    }

    trainer.isActive = true;
    const savedTrainer = await this.userRepository.save(trainer);

    const { passwordHash: _, ...userWithoutPassword } = savedTrainer;
    return userWithoutPassword as User;
  }

  async resetTrainerPassword(id: string): Promise<{ temporaryPassword: string }> {
    const trainer = await this.userRepository.findOne({
      where: { id, role: UserRole.TRENER },
    });

    if (!trainer) {
      throw new NotFoundException('Trener nie został znaleziony');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    trainer.passwordHash = passwordHash;
    await this.userRepository.save(trainer);

    return { temporaryPassword };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!A1'; // Dodaj znaki specjalne, cyfrę i wielką literę
  }
}
