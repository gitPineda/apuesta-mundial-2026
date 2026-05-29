import { HttpStatus, Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { BusinessError } from '../../common/errors/business-error';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { CreateBetDto, QuoteBetDto } from './dto/quote-bet.dto';

interface SelectionRow {
  odds_id: string;
  market_id: string;
  match_id: string;
  selection_key: string;
  selection_label: string;
  decimal_odds: string;
  odds_status: string;
  market_status: string;
  line_value: string | null;
  kickoff_at: Date;
  betting_closes_at: Date;
  betting_enabled: boolean;
  match_status: string;
}

interface FeeSettingsRow {
  platform_fee_percent: string;
  operator_fee_percent: string;
  max_bet_amount: string;
}

@Injectable()
export class BettingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async quote(userId: string, dto: QuoteBetDto) {
    const selections = await this.loadAndValidateSelections(dto.selections.map((s) => s.oddsId));
    await this.validateNoExistingBetForMatches(
      userId,
      selections.map((selection) => selection.match_id),
    );
    const fees = await this.getActiveFees();
    this.validateStakeAmount(dto.stake, fees);
    return this.calculateQuote(dto.stake, selections, fees);
  }

  async createBet(userId: string, dto: CreateBetDto) {
    await this.validateUserCanBet(userId);

    return this.db.transaction(async (client) => {
      if (dto.idempotencyKey) {
        const existing = await client.query(
          `select * from bets where user_id = $1 and idempotency_key = $2 limit 1`,
          [userId, dto.idempotencyKey],
        );
        if (existing.rows[0]) {
          return existing.rows[0];
        }
      }

      const selections = await this.loadAndValidateSelections(
        dto.selections.map((s) => s.oddsId),
        client,
      );
      await this.validateNoExistingBetForMatches(
        userId,
        selections.map((selection) => selection.match_id),
        client,
      );
      const fees = await this.getActiveFees(client);
      this.validateStakeAmount(dto.stake, fees);
      await this.validateLimits(userId, dto.stake, client);
      const quote = this.calculateQuote(dto.stake, selections, fees);

      const betResult = await client.query(
        `
        insert into bets(
          user_id,
          total_stake,
          gross_payout,
          platform_fee_percent,
          operator_fee_percent,
          platform_fee_amount,
          operator_fee_amount,
          net_payout,
          source,
          idempotency_key
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,'demo',$9)
        returning *
        `,
        [
          userId,
          dto.stake,
          quote.grossPayout,
          quote.platformFeePercent,
          quote.operatorFeePercent,
          quote.platformFeeAmount,
          quote.operatorFeeAmount,
          quote.netPayout,
          dto.idempotencyKey ?? null,
        ],
      );
      const bet = betResult.rows[0];

      for (const selection of selections) {
        await client.query(
          `
          insert into bet_selections(
            bet_id,
            match_id,
            market_id,
            odds_id,
            selection_key,
            frozen_odds,
            line_value
          )
          values ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            bet.id,
            selection.match_id,
            selection.market_id,
            selection.odds_id,
            selection.selection_key,
            selection.decimal_odds,
            selection.line_value,
          ],
        );
      }

      await this.audit.log({
        actorUserId: userId,
        action: 'bet.created',
        entityType: 'bets',
        entityId: bet.id,
        afterData: bet,
      });

      return bet;
    });
  }

  private async validateNoExistingBetForMatches(
    userId: string,
    matchIds: string[],
    client?: PoolClient,
  ) {
    const uniqueMatchIds = [...new Set(matchIds)];
    const query = client ? client.query.bind(client) : this.db.query.bind(this.db);
    const result = await query(
      `
      select bs.match_id, bm.name as market_name, b.status
      from bets b
      join bet_selections bs on bs.bet_id = b.id
      join betting_markets bm on bm.id = bs.market_id
      where b.user_id = $1
        and bs.match_id = any($2::uuid[])
        and b.status not in ('void', 'refunded')
      limit 1
      `,
      [userId, uniqueMatchIds],
    );

    if (result.rows[0]) {
      throw new BusinessError(
        'BET_ALREADY_EXISTS_FOR_MATCH',
        'Usted ya aposto a este juego. No existe reverso ni se permite crear otra apuesta para el mismo partido.',
      );
    }
  }

  async findUserBets(userId: string) {
    const result = await this.db.query(
      `
      select b.*,
        coalesce(json_agg(bs.*) filter (where bs.id is not null), '[]') as selections
      from bets b
      left join bet_selections bs on bs.bet_id = b.id
      where b.user_id = $1
      group by b.id
      order by b.created_at desc
      `,
      [userId],
    );
    return result.rows;
  }

  async findUserBet(userId: string, betId: string) {
    const result = await this.db.query(
      `
      select b.*,
        coalesce(json_agg(bs.*) filter (where bs.id is not null), '[]') as selections
      from bets b
      left join bet_selections bs on bs.bet_id = b.id
      where b.user_id = $1 and b.id = $2
      group by b.id
      `,
      [userId, betId],
    );
    return result.rows[0] ?? null;
  }

  private async validateUserCanBet(userId: string) {
    const result = await this.db.query(
      `
      select
        p.status,
        p.is_adult_verified,
        p.kyc_status,
        exists(select 1 from terms_acceptance ta where ta.user_id = p.id) as terms_accepted
      from profiles p
      where p.id = $1
      `,
      [userId],
    );
    const profile = result.rows[0];
    if (!profile) {
      throw new BusinessError('PROFILE_REQUIRED', 'Debe completar su perfil.', HttpStatus.FORBIDDEN);
    }
    if (profile.status !== 'active') {
      throw new BusinessError('USER_NOT_ACTIVE', 'La cuenta no esta activa.', HttpStatus.FORBIDDEN);
    }
    if (!profile.is_adult_verified) {
      throw new BusinessError('AGE_NOT_VERIFIED', 'Debe verificar que es mayor de edad.', HttpStatus.FORBIDDEN);
    }
    if (!profile.terms_accepted) {
      throw new BusinessError('TERMS_NOT_ACCEPTED', 'Debe aceptar terminos y condiciones.', HttpStatus.FORBIDDEN);
    }
  }

  private async validateLimits(userId: string, stake: number, client: PoolClient) {
    const result = await client.query(
      `
      select daily_limit, weekly_limit, monthly_limit
      from responsible_gaming_limits
      where user_id = $1
      `,
      [userId],
    );
    const limits = result.rows[0];
    if (!limits) {
      return;
    }

    const spentResult = await client.query(
      `
      select
        coalesce(sum(total_stake) filter (where created_at >= now() - interval '1 day'), 0) as daily_spent,
        coalesce(sum(total_stake) filter (where created_at >= now() - interval '7 days'), 0) as weekly_spent,
        coalesce(sum(total_stake) filter (where created_at >= now() - interval '30 days'), 0) as monthly_spent
      from bets
      where user_id = $1 and status not in ('void', 'refunded')
      `,
      [userId],
    );
    const spent = spentResult.rows[0];
    const checks = [
      ['daily', Number(limits.daily_limit), Number(spent.daily_spent)],
      ['weekly', Number(limits.weekly_limit), Number(spent.weekly_spent)],
      ['monthly', Number(limits.monthly_limit), Number(spent.monthly_spent)],
    ] as const;

    for (const [, limit, used] of checks) {
      if (limit > 0 && used + stake > limit) {
        throw new BusinessError('BETTING_LIMIT_EXCEEDED', 'La apuesta supera sus limites de juego responsable.');
      }
    }
  }

  private async loadAndValidateSelections(oddsIds: string[], client?: PoolClient) {
    if (oddsIds.length === 0) {
      throw new BusinessError('SELECTION_REQUIRED', 'Debe seleccionar al menos un pronostico.');
    }
    if (oddsIds.length > 1) {
      throw new BusinessError('PARLAY_NOT_AVAILABLE', 'La apuesta combinada se habilitara en una fase posterior.');
    }

    const query = client ? client.query.bind(client) : this.db.query.bind(this.db);
    const result = await query<SelectionRow>(
      `
      select
        o.id as odds_id,
        bm.id as market_id,
        m.id as match_id,
        o.selection_key,
        o.selection_label,
        o.decimal_odds,
        o.status as odds_status,
        bm.status as market_status,
        bm.line_value,
        m.kickoff_at,
        m.betting_closes_at,
        m.betting_enabled,
        m.status as match_status
      from odds o
      join betting_markets bm on bm.id = o.market_id
      join matches m on m.id = bm.match_id
      where o.id = any($1::uuid[])
      for update
      `,
      [oddsIds],
    );

    if (result.rows.length !== oddsIds.length) {
      throw new BusinessError('ODDS_NOT_FOUND', 'La cuota seleccionada no existe.');
    }

    for (const selection of result.rows) {
      if (!selection.betting_enabled || selection.match_status !== 'scheduled') {
        throw new BusinessError('BETTING_CLOSED', 'Ya no se aceptan apuestas para este partido.');
      }
      if (selection.market_status !== 'open' || selection.odds_status !== 'active') {
        throw new BusinessError('MARKET_CLOSED', 'El mercado seleccionado no esta disponible.');
      }
      if (Date.now() >= new Date(selection.betting_closes_at).getTime()) {
        throw new BusinessError(
          'BETTING_CLOSED',
          'Ya no se aceptan apuestas para este partido. El cierre fue 1 hora antes del inicio.',
        );
      }
    }

    return result.rows;
  }

  private async getActiveFees(client?: PoolClient): Promise<FeeSettingsRow> {
    const query = client ? client.query.bind(client) : this.db.query.bind(this.db);
    const result = await query<FeeSettingsRow>(
      `
      select platform_fee_percent, operator_fee_percent, max_bet_amount
      from fee_settings
      where is_active = true
      limit 1
      `,
    );
    if (!result.rows[0]) {
      throw new BusinessError('FEE_SETTINGS_REQUIRED', 'No hay configuracion activa de comisiones.');
    }
    return result.rows[0];
  }

  private validateStakeAmount(stake: number, fees: FeeSettingsRow) {
    const maxBetAmount = Number(fees.max_bet_amount);
    if (stake < 1) {
      throw new BusinessError('BET_STAKE_TOO_LOW', 'El monto minimo de apuesta es $1.00.');
    }
    if (stake > maxBetAmount) {
      throw new BusinessError(
        'BET_STAKE_TOO_HIGH',
        `El monto maximo de apuesta es $${maxBetAmount.toFixed(2)}.`,
      );
    }
  }

  private calculateQuote(stake: number, selections: SelectionRow[], fees: FeeSettingsRow) {
    const multiplier = selections.reduce(
      (current, selection) => current * Number(selection.decimal_odds),
      1,
    );
    const grossPayout = this.roundMoney(stake * multiplier);
    const platformFeePercent = Number(fees.platform_fee_percent);
    const operatorFeePercent = Number(fees.operator_fee_percent);
    const platformFeeAmount = this.roundMoney((grossPayout * platformFeePercent) / 100);
    const operatorFeeAmount = this.roundMoney((grossPayout * operatorFeePercent) / 100);
    const netPayout = this.roundMoney(grossPayout - platformFeeAmount - operatorFeeAmount);

    return {
      stake,
      multiplier,
      grossPayout,
      platformFeePercent,
      operatorFeePercent,
      platformFeeAmount,
      operatorFeeAmount,
      netPayout,
      selections: selections.map((selection) => ({
        oddsId: selection.odds_id,
        matchId: selection.match_id,
        marketId: selection.market_id,
        selectionKey: selection.selection_key,
        selectionLabel: selection.selection_label,
        frozenOdds: Number(selection.decimal_odds),
      })),
    };
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
