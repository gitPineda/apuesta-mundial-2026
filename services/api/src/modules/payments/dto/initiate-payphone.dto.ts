import { IsString, IsUUID } from 'class-validator';

export class InitiatePayphoneDto {
  @IsUUID()
  betId: string;

  @IsString()
  idempotencyKey: string;
}
