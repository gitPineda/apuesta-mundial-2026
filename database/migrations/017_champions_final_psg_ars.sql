with tournament as (
  insert into tournaments(name, starts_at, ends_at, country, is_active)
  values ('UEFA Champions League - Final', '2026-05-30', '2026-05-30', 'Hungria', false)
  on conflict do nothing
  returning id
),
selected_tournament as (
  select id from tournament
  union all
  select id from tournaments where name = 'UEFA Champions League - Final'
  limit 1
),
home_team as (
  insert into teams(fifa_code, name, country)
  values ('PSG', 'Paris Saint-Germain', 'Francia')
  on conflict (fifa_code) do update
  set name = excluded.name,
      country = excluded.country,
      updated_at = now()
  returning id
),
away_team as (
  insert into teams(fifa_code, name, country)
  values ('ARS', 'Arsenal', 'Inglaterra')
  on conflict (fifa_code) do update
  set name = excluded.name,
      country = excluded.country,
      updated_at = now()
  returning id
),
venue as (
  insert into venues(name, city, country, timezone)
  select 'Puskas Arena de Budapest', 'Budapest', 'Hungria', 'Europe/Budapest'
  where not exists (
    select 1
    from venues
    where lower(name) = lower('Puskas Arena de Budapest')
      and lower(city) = lower('Budapest')
  )
  returning id
),
selected_venue as (
  select id from venue
  union all
  select id
  from venues
  where lower(name) = lower('Puskas Arena de Budapest')
    and lower(city) = lower('Budapest')
  limit 1
),
upserted_match as (
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
  select
    st.id,
    ht.id,
    at.id,
    sv.id,
    '2026-05-30 11:00:00-05'::timestamptz,
    'Final Champions UEFA',
    null,
    'scheduled'::match_status,
    true,
    60,
    '2026-05-30 10:00:00-05'::timestamptz,
    'uefa-champions-final-2026-psg-ars-20260530',
    '2026-05-30'::date,
    '11:00'::time,
    '2026-05-30'::date,
    '10:00'::time
  from selected_tournament st
  cross join home_team ht
  cross join away_team at
  cross join selected_venue sv
  on conflict (external_id) do update
  set tournament_id = excluded.tournament_id,
      home_team_id = excluded.home_team_id,
      away_team_id = excluded.away_team_id,
      venue_id = excluded.venue_id,
      kickoff_at = excluded.kickoff_at,
      phase = excluded.phase,
      status = 'scheduled'::match_status,
      betting_enabled = excluded.betting_enabled,
      betting_cutoff_minutes = excluded.betting_cutoff_minutes,
      betting_closes_at = excluded.betting_closes_at,
      kickoff_local_date_ec = excluded.kickoff_local_date_ec,
      kickoff_local_time_ec = excluded.kickoff_local_time_ec,
      betting_closes_local_date_ec = excluded.betting_closes_local_date_ec,
      betting_closes_local_time_ec = excluded.betting_closes_local_time_ec,
      updated_at = now()
  returning id
),
target_match as (
  select id from upserted_match
  union all
  select id from matches where external_id = 'uefa-champions-final-2026-psg-ars-20260530'
  limit 1
),
final_market as (
  insert into betting_markets(match_id, type, name, status)
  select id, 'final_winner'::market_type, 'Ganador del titulo', 'open'::market_status
  from target_match
  on conflict (match_id, type, name, coalesce(line_value, -1)) do update
  set status = 'open',
      updated_at = now()
  returning id
),
exact_market as (
  insert into betting_markets(match_id, type, name, status)
  select id, 'exact_score'::market_type, 'Marcador exacto', 'open'::market_status
  from target_match
  on conflict (match_id, type, name, coalesce(line_value, -1)) do update
  set status = 'open',
      updated_at = now()
  returning id
),
score_options as (
  select home_score, away_score
  from generate_series(0, 5) home_score
  cross join generate_series(0, 5) away_score
)
insert into odds(market_id, selection_key, selection_label, decimal_odds, status)
select id, 'home_win', 'Paris Saint-Germain campeon', 3.00, 'active'::odds_status
from final_market
union all
select id, 'away_win', 'Arsenal campeon', 4.00, 'active'::odds_status
from final_market
union all
select
  em.id,
  'score_' || so.home_score || '_' || so.away_score,
  'Paris Saint-Germain ' || so.home_score || ' - ' || so.away_score || ' Arsenal',
  1.00,
  'active'::odds_status
from exact_market em
cross join score_options so
on conflict (market_id, selection_key) do update
set selection_label = excluded.selection_label,
    decimal_odds = excluded.decimal_odds,
    status = excluded.status,
    updated_at = now();
