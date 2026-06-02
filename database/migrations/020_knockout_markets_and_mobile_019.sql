update mobile_app_versions
set is_current = false,
    is_supported = false,
    updated_at = now()
where platform = 'android'
  and version_id <> 'android-0.1.9-10';

insert into mobile_app_versions(
  platform,
  version_id,
  version_name,
  version_code,
  is_current,
  is_supported,
  force_update_message
)
values (
  'android',
  'android-0.1.9-10',
  '0.1.9',
  10,
  true,
  true,
  'Tu version de la app esta obsoleta. Descarga e instala la nueva version para continuar.'
)
on conflict (platform, version_id) do update
set version_name = excluded.version_name,
    version_code = excluded.version_code,
    is_current = excluded.is_current,
    is_supported = excluded.is_supported,
    force_update_message = excluded.force_update_message,
    updated_at = now();

with knockout_matches as (
  select
    m.id,
    m.phase,
    ht.name as home_team_name,
    at.name as away_team_name
  from matches m
  join teams ht on ht.id = m.home_team_id
  join teams at on at.id = m.away_team_id
  where m.external_id like 'wc2026-match-%'
    and m.phase in ('round_of_32', 'round_of_16', 'quarter-final', 'semi-final', 'third_place', 'final')
),
winner_markets as (
  insert into betting_markets(match_id, type, name, status)
  select
    id,
    'final_winner'::market_type,
    case when phase = 'final' then 'Ganador del titulo' else 'Ganador del partido' end,
    'open'::market_status
  from knockout_matches
  on conflict (match_id, type, name, coalesce(line_value, -1)) do update
  set status = 'open',
      updated_at = now()
  returning id, match_id, name
),
winner_odds as (
  insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
  select
    wm.id,
    'home_win',
    km.home_team_name || case when wm.name = 'Ganador del titulo' then ' campeon' else ' gana' end,
    1.00,
    'active'::odds_status
  from winner_markets wm
  join knockout_matches km on km.id = wm.match_id
  union all
  select
    wm.id,
    'away_win',
    km.away_team_name || case when wm.name = 'Ganador del titulo' then ' campeon' else ' gana' end,
    1.00,
    'active'::odds_status
  from winner_markets wm
  join knockout_matches km on km.id = wm.match_id
  on conflict (market_id, selection_key) do update
  set selection_label = excluded.selection_label,
      decimal_odds = excluded.decimal_odds,
      status = excluded.status,
      updated_at = now()
  returning id
),
exact_markets as (
  insert into betting_markets(match_id, type, name, status)
  select id, 'exact_score'::market_type, 'Marcador exacto', 'open'::market_status
  from knockout_matches
  on conflict (match_id, type, name, coalesce(line_value, -1)) do update
  set status = 'open',
      updated_at = now()
  returning id, match_id
),
score_options as (
  select home_score, away_score
  from generate_series(0, 5) home_score
  cross join generate_series(0, 5) away_score
)
insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
select
  em.id,
  'score_' || so.home_score || '_' || so.away_score,
  km.home_team_name || ' ' || so.home_score || ' - ' || so.away_score || ' ' || km.away_team_name,
  1.00,
  'active'::odds_status
from exact_markets em
join knockout_matches km on km.id = em.match_id
cross join score_options so
on conflict (market_id, selection_key) do update
set selection_label = excluded.selection_label,
    status = excluded.status,
    updated_at = now();
