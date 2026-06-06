import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/roles.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { BankAccountDto } from './dto/bank-account.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { FeeSettingsDto } from './dto/fee-settings.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { RejectTransferDto } from './dto/reject-transfer.dto';
import { UpdateOddDto } from './dto/update-odd.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Operator)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('fee-settings')
  listFeeSettings() {
    return this.admin.listFeeSettings();
  }

  @Post('fee-settings')
  @Roles(Role.Admin)
  createFeeSettings(@CurrentUser() user: CurrentUser, @Body() dto: FeeSettingsDto) {
    return this.admin.createFeeSettings(user.id, dto);
  }

  @Post('fee-settings/:id/activate')
  @Roles(Role.Admin)
  activateFeeSettings(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.admin.activateFeeSettings(user.id, id);
  }

  @Get('transfers/pending')
  pendingTransfers() {
    return this.admin.pendingTransfers();
  }

  @Get('users/sessions')
  @Roles(Role.Admin)
  activeUserSessions() {
    return this.admin.activeUserSessions();
  }

  @Post('users/:id/logout')
  @Roles(Role.Admin)
  forceUserLogout(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.admin.forceUserLogout(user.id, id);
  }

  @Post('matches')
  @Roles(Role.Admin)
  createMatch(@CurrentUser() user: CurrentUser, @Body() dto: CreateMatchDto) {
    return this.admin.createMatch(user.id, dto);
  }

  @Post('transfers/:id/approve')
  approveTransfer(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.admin.approveTransfer(user.id, id);
  }

  @Post('transfers/:id/reject')
  rejectTransfer(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: RejectTransferDto,
  ) {
    return this.admin.rejectTransfer(user.id, id, dto.reason);
  }

  @Post('matches/:id/result')
  registerResult(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: MatchResultDto,
  ) {
    return this.admin.registerResult(user.id, id, dto);
  }

  @Post('matches/:id/settle')
  settleMatch(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.admin.settleMatch(user.id, id);
  }

  @Get('matches/:id/settlement')
  getMatchSettlement(@Param('id') id: string) {
    return this.admin.getMatchSettlement(id);
  }

  @Get('matches/:id/markets')
  getMatchMarkets(@Param('id') id: string) {
    return this.admin.getMatchMarkets(id);
  }

  @Post('odds/:id')
  @Roles(Role.Admin)
  updateOdd(@CurrentUser() user: CurrentUser, @Param('id') id: string, @Body() dto: UpdateOddDto) {
    return this.admin.updateOdd(user.id, id, dto);
  }

  @Get('bank-accounts')
  getBankAccounts() {
    return this.admin.listBankAccounts();
  }

  @Post('bank-accounts')
  @Roles(Role.Admin)
  createBankAccount(@CurrentUser() user: CurrentUser, @Body() dto: BankAccountDto) {
    return this.admin.createBankAccount(user.id, dto);
  }

  @Post('bank-accounts/:id')
  @Roles(Role.Admin)
  updateBankAccount(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: BankAccountDto,
  ) {
    return this.admin.updateBankAccount(user.id, id, dto);
  }
}
