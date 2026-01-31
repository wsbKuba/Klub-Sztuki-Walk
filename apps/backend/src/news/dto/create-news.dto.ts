import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { NewsType } from '../entities/news.entity';

export class CreateNewsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(NewsType)
  type: NewsType;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;
}
