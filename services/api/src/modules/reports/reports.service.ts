import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async summary() {
    const result = await this.db.query(`
      select
        coalesce(sum(total_stake) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_staked,
        coalesce(sum(net_payout) filter (where status = 'won'), 0) as total_user_winnings,
        coalesce(sum(total_stake) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) - coalesce(sum(net_payout) filter (where status = 'won'), 0) as gross_utility,
        count(*) filter (
          where status in ('pending_payment', 'payment_review')
            and payment_status in ('created', 'pending')
        ) as pending_bets,
        count(distinct user_id) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ) as active_users
      from bets
    `);
    return result.rows[0];
  }

  async generalSummary() {
    const result = await this.db.query(`
      select
        coalesce(sum(total_stake) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_staked,
        coalesce(sum(net_payout) filter (where status = 'won'), 0) as total_user_winnings,
        coalesce(sum(platform_fee_amount) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_platform_fee,
        coalesce(sum(operator_fee_amount) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_operator_fee,
        coalesce(sum(platform_fee_amount + operator_fee_amount) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_retained_commission,
        coalesce(sum(total_stake) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ), 0) - coalesce(sum(net_payout) filter (where status = 'won'), 0) as gross_utility,
        count(*) filter (
          where status in ('pending_payment', 'payment_review')
            and payment_status in ('created', 'pending')
        ) as pending_bets,
        count(distinct user_id) filter (
          where payment_status = 'confirmed'
            and status in ('paid', 'active', 'won', 'lost')
        ) as active_users
      from bets
    `);
    return result.rows[0];
  }

  async matchSummary(matchId: string) {
    const result = await this.db.query(
      `
      select
        coalesce(sum(b.total_stake) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_staked,
        coalesce(sum(b.net_payout) filter (where b.status = 'won'), 0) as total_user_winnings,
        coalesce(sum(b.platform_fee_amount) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_platform_fee,
        coalesce(sum(b.operator_fee_amount) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_operator_fee,
        coalesce(sum(b.platform_fee_amount + b.operator_fee_amount) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ), 0) as total_retained_commission,
        coalesce(sum(b.total_stake) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ), 0) - coalesce(sum(b.net_payout) filter (where b.status = 'won'), 0) as gross_utility,
        count(distinct b.id) filter (
          where b.status in ('pending_payment', 'payment_review')
            and b.payment_status in ('created', 'pending')
        ) as pending_bets,
        count(distinct b.user_id) filter (
          where b.payment_status = 'confirmed'
            and b.status in ('paid', 'active', 'won', 'lost')
        ) as active_users
      from bets b
      join bet_selections bs on bs.bet_id = b.id
      where bs.match_id = $1
      `,
      [matchId],
    );
    return result.rows[0];
  }

  async bettorsByMatch(matchId: string) {
    const result = await this.db.query(
      `
      select
        p.id as user_id,
        p.email,
        p.full_name,
        b.id as bet_id,
        b.total_stake,
        b.gross_payout,
        b.net_payout,
        b.status as bet_status,
        b.payment_status,
        b.source,
        b.created_at as bet_created_at,
        bm.name as market_name,
        bm.type as market_type,
        bs.selection_key,
        bs.frozen_odds,
        bs.status as selection_status,
        o.selection_label,
        pay.id as payment_id,
        pay.provider as payment_provider,
        pay.status as payment_state,
        btr.transfer_number,
        btr.sender_bank,
        btr.sender_name,
        btr.admin_status as transfer_review_status,
        btr.created_at as transfer_created_at
      from bets b
      join profiles p on p.id = b.user_id
      join bet_selections bs on bs.bet_id = b.id
      join betting_markets bm on bm.id = bs.market_id
      left join odds o on o.id = bs.odds_id
      left join lateral (
        select pay.*
        from payments pay
        where pay.bet_id = b.id
        order by
          case pay.status
            when 'confirmed' then 1
            when 'pending' then 2
            when 'rejected' then 3
            when 'created' then 4
            else 9
          end,
          pay.created_at desc
        limit 1
      ) pay on true
      left join bank_transfer_receipts btr on btr.payment_id = pay.id
      where bs.match_id = $1
      order by b.created_at desc
      `,
      [matchId],
    );
    return result.rows;
  }
}
