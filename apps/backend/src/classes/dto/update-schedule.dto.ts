import { IsOptional, IsInt, Min, Max, Matches, IsBoolean } from 'class-validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime musi być w formacie HH:MM',
  })
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime musi być w formacie HH:MM',
  })
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
