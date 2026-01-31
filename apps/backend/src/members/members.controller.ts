import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MembersService } from './members.service';

@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
export class MembersController {
  constructor(private membersService: MembersService) {}

  /**
   * HU-23: Przeglądanie listy aktywnych członków
   * Zwraca listę użytkowników z aktywnymi subskrypcjami
   * Możliwość filtrowania według typu zajęć
   */
  @Get()
  async getMembers(@Query('classTypeId') classTypeId?: string) {
    return this.membersService.getMembersWithSubscriptions(classTypeId);
  }

  /**
   * Statystyki członków - liczba aktywnych subskrypcji per typ zajęć
   */
  @Get('stats')
  async getMembersStats() {
    return this.membersService.getMembersStats();
  }
}
