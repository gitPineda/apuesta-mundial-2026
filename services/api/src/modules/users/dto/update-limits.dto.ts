import { IsNumber, Min } from 'class-validator';

export class UpdateLimitsDto {
  @IsNumber()
  @Min(0)
  dailyLimit: number;

  @IsNumber()
  @Min(0)
  weeklyLimit: number;

  @IsNumber()
  @Min(0)
  monthlyLimit: number;
}
