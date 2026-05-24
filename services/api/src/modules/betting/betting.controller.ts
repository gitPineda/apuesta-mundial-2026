import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BettingService } from './betting.service';
import { CreateBetDto, QuoteBetDto } from './dto/quote-bet.dto';

@ApiTags('betting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bets')
export class BettingController {
  constructor(private readonly betting: BettingService) {}

  @Post('quote')
  quote(@CurrentUser() user: CurrentUser, @Body() dto: QuoteBetDto) {
    return this.betting.quote(user.id, dto);
  }

  @Post()
  create(@CurrentUser() user: CurrentUser, @Body() dto: CreateBetDto) {
    return this.betting.createBet(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: CurrentUser) {
    return this.betting.findUserBets(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.betting.findUserBet(user.id, id);
  }
}
