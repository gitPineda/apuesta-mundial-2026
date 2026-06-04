import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@Controller()
export class MatchesController {
  constructor(
    private readonly matches: MatchesService,
    private readonly auth: AuthService,
  ) {}

  @Get('tournaments/current')
  getCurrentTournament() {
    return this.matches.getCurrentTournament();
  }

  @Get('matches')
  async findAll(
    @Query('date') date?: string,
    @Query('timezone') timezone?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getOptionalUserId(authorization);
    return this.matches.findAll(date, timezone, userId);
  }

  @Get('matches/by-date')
  async findByDate(
    @Query('date') date: string,
    @Query('timezone') timezone?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.getOptionalUserId(authorization);
    return this.matches.findByDate(date, timezone, userId);
  }

  @Get('matches/available-dates')
  findAvailableDates() {
    return this.matches.findAvailableDates();
  }

  @Get('matches/:id')
  async findOne(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const userId = await this.getOptionalUserId(authorization);
    return this.matches.findOne(id, userId);
  }

  @Get('matches/:id/markets')
  getMarkets(@Param('id') id: string) {
    return this.matches.getMarkets(id);
  }

  private async getOptionalUserId(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      const user = await this.auth.validateBearerToken(authorization.replace('Bearer ', '').trim());
      return user.id;
    } catch {
      return null;
    }
  }
}
