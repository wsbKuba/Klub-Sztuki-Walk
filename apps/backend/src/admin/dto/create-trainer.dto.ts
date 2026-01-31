import { IsEmail, IsNotEmpty, IsString, IsOptional, MinLength, Matches } from 'class-validator';

export class CreateTrainerDto {
  @IsEmail({}, { message: 'Podaj poprawny adres email' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @MinLength(8, { message: 'Hasło musi mieć co najmniej 8 znaków' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
    message: 'Hasło musi zawierać małą literę, wielką literę, cyfrę i znak specjalny',
  })
  password?: string;
}
