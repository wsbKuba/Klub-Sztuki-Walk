import { IsString, IsOptional, IsEnum, IsUrl, MaxLength } from 'class-validator';
import { NewsType } from '../entities/news.entity';

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(NewsType)
  type?: NewsType;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;
}
