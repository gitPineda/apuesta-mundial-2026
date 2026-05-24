import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller()
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Get('tournaments/current')
  getCurrentTournament() {
    return this.matches.getCurrentTournament();
  }

  @Get('matches')
  findAll(@Query('date') date?: string, @Query('timezone') timezone?: string) {
    return this.matches.findAll(date, timezone);
  }

  @Get('matches/by-date')
  findByDate(@Query('date') date: string, @Query('timezone') timezone?: string) {
    return this.matches.findByDate(date, timezone);
  }

  @Get('matches/:id')
  findOne(@Param('id') id: string) {
    return this.matches.findOne(id);
  }

  @Get('matches/:id/markets')
  getMarkets(@Param('id') id: string) {
    return this.matches.getMarkets(id);
  }
}
