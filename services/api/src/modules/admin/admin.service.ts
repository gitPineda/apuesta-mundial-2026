import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessError } from '../../common/errors/business-error';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { BankAccountDto } from './dto/bank-account.dto';
import { FeeSettingsDto } from './dto/fee-settings.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { UpdateOddDto } from './dto/update-odd.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async dashboard() {
    const result = await this.db.query(`
      select
        (select count(*) from profiles) as users,
        (select count(*) from bets) as bets,
        (
          select coalesce(sum(total_stake), 0)
          from bets
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ) as total_staked,
        (select count(*) from bank_transfer_receipts where admin_status = 'pending_review') as pending_transfers
    `);
    return result.rows[0];
  }

  async listFeeSettings() {
    const result = await this.db.query(`select * from fee_settings order by created_at desc`);
    return result.rows;
  }

  async createFeeSettings(adminId: string, dto: FeeSettingsDto) {
    return this.db.transaction(async (client) => {
      if (dto.isActive) {
        await client.query(`update fee_settings set is_active = false where is_active = true`);
      }
      const result = await client.query(
        `
        insert into fee_settings(name, platform_fee_percent, operator_fee_percent, is_active)
        values ($1,$2,$3,$4)
        returning *
        `,
        [dto.name, dto.platformFeePercent, dto.operatorFeePercent, dto.isActive ?? false],
      );
      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'fee_settings.created',
        entityType: 'fee_settings',
        entityId: result.rows[0].id,
        afterData: result.rows[0],
      });
      return result.rows[0];
    });
  }

  async activateFeeSettings(adminId: string, id: string) {
    return this.db.transaction(async (client) => {
      await client.query(`update fee_settings set is_active = false where is_active = true`);
      const result = await client.query(
        `update fee_settings set is_active = true, updated_at = now() where id = $1 returning *`,
        [id],
      );
      if (!result.rows[0]) {
        throw new BusinessError('FEE_SETTINGS_NOT_FOUND', 'Configuracion no encontrada.', HttpStatus.NOT_FOUND);
      }
      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'fee_settings.activated',
        entityType: 'fee_settings',
        entityId: id,
        afterData: result.rows[0],
      });
      return result.rows[0];
    });
  }

  async pendingTransfers() {
    const result = await this.db.query(
      `
      select btr.*, p.amount, p.currency, p.bet_id, pr.email
      from bank_transfer_receipts btr
      join payments p on p.id = btr.payment_id
      join profiles pr on pr.id = p.user_id
      where btr.admin_status = 'pending_review'
      order by btr.created_at asc
      `,
    );
    return result.rows;
  }

  async approveTransfer(adminId: string, receiptId: string) {
    return this.db.transaction(async (client) => {
      const receiptResult = await client.query(
        `
        select btr.*, p.bet_id, p.id as payment_id
        from bank_transfer_receipts btr
        join payments p on p.id = btr.payment_id
        where btr.id = $1
        for update
        `,
        [receiptId],
      );
      const receipt = receiptResult.rows[0];
      if (!receipt) {
        throw new BusinessError('TRANSFER_NOT_FOUND', 'Transferencia no encontrada.', HttpStatus.NOT_FOUND);
      }
      if (receipt.admin_status !== 'pending_review') {
        throw new BusinessError('TRANSFER_ALREADY_REVIEWED', 'La transferencia ya fue revisada.');
      }

      await client.query(
        `update bank_transfer_receipts set admin_status = 'approved', reviewed_by = $2, reviewed_at = now() where id = $1`,
        [receiptId, adminId],
      );
      await client.query(
        `update payments set status = 'confirmed', confirmed_at = now() where id = $1`,
        [receipt.payment_id],
      );
      await client.query(
        `update bets set status = 'active', payment_status = 'confirmed', confirmed_at = now() where id = $1`,
        [receipt.bet_id],
      );

      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'bank_transfer.approved',
        entityType: 'bank_transfer_receipts',
        entityId: receiptId,
        beforeData: receipt,
      });

      return { approved: true };
    });
  }

  async rejectTransfer(adminId: string, receiptId: string, reason: string) {
    return this.db.transaction(async (client) => {
      const receiptResult = await client.query(
        `
        select btr.*, p.bet_id, p.id as payment_id
        from bank_transfer_receipts btr
        join payments p on p.id = btr.payment_id
        where btr.id = $1
        for update
        `,
        [receiptId],
      );
      const receipt = receiptResult.rows[0];
      if (!receipt) {
        throw new BusinessError('TRANSFER_NOT_FOUND', 'Transferencia no encontrada.', HttpStatus.NOT_FOUND);
      }

      await client.query(
        `
        update bank_transfer_receipts
        set admin_status = 'rejected', reviewed_by = $2, reviewed_at = now(), rejection_reason = $3
        where id = $1
        `,
        [receiptId, adminId, reason],
      );
      await client.query(`update payments set status = 'rejected' where id = $1`, [receipt.payment_id]);
      await client.query(
        `update bets set status = 'pending_payment', payment_status = 'rejected' where id = $1`,
        [receipt.bet_id],
      );

      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'bank_transfer.rejected',
        entityType: 'bank_transfer_receipts',
        entityId: receiptId,
        beforeData: receipt,
        afterData: { reason },
      });

      return { rejected: true };
    });
  }

  async registerResult(adminId: string, matchId: string, dto: MatchResultDto) {
    const result = await this.db.query(
      `
      insert into match_results(match_id, home_score, away_score, recorded_by)
      values ($1,$2,$3,$4)
      on conflict (match_id) do update
      set home_score = excluded.home_score,
          away_score = excluded.away_score,
          recorded_by = excluded.recorded_by,
          recorded_at = now()
      returning *
      `,
      [matchId, dto.homeScore, dto.awayScore, adminId],
    );
    await this.db.query(`update matches set status = 'finished' where id = $1`, [matchId]);
    await this.audit.log({
      actorUserId: adminId,
      actorRole: 'admin',
      action: 'match_result.upserted',
      entityType: 'matches',
      entityId: matchId,
      afterData: result.rows[0],
    });
    return result.rows[0];
  }

  async settleMatch(adminId: string, matchId: string) {
    return this.db.transaction(async (client) => {
      const resultQuery = await client.query(
        `select * from match_results where match_id = $1 for update`,
        [matchId],
      );
      const matchResult = resultQuery.rows[0];
      if (!matchResult) {
        throw new BusinessError('MATCH_RESULT_REQUIRED', 'Debe registrar el resultado oficial antes de liquidar.');
      }

      const statusQuery = await client.query(
        `
        select
          count(*) filter (where b.status in ('active', 'paid'))::int as open_to_settle,
          count(*) filter (where b.status in ('won', 'lost'))::int as already_settled
        from bets b
        join bet_selections bs on bs.bet_id = b.id
        where bs.match_id = $1
        `,
        [matchId],
      );
      const status = statusQuery.rows[0];
      if (Number(status.open_to_settle) === 0 && Number(status.already_settled) > 0) {
        return {
          matchId,
          alreadySettled: true,
          result: {
            homeScore: matchResult.home_score,
            awayScore: matchResult.away_score,
          },
          settled: Number(status.already_settled),
          won: 0,
          lost: 0,
        };
      }

      const selectionsQuery = await client.query(
        `
        select
          b.id as bet_id,
          b.user_id,
          b.net_payout,
          bs.id as selection_id,
          bs.selection_key,
          bm.type as market_type
        from bets b
        join bet_selections bs on bs.bet_id = b.id
        join betting_markets bm on bm.id = bs.market_id
        where bs.match_id = $1
          and b.status in ('active', 'paid')
        for update
        `,
        [matchId],
      );

      let won = 0;
      let lost = 0;

      for (const row of selectionsQuery.rows) {
        const selectionWon = this.evaluateSelection(
          row.market_type,
          row.selection_key,
          Number(matchResult.home_score),
          Number(matchResult.away_score),
        );
        const selectionStatus = selectionWon ? 'won' : 'lost';
        const betStatus = selectionWon ? 'won' : 'lost';

        await client.query(
          `update bet_selections set status = $2::bet_selection_status where id = $1`,
          [row.selection_id, selectionStatus],
        );
        await client.query(
          `update bets set status = $2::bet_status, settled_at = now() where id = $1`,
          [row.bet_id, betStatus],
        );

        if (selectionWon) {
          won += 1;
          await client.query(
            `
            insert into ledger_entries(user_id, bet_id, type, amount, metadata)
            values ($1, $2, 'bet_payout', $3, $4)
            `,
            [
              row.user_id,
              row.bet_id,
              row.net_payout,
              JSON.stringify({
                matchId,
                selectionId: row.selection_id,
                marketType: row.market_type,
                selectionKey: row.selection_key,
              }),
            ],
          );
        } else {
          lost += 1;
        }
      }

      await client.query(
        `update betting_markets set status = 'settled', updated_at = now() where match_id = $1`,
        [matchId],
      );

      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'match.settled',
        entityType: 'matches',
        entityId: matchId,
        afterData: { won, lost, result: matchResult },
      });

      return {
        matchId,
        result: {
          homeScore: matchResult.home_score,
          awayScore: matchResult.away_score,
        },
        settled: won + lost,
        won,
        lost,
      };
    });
  }

  async getMatchSettlement(matchId: string) {
    const result = await this.db.query(
      `
      select home_score, away_score, is_official, recorded_at
      from match_results
      where match_id = $1
      `,
      [matchId],
    );
    const summary = await this.db.query(
      `
      select
        count(*)::int as total,
        count(*) filter (where b.status = 'won')::int as won,
        count(*) filter (where b.status = 'lost')::int as lost,
        count(*) filter (where b.status in ('active', 'paid'))::int as open_to_settle,
        count(*) filter (where b.status in ('won', 'lost'))::int as already_settled,
        coalesce(sum(b.total_stake), 0) as total_stake,
        coalesce(sum(b.net_payout) filter (where b.status = 'won'), 0) as total_payout
      from bets b
      join bet_selections bs on bs.bet_id = b.id
      where bs.match_id = $1
        and b.status in ('active', 'paid', 'won', 'lost')
      `,
      [matchId],
    );
    const rows = await this.db.query(
      `
      select
        p.email,
        b.id as bet_id,
        b.total_stake,
        b.net_payout,
        b.status,
        bs.selection_key,
        bm.name as market_name,
        bm.type as market_type
      from bets b
      join profiles p on p.id = b.user_id
      join bet_selections bs on bs.bet_id = b.id
      join betting_markets bm on bm.id = bs.market_id
      where bs.match_id = $1
        and b.status in ('active', 'paid', 'won', 'lost')
      order by b.created_at desc
      `,
      [matchId],
    );

    return {
      officialResult: result.rows[0] ?? null,
      canSettle: Boolean(result.rows[0]?.is_official),
      alreadySettled: Number(summary.rows[0]?.already_settled ?? 0) > 0 && Number(summary.rows[0]?.open_to_settle ?? 0) === 0,
      summary: summary.rows[0],
      bets: rows.rows,
    };
  }

  private evaluateSelection(
    marketType: string,
    selectionKey: string,
    homeScore: number,
    awayScore: number,
  ) {
    if (marketType === 'match_winner') {
      if (selectionKey === 'home_win') return homeScore > awayScore;
      if (selectionKey === 'draw') return homeScore === awayScore;
      if (selectionKey === 'away_win') return awayScore > homeScore;
      return false;
    }

    if (marketType === 'exact_score') {
      const match = selectionKey.match(/^score_(\d+)_(\d+)$/);
      if (!match) return false;
      return Number(match[1]) === homeScore && Number(match[2]) === awayScore;
    }

    return false;
  }

  async getMatchMarkets(matchId: string) {
    const result = await this.db.query(
      `
      select
        bm.*,
        coalesce(
          json_agg(
            json_build_object(
              'id', o.id,
              'selectionKey', o.selection_key,
              'selectionLabel', o.selection_label,
              'decimalOdds', o.decimal_odds,
              'status', o.status
            )
            order by case
              when o.selection_key = 'home_win' then 1
              when o.selection_key = 'draw' then 2
              when o.selection_key = 'away_win' then 3
              else 9
            end, o.selection_key
          ) filter (where o.id is not null),
          '[]'
        ) as odds
      from betting_markets bm
      left join odds o on o.market_id = bm.id
      where bm.match_id = $1
      group by bm.id
      order by bm.type, bm.created_at
      `,
      [matchId],
    );
    return result.rows;
  }

  async updateOdd(adminId: string, oddId: string, dto: UpdateOddDto) {
    const before = await this.db.query(`select * from odds where id = $1`, [oddId]);
    if (!before.rows[0]) {
      throw new BusinessError('ODD_NOT_FOUND', 'Cuota no encontrada.', HttpStatus.NOT_FOUND);
    }

    const result = await this.db.query(
      `
      update odds
      set decimal_odds = $2,
          status = $3::odds_status,
          updated_at = now()
      where id = $1
      returning *
      `,
      [oddId, dto.decimalOdds, dto.status],
    );

    await this.audit.log({
      actorUserId: adminId,
      actorRole: 'admin',
      action: 'odds.updated',
      entityType: 'odds',
      entityId: oddId,
      beforeData: before.rows[0],
      afterData: result.rows[0],
    });

    return result.rows[0];
  }

  async listBankAccounts() {
    const result = await this.db.query(`select * from bank_accounts order by created_at desc`);
    return result.rows;
  }

  async createBankAccount(adminId: string, dto: BankAccountDto) {
    const result = await this.db.query(
      `
      insert into bank_accounts(
        bank_name,
        account_holder,
        account_number,
        account_type,
        document_number,
        instructions,
        is_active
      )
      values ($1,$2,$3,$4,$5,$6,$7)
      returning *
      `,
      [
        dto.bankName,
        dto.accountHolder,
        dto.accountNumber,
        dto.accountType,
        dto.documentNumber ?? null,
        dto.instructions ?? null,
        dto.isActive ?? true,
      ],
    );
    await this.audit.log({
      actorUserId: adminId,
      actorRole: 'admin',
      action: 'bank_account.created',
      entityType: 'bank_accounts',
      entityId: result.rows[0].id,
      afterData: result.rows[0],
    });
    return result.rows[0];
  }

  async updateBankAccount(adminId: string, id: string, dto: BankAccountDto) {
    const before = await this.db.query(`select * from bank_accounts where id = $1`, [id]);
    if (!before.rows[0]) {
      throw new BusinessError('BANK_ACCOUNT_NOT_FOUND', 'Cuenta bancaria no encontrada.', HttpStatus.NOT_FOUND);
    }
    const result = await this.db.query(
      `
      update bank_accounts
      set bank_name = $2,
          account_holder = $3,
          account_number = $4,
          account_type = $5,
          document_number = $6,
          instructions = $7,
          is_active = $8
      where id = $1
      returning *
      `,
      [
        id,
        dto.bankName,
        dto.accountHolder,
        dto.accountNumber,
        dto.accountType,
        dto.documentNumber ?? null,
        dto.instructions ?? null,
        dto.isActive ?? true,
      ],
    );
    await this.audit.log({
      actorUserId: adminId,
      actorRole: 'admin',
      action: 'bank_account.updated',
      entityType: 'bank_accounts',
      entityId: id,
      beforeData: before.rows[0],
      afterData: result.rows[0],
    });
    return result.rows[0];
  }
}
