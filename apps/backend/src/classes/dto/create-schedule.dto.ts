import { IsUUID, IsNotEmpty, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  classTypeId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 = Niedziela, 6 = Sobota

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime musi być w formacie HH:MM',
  })
  @IsNotEmpty()
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime musi być w formacie HH:MM',
  })
  @IsNotEmpty()
  endTime: string;
}
