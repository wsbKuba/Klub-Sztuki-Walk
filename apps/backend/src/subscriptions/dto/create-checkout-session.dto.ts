import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsUUID()
  @IsNotEmpty()
  classTypeId: string;
}
