import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsOptional()
  @IsIn(['normal', 'final'])
  matchKind?: 'normal' | 'final';

  @IsString()
  @MaxLength(12)
  homeTeamCode: string;

  @IsString()
  @MaxLength(80)
  homeTeamName: string;

  @IsString()
  @MaxLength(12)
  awayTeamCode: string;

  @IsString()
  @MaxLength(80)
  awayTeamName: string;

  @IsDateString()
  kickoffDateEc: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  kickoffTimeEc: string;

  @IsString()
  @MaxLength(120)
  venueName: string;

  @IsString()
  @MaxLength(80)
  venueCity: string;

  @IsString()
  @MaxLength(80)
  venueCountry: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  venueTimezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tournamentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  phase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  groupName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bettingCutoffMinutes?: number;

  @IsOptional()
  @IsBoolean()
  bettingEnabled?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  homeWinOdds: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  drawOdds?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  awayWinOdds: number;
}
