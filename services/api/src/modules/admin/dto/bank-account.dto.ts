import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class BankAccountDto {
  @IsString()
  @MaxLength(120)
  bankName: string;

  @IsString()
  @MaxLength(160)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, {
    message: 'El titular solo puede contener letras y espacios.',
  })
  accountHolder: string;

  @IsString()
  @MaxLength(80)
  @Matches(/^\d+$/, {
    message: 'El numero de cuenta solo puede contener digitos.',
  })
  accountNumber: string;

  @IsString()
  @MaxLength(40)
  accountType: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^\d{10,13}$/, {
    message: 'El documento/RUC debe tener solo digitos, entre 10 y 13 caracteres.',
  })
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
