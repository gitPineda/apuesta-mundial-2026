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
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, {
    message: 'El nombre del depositante solo puede contener letras y espacios.',
  })
  senderName: string;

  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'La identificacion del depositante debe tener exactamente 10 digitos.',
  })
  senderDocument: string;

  @IsDateString()
  transferDate: string;

  @IsOptional()
  @IsString()
  receiptFileUrl?: string;
}
