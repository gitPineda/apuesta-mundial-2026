import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateBankTransferDto } from './dto/create-bank-transfer.dto';
import { InitiatePayphoneDto } from './dto/initiate-payphone.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('bank-accounts')
  getBankAccounts() {
    return this.payments.getActiveBankAccounts();
  }

  @Post('bank-transfer')
  createBankTransfer(@CurrentUser() user: CurrentUser, @Body() dto: CreateBankTransferDto) {
    return this.payments.createBankTransfer(user.id, dto);
  }

  @Post('payphone/initiate')
  initiatePayphone(@CurrentUser() user: CurrentUser, @Body() dto: InitiatePayphoneDto) {
    return this.payments.initiatePayphone(user.id, dto);
  }

  @Post('payphone/webhook')
  payphoneWebhook(@Body() payload: unknown) {
    return {
      received: true,
      message: 'Webhook reservado para fase 3. Debe validar token, monto exacto e idempotencia.',
      payload,
    };
  }

  @Get(':id')
  getPayment(@CurrentUser() user: CurrentUser, @Param('id') id: string) {
    return this.payments.getPayment(user.id, id);
  }
}
