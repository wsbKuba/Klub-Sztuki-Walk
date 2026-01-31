import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }
    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.usersRepository.update(id, userData);
    return this.findById(id);
  }

  async saveRefreshToken(userId: string, token: string): Promise<void> {
    // Hash the token before saving
    const hashedToken = await bcrypt.hash(token, 10);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshToken = this.refreshTokensRepository.create({
      userId,
      token: hashedToken,
      expiresAt,
    });

    await this.refreshTokensRepository.save(refreshToken);
  }

  async findRefreshToken(userId: string, token: string): Promise<RefreshToken | null> {
    const tokens = await this.refreshTokensRepository.find({
      where: { userId },
    });

    for (const dbToken of tokens) {
      const isValid = await bcrypt.compare(token, dbToken.token);
      if (isValid && dbToken.expiresAt > new Date()) {
        return dbToken;
      }
    }

    return null;
  }

  async deleteRefreshToken(userId: string, token: string): Promise<void> {
    const refreshToken = await this.findRefreshToken(userId, token);
    if (refreshToken) {
      await this.refreshTokensRepository.delete(refreshToken.id);
    }
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokensRepository.delete({ userId });
  }
}
