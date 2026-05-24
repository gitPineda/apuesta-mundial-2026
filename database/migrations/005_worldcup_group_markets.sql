insert into betting_markets(match_id, type, name, status)
select
  m.id,
  'match_winner'::market_type,
  'Resultado simple',
  'open'::market_status
from matches m
where m.external_id like 'wc2026-match-%'
  and m.phase = 'group_stage'
  and m.home_team_id is not null
  and m.away_team_id is not null
on conflict (match_id, type, name, coalesce(line_value, -1)) do update
set status = 'open',
    updated_at = now();

insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
select
  bm.id,
  'home_win',
  ht.name || ' gana',
  1.00,
  'active'::odds_status
from betting_markets bm
join matches m on m.id = bm.match_id
join teams ht on ht.id = m.home_team_id
where m.external_id like 'wc2026-match-%'
  and m.phase = 'group_stage'
  and bm.type = 'match_winner'
  and bm.name = 'Resultado simple'
union all
select
  bm.id,
  'draw',
  'Empate',
  1.00,
  'active'::odds_status
from betting_markets bm
join matches m on m.id = bm.match_id
where m.external_id like 'wc2026-match-%'
  and m.phase = 'group_stage'
  and bm.type = 'match_winner'
  and bm.name = 'Resultado simple'
union all
select
  bm.id,
  'away_win',
  at.name || ' gana',
  1.00,
  'active'::odds_status
from betting_markets bm
join matches m on m.id = bm.match_id
join teams at on at.id = m.away_team_id
where m.external_id like 'wc2026-match-%'
  and m.phase = 'group_stage'
  and bm.type = 'match_winner'
  and bm.name = 'Resultado simple'
on conflict (market_id, selection_key) do update
set selection_label = excluded.selection_label,
    decimal_odds = excluded.decimal_odds,
    status = excluded.status,
    updated_at = now();
