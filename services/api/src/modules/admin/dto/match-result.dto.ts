import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class MatchResultDto {
  @IsInt()
  @Min(0)
  homeScore: number;

  @IsInt()
  @Min(0)
  awayScore: number;

  @IsOptional()
  @IsIn(['home_win', 'away_win'])
  championSelectionKey?: 'home_win' | 'away_win';
}
