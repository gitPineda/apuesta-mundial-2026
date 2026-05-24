insert into tournaments(name, starts_at, ends_at, country, is_active)
values ('Mundial FIFA 2026', '2026-06-11', '2026-07-19', 'Canada, Mexico, United States', true)
on conflict do nothing;

insert into teams(fifa_code, name, country)
values
  ('ECU', 'Ecuador', 'Ecuador'),
  ('BRA', 'Brasil', 'Brasil'),
  ('ARG', 'Argentina', 'Argentina'),
  ('MEX', 'Mexico', 'Mexico')
on conflict (fifa_code) do nothing;

insert into venues(name, city, country, timezone)
values
  ('Estadio Azteca', 'Ciudad de Mexico', 'Mexico', 'America/Mexico_City'),
  ('MetLife Stadium', 'New Jersey', 'United States', 'America/New_York')
on conflict do nothing;

insert into bank_accounts(bank_name, account_holder, account_number, account_type, document_number, instructions, is_active)
values (
  'Banco Demo',
  'Apuesta Mundial Demo',
  '0000000000',
  'corriente',
  '0000000000000',
  'Cuenta demo para validar el flujo de transferencia manual en MVP.',
  true
)
on conflict do nothing;

with t as (
  select id from tournaments where name = 'Mundial FIFA 2026' limit 1
),
ecu as (select id from teams where fifa_code = 'ECU'),
bra as (select id from teams where fifa_code = 'BRA'),
arg as (select id from teams where fifa_code = 'ARG'),
mex as (select id from teams where fifa_code = 'MEX'),
azteca as (select id from venues where name = 'Estadio Azteca' limit 1),
metlife as (select id from venues where name = 'MetLife Stadium' limit 1)
insert into matches(
  tournament_id,
  home_team_id,
  away_team_id,
  venue_id,
  kickoff_at,
  phase,
  group_name,
  betting_cutoff_minutes,
  betting_closes_at,
  external_id
)
values
  ((select id from t), (select id from ecu), (select id from bra), (select id from azteca), '2026-06-11 18:00:00+00', 'group_stage', 'A', 60, '2026-06-11 17:00:00+00', 'demo-ecu-bra-20260611'),
  ((select id from t), (select id from arg), (select id from mex), (select id from metlife), '2026-06-11 20:00:00+00', 'group_stage', 'A', 60, '2026-06-11 19:00:00+00', 'demo-arg-mex-20260611')
on conflict (external_id) do nothing;

with target_matches as (
  select m.id, ht.name as home_name, at.name as away_name
  from matches m
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  where m.external_id in ('demo-ecu-bra-20260611', 'demo-arg-mex-20260611')
),
created_markets as (
  insert into betting_markets(match_id, type, name)
  select id, 'match_winner', 'Resultado simple'
  from target_matches
  on conflict do nothing
  returning id, match_id
)
insert into odds(market_id, selection_key, selection_label, decimal_odds)
select cm.id, 'home_win', tm.home_name || ' gana', 2.00
from created_markets cm
join target_matches tm on tm.id = cm.match_id
union all
select cm.id, 'draw', 'Empate', 3.10
from created_markets cm
union all
select cm.id, 'away_win', tm.away_name || ' gana', 2.00
from created_markets cm
join target_matches tm on tm.id = cm.match_id;
