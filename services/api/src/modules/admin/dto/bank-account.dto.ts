import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BankAccountDto {
  @IsString()
  @MaxLength(120)
  bankName: string;

  @IsString()
  @MaxLength(160)
  accountHolder: string;

  @IsString()
  @MaxLength(80)
  accountNumber: string;

  @IsString()
  @MaxLength(40)
  accountType: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
