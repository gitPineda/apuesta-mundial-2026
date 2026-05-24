with matches_with_teams as (
  select m.id as match_id, ht.name as home_name, at.name as away_name
  from matches m
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  where m.external_id like 'wc2026-match-%'
    and m.phase = 'group_stage'
    and m.home_team_id is not null
    and m.away_team_id is not null
),
score_options(home_score, away_score, odds_value) as (
  values
    (0, 0, 1.00),
    (0, 1, 1.00),
    (0, 2, 1.00),
    (0, 3, 1.00),
    (0, 4, 1.00),
    (0, 5, 1.00),
    (1, 0, 1.00),
    (1, 1, 1.00),
    (1, 2, 1.00),
    (1, 3, 1.00),
    (1, 4, 1.00),
    (1, 5, 1.00),
    (2, 0, 1.00),
    (2, 1, 1.00),
    (2, 2, 1.00),
    (2, 3, 1.00),
    (2, 4, 1.00),
    (2, 5, 1.00),
    (3, 0, 1.00),
    (3, 1, 1.00),
    (3, 2, 1.00),
    (3, 3, 1.00),
    (3, 4, 1.00),
    (3, 5, 1.00),
    (4, 0, 1.00),
    (4, 1, 1.00),
    (4, 2, 1.00),
    (4, 3, 1.00),
    (4, 4, 1.00),
    (4, 5, 1.00),
    (5, 0, 1.00),
    (5, 1, 1.00),
    (5, 2, 1.00),
    (5, 3, 1.00),
    (5, 4, 1.00),
    (5, 5, 1.00)
)
insert into betting_markets(match_id, type, name, status)
select
  match_id,
  'exact_score'::market_type,
  'Marcador exacto',
  'open'::market_status
from matches_with_teams
on conflict (match_id, type, name, coalesce(line_value, -1)) do update
set status = 'open',
    updated_at = now();

with markets as (
  select bm.id as market_id, m.id as match_id, ht.name as home_name, at.name as away_name
  from betting_markets bm
  join matches m on m.id = bm.match_id
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  where m.external_id like 'wc2026-match-%'
    and m.phase = 'group_stage'
    and bm.type = 'exact_score'
    and bm.name = 'Marcador exacto'
),
score_options(home_score, away_score, odds_value) as (
  values
    (0, 0, 1.00),
    (0, 1, 1.00),
    (0, 2, 1.00),
    (0, 3, 1.00),
    (0, 4, 1.00),
    (0, 5, 1.00),
    (1, 0, 1.00),
    (1, 1, 1.00),
    (1, 2, 1.00),
    (1, 3, 1.00),
    (1, 4, 1.00),
    (1, 5, 1.00),
    (2, 0, 1.00),
    (2, 1, 1.00),
    (2, 2, 1.00),
    (2, 3, 1.00),
    (2, 4, 1.00),
    (2, 5, 1.00),
    (3, 0, 1.00),
    (3, 1, 1.00),
    (3, 2, 1.00),
    (3, 3, 1.00),
    (3, 4, 1.00),
    (3, 5, 1.00),
    (4, 0, 1.00),
    (4, 1, 1.00),
    (4, 2, 1.00),
    (4, 3, 1.00),
    (4, 4, 1.00),
    (4, 5, 1.00),
    (5, 0, 1.00),
    (5, 1, 1.00),
    (5, 2, 1.00),
    (5, 3, 1.00),
    (5, 4, 1.00),
    (5, 5, 1.00)
)
insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
select
  markets.market_id,
  'score_' || score_options.home_score || '_' || score_options.away_score,
  markets.home_name || ' ' || score_options.home_score || ' - ' || score_options.away_score || ' ' || markets.away_name,
  score_options.odds_value,
  'active'::odds_status
from markets
cross join score_options
on conflict (market_id, selection_key) do update
set selection_label = excluded.selection_label,
    decimal_odds = excluded.decimal_odds,
    status = excluded.status,
    updated_at = now();
