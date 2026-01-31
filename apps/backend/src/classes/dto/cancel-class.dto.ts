import { IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export class CancelClassDto {
  @IsDateString()
  @IsNotEmpty()
  date: string; // Data zajęć do odwołania (YYYY-MM-DD)

  @IsOptional()
  @IsString()
  reason?: string; // Opcjonalny powód odwołania
}
