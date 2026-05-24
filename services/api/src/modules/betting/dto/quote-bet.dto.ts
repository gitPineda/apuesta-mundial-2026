import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { BetSelectionDto } from './bet-selection.dto';

export class QuoteBetDto {
  @IsNumber()
  @Min(1)
  stake: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BetSelectionDto)
  selections: BetSelectionDto[];
}

export class CreateBetDto extends QuoteBetDto {
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
