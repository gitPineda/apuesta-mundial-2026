import { IsString, MaxLength } from 'class-validator';

export class RejectTransferDto {
  @IsString()
  @MaxLength(300)
  reason: string;
}
