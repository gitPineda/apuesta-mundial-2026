import { IsIn, IsNumber, Min } from 'class-validator';

export class UpdateOddDto {
  @IsNumber()
  @Min(1)
  decimalOdds: number;

  @IsIn(['active', 'suspended', 'inactive'])
  status: 'active' | 'suspended' | 'inactive';
}
