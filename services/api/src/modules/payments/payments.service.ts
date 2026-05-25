import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessError } from '../../common/errors/business-error';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { CreateBankTransferDto } from './dto/create-bank-transfer.dto';
import { InitiatePayphoneDto } from './dto/initiate-payphone.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async createBankTransfer(userId: string, dto: CreateBankTransferDto) {
    return this.db.transaction(async (client) => {
      const betResult = await client.query(
        `select * from bets where id = $1 and user_id = $2 for update`,
        [dto.betId, userId],
      );
      const bet = betResult.rows[0];
      if (!bet) {
        throw new BusinessError('BET_NOT_FOUND', 'La apuesta no existe.', HttpStatus.NOT_FOUND);
      }
      if (bet.status !== 'pending_payment') {
        throw new BusinessError('BET_NOT_PAYABLE', 'La apuesta no esta pendiente de pago.');
      }

      const accountResult = await client.query(
        `select * from bank_accounts where id = $1 and is_active = true`,
        [dto.bankAccountId],
      );
      if (!accountResult.rows[0]) {
        throw new BusinessError('BANK_ACCOUNT_NOT_FOUND', 'La cuenta bancaria no esta disponible.');
      }

      const paymentResult = await client.query(
        `
        insert into payments(bet_id, user_id, provider, amount, status, idempotency_key)
        values ($1,$2,'bank_transfer',$3,'pending',$4)
        returning *
        `,
        [bet.id, userId, bet.total_stake, `bank-${bet.id}-${dto.transferNumber}`],
      );
      const payment = paymentResult.rows[0];

      const receiptResult = await client.query(
        `
        insert into bank_transfer_receipts(
          payment_id,
          bank_account_id,
          transfer_number,
          sender_bank,
          sender_name,
          sender_document,
          transfer_date,
          receipt_file_url
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8)
        returning *
        `,
        [
          payment.id,
          dto.bankAccountId,
          dto.transferNumber,
          dto.senderBank,
          dto.senderName,
          dto.senderDocument ?? null,
          dto.transferDate,
          dto.receiptFileUrl ?? null,
        ],
      );

      await client.query(
        `
        update bets
        set status = 'payment_review', payment_status = 'pending', source = 'bank_transfer'
        where id = $1
        `,
        [bet.id],
      );

      await this.audit.log({
        actorUserId: userId,
        action: 'payment.bank_transfer.created',
        entityType: 'payments',
        entityId: payment.id,
        afterData: { payment, receipt: receiptResult.rows[0] },
      });

      return { payment, receipt: receiptResult.rows[0] };
    });
  }

  async getActiveBankAccounts() {
    const result = await this.db.query(
      `
      select id, bank_name, account_holder, account_number, account_type, document_number, instructions
      from bank_accounts
      where is_active = true
      order by created_at asc
      `,
    );
    return result.rows;
  }

  async initiatePayphone(userId: string, dto: InitiatePayphoneDto) {
    void userId;
    void dto;
    throw new BusinessError(
      'PAYPHONE_DISABLED',
      'PayPhone aun no esta habilitado. Usa transferencia bancaria.',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  async getPayment(userId: string, paymentId: string) {
    const result = await this.db.query(
      `select * from payments where id = $1 and user_id = $2`,
      [paymentId, userId],
    );
    return result.rows[0] ?? null;
  }
}
