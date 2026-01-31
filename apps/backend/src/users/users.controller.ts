import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req) {
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req, @Body() updateData: Partial<{ firstName: string; lastName: string; phone: string }>) {
    // Tylko pozwalamy edytować firstName, lastName, phone
    const allowedUpdates = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      phone: updateData.phone,
    };
    return this.usersService.update(req.user.id, allowedUpdates);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRENER, UserRole.ADMINISTRATOR)
  async getAllUsers() {
    // To będzie zwracało listę użytkowników - podstawowa implementacja
    // W pełnej wersji dodamy paginację, filtrowanie itd.
    return { message: 'Endpoint do zaimplementowania w następnych fazach' };
  }
}
