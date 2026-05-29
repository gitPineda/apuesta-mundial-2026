import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class FeeSettingsDto {
  @IsString()
  @MaxLength(80)
  name: string;

  @IsNumber()
  @Min(0)
  platformFeePercent: number;

  @IsNumber()
  @Min(0)
  operatorFeePercent: number;

  @IsNumber()
  @Min(1)
  maxBetAmount: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
