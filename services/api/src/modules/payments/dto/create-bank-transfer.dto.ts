import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateBankTransferDto {
  @IsUUID()
  betId: string;

  @IsUUID()
  bankAccountId: string;

  @IsString()
  @MaxLength(80)
  transferNumber: string;

  @IsString()
  @MaxLength(80)
  senderBank: string;

  @IsString()
  @MaxLength(120)
  senderName: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  senderDocument?: string;

  @IsDateString()
  transferDate: string;

  @IsOptional()
  @IsString()
  receiptFileUrl?: string;
}
