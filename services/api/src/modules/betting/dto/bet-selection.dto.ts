import { IsUUID } from 'class-validator';

export class BetSelectionDto {
  @IsUUID()
  oddsId: string;
}
