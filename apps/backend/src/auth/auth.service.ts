import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserRole } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    // Sprawdź czy email już istnieje
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email już istnieje');
    }

    // Hash hasła
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Utwórz użytkownika z rolą USER
    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
      role: UserRole.USER,
      isActive: true,
    });

    // Generuj tokeny
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Nieprawidłowe dane logowania');
    }

    // Weryfikacja hasła
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Nieprawidłowe dane logowania');
    }

    // Generuj tokeny
    return this.generateTokens(user);
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Dekoduj refresh token aby uzyskać userId
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Sprawdź czy refresh token istnieje w bazie
      const storedToken = await this.usersService.findRefreshToken(payload.sub, refreshToken);

      if (!storedToken) {
        throw new UnauthorizedException('Nieprawidłowy refresh token');
      }

      // Sprawdź czy użytkownik nadal istnieje i jest aktywny
      const user = await this.usersService.findById(payload.sub);

      if (!user.isActive) {
        throw new UnauthorizedException('Użytkownik nieaktywny');
      }

      // Wygeneruj nowy access token
      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m' },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Nieprawidłowy refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.usersService.deleteRefreshToken(userId, refreshToken);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ requiresRelogin: boolean }> {
    const user = await this.usersService.findById(userId);

    // Weryfikuj stare hasło
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new BadRequestException('Nieprawidłowe stare hasło');
    }

    // Hash nowego hasła
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Aktualizuj hasło
    await this.usersService.update(userId, { passwordHash: newPasswordHash });

    // Usuń wszystkie refresh tokeny - wymusi ponowne logowanie (HU-03)
    await this.usersService.deleteAllRefreshTokens(userId);

    return { requiresRelogin: true };
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
    });

    // Zapisz refresh token w bazie
    await this.usersService.saveRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
