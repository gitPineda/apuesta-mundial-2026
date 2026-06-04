import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessError } from '../../common/errors/business-error';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { SmtpMailService } from '../auth/smtp-mail.service';
import { BankAccountDto } from './dto/bank-account.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { FeeSettingsDto } from './dto/fee-settings.dto';
import { MatchResultDto } from './dto/match-result.dto';
import { UpdateOddDto } from './dto/update-odd.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly mail: SmtpMailService,
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
        insert into fee_settings(name, platform_fee_percent, operator_fee_percent, max_bet_amount, is_active)
        values ($1,$2,$3,$4,$5)
        returning *
        `,
        [
          dto.name,
          dto.platformFeePercent,
          dto.operatorFeePercent,
          dto.maxBetAmount,
          dto.isActive ?? false,
        ],
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

  async createMatch(adminId: string, dto: CreateMatchDto) {
    const homeCode = dto.homeTeamCode.trim().toUpperCase();
    const awayCode = dto.awayTeamCode.trim().toUpperCase();
    if (homeCode === awayCode) {
      throw new BusinessError('MATCH_TEAMS_DUPLICATED', 'Los equipos deben ser diferentes.');
    }

    const kickoffAt = this.ecuadorDateTimeToUtc(dto.kickoffDateEc, dto.kickoffTimeEc);
    const cutoffMinutes = dto.bettingCutoffMinutes ?? 60;
    const bettingClosesAt = new Date(kickoffAt.getTime() - cutoffMinutes * 60_000);
    const tournamentName = dto.tournamentName?.trim() || 'Partidos especiales';
    const venueName = dto.venueName.trim();
    const venueCity = dto.venueCity.trim();
    const venueCountry = dto.venueCountry.trim();
    const venueTimezone = dto.venueTimezone?.trim() || 'America/New_York';
    const phase = dto.phase?.trim() || 'special';
    const externalId = this.createMatchExternalId(homeCode, awayCode, dto.kickoffDateEc);
    const matchKind = dto.matchKind ?? 'normal';

    return this.db.transaction(async (client) => {
      const tournament = await client.query(
        `
        insert into tournaments(name, starts_at, ends_at, country, is_active)
        select $1, $2::date, $2::date, $3, false
        where not exists (select 1 from tournaments where name = $1)
        returning id
        `,
        [tournamentName, dto.kickoffDateEc, venueCountry],
      );
      const tournamentId =
        tournament.rows[0]?.id ??
        (
          await client.query(`select id from tournaments where name = $1 order by created_at desc limit 1`, [
            tournamentName,
          ])
        ).rows[0]?.id;

      const homeTeam = await client.query(
        `
        insert into teams(fifa_code, name, country)
        values ($1, $2, $2)
        on conflict (fifa_code) do update
        set name = excluded.name,
            country = excluded.country,
            updated_at = now()
        returning id
        `,
        [homeCode, dto.homeTeamName.trim()],
      );
      const awayTeam = await client.query(
        `
        insert into teams(fifa_code, name, country)
        values ($1, $2, $2)
        on conflict (fifa_code) do update
        set name = excluded.name,
            country = excluded.country,
            updated_at = now()
        returning id
        `,
        [awayCode, dto.awayTeamName.trim()],
      );
      const venue = await client.query(
        `
        insert into venues(name, city, country, timezone)
        select $1, $2, $3, $4
        where not exists (select 1 from venues where lower(name) = lower($1) and lower(city) = lower($2))
        returning id
        `,
        [venueName, venueCity, venueCountry, venueTimezone],
      );
      const venueId =
        venue.rows[0]?.id ??
        (
          await client.query(
            `select id from venues where lower(name) = lower($1) and lower(city) = lower($2) order by created_at desc limit 1`,
            [venueName, venueCity],
          )
        ).rows[0]?.id;

      const match = await client.query(
        `
        insert into matches(
          tournament_id,
          home_team_id,
          away_team_id,
          venue_id,
          kickoff_at,
          phase,
          group_name,
          status,
          betting_enabled,
          betting_cutoff_minutes,
          betting_closes_at,
          external_id,
          kickoff_local_date_ec,
          kickoff_local_time_ec,
          betting_closes_local_date_ec,
          betting_closes_local_time_ec
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, 'scheduled'::match_status, $8, $9, $10, $11,
          $12::date, $13::time, $14::date, $15::time
        )
        on conflict (external_id) do update
        set tournament_id = excluded.tournament_id,
            home_team_id = excluded.home_team_id,
            away_team_id = excluded.away_team_id,
            venue_id = excluded.venue_id,
            kickoff_at = excluded.kickoff_at,
            phase = excluded.phase,
            group_name = excluded.group_name,
            status = 'scheduled'::match_status,
            betting_enabled = excluded.betting_enabled,
            betting_cutoff_minutes = excluded.betting_cutoff_minutes,
            betting_closes_at = excluded.betting_closes_at,
            kickoff_local_date_ec = excluded.kickoff_local_date_ec,
            kickoff_local_time_ec = excluded.kickoff_local_time_ec,
            betting_closes_local_date_ec = excluded.betting_closes_local_date_ec,
            betting_closes_local_time_ec = excluded.betting_closes_local_time_ec,
            updated_at = now()
        returning *
        `,
        [
          tournamentId,
          homeTeam.rows[0].id,
          awayTeam.rows[0].id,
          venueId,
          kickoffAt,
          phase,
          dto.groupName?.trim() || null,
          dto.bettingEnabled ?? true,
          cutoffMinutes,
          bettingClosesAt,
          externalId,
          dto.kickoffDateEc,
          dto.kickoffTimeEc,
          this.toEcuadorDate(bettingClosesAt),
          this.toEcuadorTime(bettingClosesAt),
        ],
      );

      if (matchKind === 'final') {
        await this.ensureFinalWinnerMarket(
          client,
          match.rows[0].id,
          dto.homeTeamName.trim(),
          dto.awayTeamName.trim(),
          dto.homeWinOdds,
          dto.awayWinOdds,
          'Ganador del titulo',
          'campeon',
        );
      } else if (matchKind === 'elimination') {
        await this.ensureFinalWinnerMarket(
          client,
          match.rows[0].id,
          dto.homeTeamName.trim(),
          dto.awayTeamName.trim(),
          dto.homeWinOdds,
          dto.awayWinOdds,
          'Ganador del partido',
          'gana',
        );
      } else {
        if (dto.drawOdds === undefined || Number(dto.drawOdds) < 1) {
          throw new BusinessError('DRAW_ODDS_REQUIRED', 'La cuota de empate es requerida para partidos normales.');
        }
        await this.ensureMatchWinnerMarket(
          client,
          match.rows[0].id,
          dto.homeTeamName.trim(),
          dto.awayTeamName.trim(),
          dto.homeWinOdds,
          dto.drawOdds,
          dto.awayWinOdds,
        );
      }

      await this.ensureExactScoreMarket(
        client,
        match.rows[0].id,
        dto.homeTeamName.trim(),
        dto.awayTeamName.trim(),
      );

      await this.audit.log({
        actorUserId: adminId,
        actorRole: 'admin',
        action: 'match.created',
        entityType: 'matches',
        entityId: match.rows[0].id,
        afterData: {
          ...match.rows[0],
          odds: {
            matchKind,
            homeWin: dto.homeWinOdds,
            draw: matchKind === 'normal' ? dto.drawOdds : null,
            awayWin: dto.awayWinOdds,
          },
        },
      });

      return match.rows[0];
    });
  }

  async approveTransfer(adminId: string, receiptId: string) {
    const result = await this.db.transaction(async (client) => {
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

      return { approved: true, betId: receipt.bet_id, receiptId };
    });

    await this.sendTransferDecisionEmail(result.betId, result.receiptId, 'approved').catch((error) => {
      this.logger.error('No se pudo enviar correo de aprobacion de transferencia.', error);
    });
    return { approved: true };
  }

  async rejectTransfer(adminId: string, receiptId: string, reason: string) {
    const result = await this.db.transaction(async (client) => {
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

      return { rejected: true, betId: receipt.bet_id, receiptId };
    });

    await this.sendTransferDecisionEmail(result.betId, result.receiptId, 'rejected', reason).catch((error) => {
      this.logger.error('No se pudo enviar correo de rechazo de transferencia.', error);
    });
    return { rejected: true };
  }

  async registerResult(adminId: string, matchId: string, dto: MatchResultDto) {
    const result = await this.db.query(
      `
      insert into match_results(match_id, home_score, away_score, champion_selection_key, recorded_by)
      values ($1,$2,$3,$4,$5)
      on conflict (match_id) do update
      set home_score = excluded.home_score,
          away_score = excluded.away_score,
          champion_selection_key = excluded.champion_selection_key,
          recorded_by = excluded.recorded_by,
          recorded_at = now()
      returning *
      `,
      [matchId, dto.homeScore, dto.awayScore, dto.championSelectionKey ?? null, adminId],
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
            championSelectionKey: matchResult.champion_selection_key,
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
          matchResult.champion_selection_key,
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
          championSelectionKey: matchResult.champion_selection_key,
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
      select home_score, away_score, champion_selection_key, is_official, recorded_at
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
        exists(
          select 1
          from betting_markets bm
          where bm.match_id = $1 and bm.type = 'final_winner'
        ) as has_final_winner_market,
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
      hasFinalWinnerMarket: Boolean(summary.rows[0]?.has_final_winner_market),
      summary: summary.rows[0],
      bets: rows.rows,
    };
  }

  private evaluateSelection(
    marketType: string,
    selectionKey: string,
    homeScore: number,
    awayScore: number,
    championSelectionKey?: string | null,
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

    if (marketType === 'final_winner') {
      if (homeScore > awayScore) return selectionKey === 'home_win';
      if (awayScore > homeScore) return selectionKey === 'away_win';
      if (championSelectionKey === 'home_win' || championSelectionKey === 'away_win') {
        return selectionKey === championSelectionKey;
      }
      throw new BusinessError(
        'FINAL_WINNER_REQUIRED',
        'Debe indicar quien fue campeon para liquidar el mercado ganador del titulo.',
      );
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
      order by case bm.type
        when 'match_winner' then 1
        when 'final_winner' then 2
        when 'exact_score' then 3
        else 9
      end, bm.created_at
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

  private async sendTransferDecisionEmail(
    betId: string,
    receiptId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ) {
    const details = await this.getTransferEmailDetails(betId);
    if (!details) {
      return;
    }

    const notificationType =
      decision === 'approved' ? 'bank_transfer_approved' : 'bank_transfer_rejected';
    const subject =
      decision === 'approved'
        ? 'Transferencia aprobada'
        : 'Transferencia rechazada';
    const game = `${details.home_team_name ?? 'Equipo local'} vs ${details.away_team_name ?? 'Equipo visitante'}`;
    const officialScore =
      details.home_score === null || details.away_score === null
        ? 'Pendiente'
        : `${details.home_score} - ${details.away_score}`;
    const text = [
      `Hola ${details.full_name || details.username || details.email},`,
      '',
      decision === 'approved'
        ? 'Tu transferencia fue aprobada y tu apuesta quedo activa.'
        : 'Tu transferencia fue rechazada.',
      '',
      `Juego: ${game}`,
      `Pronostico elegido: ${details.selection_label ?? details.selection_key}`,
      `Mercado: ${details.market_name}`,
      `Monto apostado: $${Number(details.total_stake).toFixed(2)} ${details.currency}`,
      `Marcador oficial: ${officialScore}`,
      reason ? `Motivo: ${reason}` : null,
      '',
      'Gracias por usar Apuesta ASERBIESS Mundial 2026.',
    ]
      .filter(Boolean)
      .join('\n');

    if (!this.isValidEmail(details.email)) {
      await this.recordEmailFailure({
        recipientEmail: details.email,
        notificationType,
        relatedEntityType: 'bank_transfer_receipts',
        relatedEntityId: receiptId,
        subject,
        errorMessage: 'INVALID_EMAIL_FORMAT',
        payload: { betId, decision, reason, game },
      });
      return;
    }

    let result: { sent: boolean; reason?: string };
    try {
      result = await this.mail.send({
        to: details.email,
        subject,
        text,
      });
    } catch (error) {
      result = {
        sent: false,
        reason: error instanceof Error ? error.message : 'EMAIL_SEND_FAILED',
      };
    }

    if (!result.sent) {
      await this.recordEmailFailure({
        recipientEmail: details.email,
        notificationType,
        relatedEntityType: 'bank_transfer_receipts',
        relatedEntityId: receiptId,
        subject,
        errorMessage: result.reason ?? 'EMAIL_SEND_FAILED',
        payload: { betId, decision, reason, game },
      });
    }
  }

  private async getTransferEmailDetails(betId: string) {
    const result = await this.db.query<{
      email: string;
      username: string;
      full_name: string | null;
      total_stake: string;
      currency: string;
      selection_key: string;
      selection_label: string | null;
      market_name: string;
      home_team_name: string | null;
      away_team_name: string | null;
      home_score: number | null;
      away_score: number | null;
    }>(
      `
      select
        p.email,
        p.username,
        p.full_name,
        b.total_stake,
        b.currency,
        bs.selection_key,
        o.selection_label,
        bm.name as market_name,
        ht.name as home_team_name,
        at.name as away_team_name,
        mr.home_score,
        mr.away_score
      from bets b
      join profiles p on p.id = b.user_id
      join bet_selections bs on bs.bet_id = b.id
      join betting_markets bm on bm.id = bs.market_id
      left join odds o on o.id = bs.odds_id
      join matches m on m.id = bs.match_id
      left join teams ht on ht.id = m.home_team_id
      left join teams at on at.id = m.away_team_id
      left join match_results mr on mr.match_id = m.id
      where b.id = $1
      limit 1
      `,
      [betId],
    );
    return result.rows[0] ?? null;
  }

  private async recordEmailFailure(input: {
    recipientEmail: string;
    notificationType: string;
    relatedEntityType: string;
    relatedEntityId: string;
    subject: string;
    errorMessage: string;
    payload: Record<string, unknown>;
  }) {
    try {
      await this.db.query(
        `
        insert into email_delivery_failures(
          recipient_email,
          notification_type,
          related_entity_type,
          related_entity_id,
          subject,
          error_message,
          payload
        )
        values ($1,$2,$3,$4,$5,$6,$7)
        `,
        [
          input.recipientEmail,
          input.notificationType,
          input.relatedEntityType,
          input.relatedEntityId,
          input.subject,
          input.errorMessage,
          JSON.stringify(input.payload),
        ],
      );
    } catch (error) {
      this.logger.error('No se pudo registrar correo no enviado.', error);
    }
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private ecuadorDateTimeToUtc(date: string, time: string) {
    return new Date(`${date}T${time}:00-05:00`);
  }

  private async ensureExactScoreMarket(
    client: {
      query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
    },
    matchId: string,
    homeTeamName: string,
    awayTeamName: string,
  ) {
    const market = await client.query(
      `
      insert into betting_markets(match_id, type, name, status)
      values ($1, 'exact_score'::market_type, 'Marcador exacto', 'open'::market_status)
      on conflict (match_id, type, name, coalesce(line_value, -1)) do update
      set status = 'open',
          updated_at = now()
      returning id
      `,
      [matchId],
    );
    const scoreOptions: Array<[number, number]> = [];
    for (let home = 0; home <= 5; home += 1) {
      for (let away = 0; away <= 5; away += 1) {
        scoreOptions.push([home, away]);
      }
    }

    for (const [homeScore, awayScore] of scoreOptions) {
      await client.query(
        `
        insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
        values ($1, $2, $3, 1.00, 'active'::odds_status)
        on conflict (market_id, selection_key) do update
        set selection_label = excluded.selection_label,
            status = excluded.status,
            updated_at = now()
        `,
        [
          market.rows[0].id,
          `score_${homeScore}_${awayScore}`,
          `${homeTeamName} ${homeScore} - ${awayScore} ${awayTeamName}`,
        ],
      );
    }
  }

  private async ensureMatchWinnerMarket(
    client: {
      query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
    },
    matchId: string,
    homeTeamName: string,
    awayTeamName: string,
    homeWinOdds: number,
    drawOdds: number,
    awayWinOdds: number,
  ) {
    const market = await client.query(
      `
      insert into betting_markets(match_id, type, name, status)
      values ($1, 'match_winner'::market_type, 'Resultado simple', 'open'::market_status)
      on conflict (match_id, type, name, coalesce(line_value, -1)) do update
      set status = 'open',
          updated_at = now()
      returning id
      `,
      [matchId],
    );

    await client.query(
      `
      insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
      values
        ($1, 'home_win', $2, $3, 'active'::odds_status),
        ($1, 'draw', 'Empate', $4, 'active'::odds_status),
        ($1, 'away_win', $5, $6, 'active'::odds_status)
      on conflict (market_id, selection_key) do update
      set selection_label = excluded.selection_label,
          decimal_odds = excluded.decimal_odds,
          status = excluded.status,
          updated_at = now()
      `,
      [
        market.rows[0].id,
        `${homeTeamName} gana`,
        homeWinOdds,
        drawOdds,
        `${awayTeamName} gana`,
        awayWinOdds,
      ],
    );
  }

  private async ensureFinalWinnerMarket(
    client: {
      query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
    },
    matchId: string,
    homeTeamName: string,
    awayTeamName: string,
    homeWinOdds: number,
    awayWinOdds: number,
    marketName: string,
    labelSuffix: string,
  ) {
    const market = await client.query(
      `
      insert into betting_markets(match_id, type, name, status)
      values ($1, 'final_winner'::market_type, $2, 'open'::market_status)
      on conflict (match_id, type, name, coalesce(line_value, -1)) do update
      set status = 'open',
          updated_at = now()
      returning id
      `,
      [matchId, marketName],
    );

    await client.query(
      `
      insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
      values
        ($1, 'home_win', $2, $3, 'active'::odds_status),
        ($1, 'away_win', $4, $5, 'active'::odds_status)
      on conflict (market_id, selection_key) do update
      set selection_label = excluded.selection_label,
          decimal_odds = excluded.decimal_odds,
          status = excluded.status,
          updated_at = now()
      `,
      [
        market.rows[0].id,
        `${homeTeamName} ${labelSuffix}`,
        homeWinOdds,
        `${awayTeamName} ${labelSuffix}`,
        awayWinOdds,
      ],
    );
  }

  private toEcuadorDate(value: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }

  private toEcuadorTime(value: Date) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
  }

  private createMatchExternalId(homeCode: string, awayCode: string, date: string) {
    return `admin-${date.replace(/-/g, '')}-${homeCode.toLowerCase()}-${awayCode.toLowerCase()}`;
  }
}
