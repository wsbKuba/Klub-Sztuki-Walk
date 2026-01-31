import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRATOR)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('trainers')
  async getAllTrainers() {
    return this.adminService.getAllTrainers();
  }

  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Post('trainers')
  async createTrainer(@Body() dto: CreateTrainerDto) {
    return this.adminService.createTrainer(dto);
  }

  @Patch('trainers/:id')
  async updateTrainer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrainerDto,
  ) {
    return this.adminService.updateTrainer(id, dto);
  }

  @Patch('trainers/:id/deactivate')
  async deactivateTrainer(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deactivateTrainer(id);
  }

  @Patch('trainers/:id/activate')
  async activateTrainer(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.activateTrainer(id);
  }

  @Post('trainers/:id/reset-password')
  async resetTrainerPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.resetTrainerPassword(id);
  }
}
