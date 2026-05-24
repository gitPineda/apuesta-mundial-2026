import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Operator)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary() {
    return this.reports.summary();
  }

  @Get('general-summary')
  generalSummary() {
    return this.reports.generalSummary();
  }

  @Get('matches/:id/summary')
  matchSummary(@Param('id') id: string) {
    return this.reports.matchSummary(id);
  }

  @Get('matches/:id/bettors')
  bettorsByMatch(@Param('id') id: string) {
    return this.reports.bettorsByMatch(id);
  }
}
