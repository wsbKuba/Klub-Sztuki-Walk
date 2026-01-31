import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News, NewsType } from './entities/news.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
  ) {}

  async findAll(type?: NewsType): Promise<News[]> {
    const queryBuilder = this.newsRepository
      .createQueryBuilder('news')
      .leftJoinAndSelect('news.author', 'author')
      .orderBy('news.publishedAt', 'DESC');

    if (type) {
      queryBuilder.where('news.type = :type', { type });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<News> {
    const news = await this.newsRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!news) {
      throw new NotFoundException('Aktualność nie została znaleziona');
    }

    return news;
  }

  async create(dto: CreateNewsDto, authorId: string): Promise<News> {
    const news = this.newsRepository.create({
      ...dto,
      authorId,
      publishedAt: new Date(),
    });

    return this.newsRepository.save(news);
  }

  async update(
    id: string,
    dto: UpdateNewsDto,
    userId: string,
    userRole: UserRole,
  ): Promise<News> {
    const news = await this.findOne(id);

    // Sprawdź uprawnienia - tylko autor lub ADMIN może edytować
    if (news.authorId !== userId && userRole !== UserRole.ADMINISTRATOR) {
      throw new ForbiddenException('Nie masz uprawnień do edycji tej aktualności');
    }

    Object.assign(news, dto);
    news.updatedAt = new Date();

    return this.newsRepository.save(news);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const news = await this.findOne(id);

    // Sprawdź uprawnienia - tylko autor lub ADMIN może usunąć
    if (news.authorId !== userId && userRole !== UserRole.ADMINISTRATOR) {
      throw new ForbiddenException('Nie masz uprawnień do usunięcia tej aktualności');
    }

    await this.newsRepository.remove(news);
  }
}
