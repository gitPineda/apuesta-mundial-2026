with score_odds(home_score, away_score, odds_value) as (
  values
    (0, 0, 2.00),
    (0, 1, 2.00),
    (0, 2, 2.00),
    (0, 3, 2.00),
    (0, 4, 2.00),
    (0, 5, 2.00),
    (1, 0, 2.00),
    (1, 1, 2.00),
    (1, 2, 2.00),
    (1, 3, 2.00),
    (1, 4, 2.00),
    (1, 5, 2.00),
    (2, 0, 2.00),
    (2, 1, 2.00),
    (2, 2, 3.00),
    (2, 3, 3.00),
    (2, 4, 3.00),
    (2, 5, 3.00),
    (3, 0, 3.00),
    (3, 1, 3.00),
    (3, 2, 3.00),
    (3, 3, 3.00),
    (3, 4, 3.00),
    (3, 5, 3.00),
    (4, 0, 3.00),
    (4, 1, 3.00),
    (4, 2, 3.00),
    (4, 3, 3.00),
    (4, 4, 4.00),
    (4, 5, 4.00),
    (5, 0, 4.00),
    (5, 1, 4.00),
    (5, 2, 4.00),
    (5, 3, 4.00),
    (5, 4, 4.00),
    (5, 5, 4.00)
),
target_odds as (
  select
    o.id,
    so.odds_value
  from matches m
  join betting_markets bm on bm.match_id = m.id
    and bm.type = 'exact_score'
  join odds o on o.market_id = bm.id
  join score_odds so on o.selection_key = 'score_' || so.home_score || '_' || so.away_score
  where (m.kickoff_at at time zone 'America/Guayaquil')::date
    between date '2026-06-11' and date '2026-06-27'
)
update odds o
set decimal_odds = target_odds.odds_value,
    updated_at = now()
from target_odds
where o.id = target_odds.id;
