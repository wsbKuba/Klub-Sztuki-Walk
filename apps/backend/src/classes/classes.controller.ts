import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ClassesService } from './classes.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CancelClassDto } from './dto/cancel-class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private classesService: ClassesService) {}

  // ===== CLASS TYPES (publiczne) =====

  @Get()
  async getAllClassTypes() {
    return this.classesService.getAllClassTypes();
  }

  @Get(':id')
  async getClassTypeById(@Param('id', ParseUUIDPipe) id: string) {
    return this.classesService.getClassTypeById(id);
  }
}

@Controller('schedule')
export class ScheduleController {
  constructor(private classesService: ClassesService) {}

  // ===== SCHEDULE (wymaga logowania) =====

  @Get()
  @UseGuards(JwtAuthGuard)
  async getSchedule(
    @Query('dayOfWeek') dayOfWeek?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const day = dayOfWeek !== undefined ? parseInt(dayOfWeek, 10) : undefined;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.classesService.getScheduleWithCancellations(day, start, end);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
  async createSchedule(@Body() dto: CreateScheduleDto, @Request() req) {
    return this.classesService.createSchedule(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @Request() req,
  ) {
    return this.classesService.updateSchedule(id, dto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
  async deleteSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    await this.classesService.deleteSchedule(id, req.user.id);
    return { message: 'Termin został usunięty' };
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
  async cancelClass(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelClassDto,
    @Request() req,
  ) {
    const trainerName = `${req.user.firstName} ${req.user.lastName}`;
    return this.classesService.cancelClass(id, dto, req.user.id, trainerName);
  }
}
