import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class MatchesService {
  constructor(private readonly db: DatabaseService) {}

  async getCurrentTournament() {
    const result = await this.db.query(
      `select * from tournaments where is_active = true order by starts_at desc limit 1`,
    );
    return result.rows[0] ?? null;
  }

  async findAll(date?: string, timezone = 'America/Guayaquil', userId?: string | null) {
    const params: unknown[] = [];
    const where: string[] = [];

    if (date) {
      params.push(date);
      where.push(`m.kickoff_local_date_ec = $${params.length}::date`);
    }

    const result = await this.db.query(
      `
      select
        m.*,
        ht.name as home_team_name,
        ht.fifa_code as home_team_code,
        at.name as away_team_name,
        at.fifa_code as away_team_code,
        v.name as venue_name,
        v.city as venue_city,
        v.country as venue_country,
        mr.home_score,
        mr.away_score,
        mr.is_official as result_is_official,
        mr.recorded_at as result_recorded_at,
        (now() < m.betting_closes_at and m.betting_enabled and m.status = 'scheduled') as accepts_bets,
        (m.status = 'finished' or m.kickoff_at < now()) as is_past_or_finished,
        to_char(m.kickoff_local_date_ec, 'YYYY-MM-DD') as kickoff_local_date,
        to_char(m.kickoff_local_time_ec, 'HH24:MI') as kickoff_local_time,
        to_char(m.betting_closes_local_date_ec, 'YYYY-MM-DD') as betting_closes_local_date,
        to_char(m.betting_closes_local_time_ec, 'HH24:MI') as betting_closes_local_time,
        'America/Guayaquil' as display_timezone,
        case
          when bool_or(b.status = 'won') then 'won'
          when bool_or(b.status = 'lost') then 'lost'
          else null
        end as user_bet_result
      from matches m
      left join teams ht on ht.id = m.home_team_id
      left join teams at on at.id = m.away_team_id
      left join venues v on v.id = m.venue_id
      left join match_results mr on mr.match_id = m.id
      left join betting_markets ubm on ubm.match_id = m.id
      left join bet_selections ubs on ubs.market_id = ubm.id
      left join bets b on b.id = ubs.bet_id
        and b.user_id = $${params.length + 1}
        and b.status in ('won', 'lost')
      ${where.length ? `where ${where.join(' and ')}` : ''}
      group by m.id, ht.name, ht.fifa_code, at.name, at.fifa_code, v.name, v.city, v.country, mr.home_score, mr.away_score, mr.is_official, mr.recorded_at
      order by m.kickoff_at asc
      `,
      [...params, userId ?? null],
    );
    return result.rows;
  }

  async findByDate(date: string, timezone?: string, userId?: string | null) {
    return this.findAll(date, timezone, userId);
  }

  async findOne(id: string, userId?: string | null) {
    const result = await this.db.query(
      `
      select
        m.*,
        ht.name as home_team_name,
        ht.fifa_code as home_team_code,
        at.name as away_team_name,
        at.fifa_code as away_team_code,
        v.name as venue_name,
        v.city as venue_city,
        v.country as venue_country,
        mr.home_score,
        mr.away_score,
        mr.is_official as result_is_official,
        mr.recorded_at as result_recorded_at,
        (now() < m.betting_closes_at and m.betting_enabled and m.status = 'scheduled') as accepts_bets,
        (m.status = 'finished' or m.kickoff_at < now()) as is_past_or_finished,
        to_char(m.kickoff_local_date_ec, 'YYYY-MM-DD') as kickoff_local_date,
        to_char(m.kickoff_local_time_ec, 'HH24:MI') as kickoff_local_time,
        to_char(m.betting_closes_local_date_ec, 'YYYY-MM-DD') as betting_closes_local_date,
        to_char(m.betting_closes_local_time_ec, 'HH24:MI') as betting_closes_local_time,
        'America/Guayaquil' as display_timezone,
        case
          when bool_or(b.status = 'won') then 'won'
          when bool_or(b.status = 'lost') then 'lost'
          else null
        end as user_bet_result
      from matches m
      left join teams ht on ht.id = m.home_team_id
      left join teams at on at.id = m.away_team_id
      left join venues v on v.id = m.venue_id
      left join match_results mr on mr.match_id = m.id
      left join betting_markets ubm on ubm.match_id = m.id
      left join bet_selections ubs on ubs.market_id = ubm.id
      left join bets b on b.id = ubs.bet_id
        and b.user_id = $2
        and b.status in ('won', 'lost')
      where m.id = $1
      group by m.id, ht.name, ht.fifa_code, at.name, at.fifa_code, v.name, v.city, v.country, mr.home_score, mr.away_score, mr.is_official, mr.recorded_at
      `,
      [id, userId ?? null],
    );
    return result.rows[0] ?? null;
  }

  async getMarkets(matchId: string) {
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
            order by case o.selection_key
              when 'home_win' then 1
              when 'draw' then 2
              when 'away_win' then 3
              else 9
            end
          ) filter (where o.id is not null),
          '[]'
        ) as odds
      from betting_markets bm
      left join odds o on o.market_id = bm.id and o.status = 'active'
      where bm.match_id = $1
      group by bm.id
      order by case bm.type
        when 'match_winner' then 1
        when 'final_winner' then 2
        when 'exact_score' then 3
        else 9
      end, bm.created_at asc
      `,
      [matchId],
    );
    return result.rows;
  }
}
