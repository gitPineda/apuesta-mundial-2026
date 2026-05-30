import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateBankTransferDto {
  @IsUUID()
  betId: string;

  @IsUUID()
  bankAccountId: string;

  @IsString()
  @Matches(/^\d{4,30}$/, {
    message: 'El numero de transferencia debe tener solo digitos, entre 4 y 30 caracteres.',
  })
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
