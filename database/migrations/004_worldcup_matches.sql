create unique index if not exists idx_venues_name_city on venues(name, city);

insert into venues(name, city, country, timezone)
values
  ('Estadio Azteca', 'Mexico City', 'Mexico', 'America/Mexico_City'),
  ('Estadio Akron', 'Guadalajara', 'Mexico', 'America/Mexico_City'),
  ('BMO Field', 'Toronto', 'Canada', 'America/Toronto'),
  ('SoFi Stadium', 'Inglewood', 'United States', 'America/Los_Angeles'),
  ('Levi''s Stadium', 'Santa Clara', 'United States', 'America/Los_Angeles'),
  ('MetLife Stadium', 'East Rutherford', 'United States', 'America/New_York'),
  ('Gillette Stadium', 'Foxborough', 'United States', 'America/New_York'),
  ('BC Place', 'Vancouver', 'Canada', 'America/Vancouver'),
  ('NRG Stadium', 'Houston', 'United States', 'America/Chicago'),
  ('AT&T Stadium', 'Arlington', 'United States', 'America/Chicago'),
  ('Lincoln Financial Field', 'Philadelphia', 'United States', 'America/New_York'),
  ('Estadio BBVA', 'Monterrey', 'Mexico', 'America/Monterrey'),
  ('Mercedes-Benz Stadium', 'Atlanta', 'United States', 'America/New_York'),
  ('Lumen Field', 'Seattle', 'United States', 'America/Los_Angeles'),
  ('Hard Rock Stadium', 'Miami Gardens', 'United States', 'America/New_York'),
  ('Arrowhead Stadium', 'Kansas City', 'United States', 'America/Chicago')
on conflict (name, city) do update
set country = excluded.country,
    timezone = excluded.timezone;

delete from odds o
using betting_markets bm, matches m
where o.market_id = bm.id
  and bm.match_id = m.id
  and m.external_id like 'demo-%'
  and not exists (select 1 from bet_selections bs where bs.odds_id = o.id);

delete from betting_markets bm
using matches m
where bm.match_id = m.id
  and m.external_id like 'demo-%'
  and not exists (select 1 from bet_selections bs where bs.market_id = bm.id);

delete from matches m
where m.external_id like 'demo-%'
  and not exists (select 1 from bet_selections bs where bs.match_id = m.id);

with tournament as (
  select id
  from tournaments
  where name = 'Mundial FIFA 2026'
  order by created_at desc
  limit 1
),
source_matches(match_number, home_code, away_code, venue_name, venue_city, kickoff_at, phase, group_name, external_id) as (
  values
  (1, 'MEX', 'RSA', 'Estadio Azteca', 'Mexico City', '2026-06-11 19:00:00+00', 'group_stage', 'A', 'wc2026-match-001'),
  (2, 'KOR', 'CZE', 'Estadio Akron', 'Guadalajara', '2026-06-12 02:00:00+00', 'group_stage', 'A', 'wc2026-match-002'),
  (3, 'CAN', 'BIH', 'BMO Field', 'Toronto', '2026-06-12 19:00:00+00', 'group_stage', 'B', 'wc2026-match-003'),
  (4, 'USA', 'PAR', 'SoFi Stadium', 'Inglewood', '2026-06-13 01:00:00+00', 'group_stage', 'D', 'wc2026-match-004'),
  (5, 'QAT', 'SUI', 'Levi''s Stadium', 'Santa Clara', '2026-06-13 19:00:00+00', 'group_stage', 'B', 'wc2026-match-005'),
  (6, 'BRA', 'MAR', 'MetLife Stadium', 'East Rutherford', '2026-06-13 22:00:00+00', 'group_stage', 'C', 'wc2026-match-006'),
  (7, 'HAI', 'SCO', 'Gillette Stadium', 'Foxborough', '2026-06-14 01:00:00+00', 'group_stage', 'C', 'wc2026-match-007'),
  (8, 'AUS', 'TUR', 'BC Place', 'Vancouver', '2026-06-14 04:00:00+00', 'group_stage', 'D', 'wc2026-match-008'),
  (9, 'GER', 'CUW', 'NRG Stadium', 'Houston', '2026-06-14 17:00:00+00', 'group_stage', 'E', 'wc2026-match-009'),
  (10, 'NED', 'JPN', 'AT&T Stadium', 'Arlington', '2026-06-14 20:00:00+00', 'group_stage', 'F', 'wc2026-match-010'),
  (11, 'CIV', 'ECU', 'Lincoln Financial Field', 'Philadelphia', '2026-06-14 23:00:00+00', 'group_stage', 'E', 'wc2026-match-011'),
  (12, 'SWE', 'TUN', 'Estadio BBVA', 'Monterrey', '2026-06-15 02:00:00+00', 'group_stage', 'F', 'wc2026-match-012'),
  (13, 'ESP', 'CPV', 'Mercedes-Benz Stadium', 'Atlanta', '2026-06-15 16:00:00+00', 'group_stage', 'H', 'wc2026-match-013'),
  (14, 'BEL', 'EGY', 'Lumen Field', 'Seattle', '2026-06-15 19:00:00+00', 'group_stage', 'G', 'wc2026-match-014'),
  (15, 'KSA', 'URU', 'Hard Rock Stadium', 'Miami Gardens', '2026-06-15 22:00:00+00', 'group_stage', 'H', 'wc2026-match-015'),
  (16, 'IRN', 'NZL', 'SoFi Stadium', 'Inglewood', '2026-06-16 01:00:00+00', 'group_stage', 'G', 'wc2026-match-016'),
  (17, 'FRA', 'SEN', 'MetLife Stadium', 'East Rutherford', '2026-06-16 19:00:00+00', 'group_stage', 'I', 'wc2026-match-017'),
  (18, 'IRQ', 'NOR', 'Gillette Stadium', 'Foxborough', '2026-06-16 22:00:00+00', 'group_stage', 'I', 'wc2026-match-018'),
  (19, 'ARG', 'ALG', 'Arrowhead Stadium', 'Kansas City', '2026-06-17 01:00:00+00', 'group_stage', 'J', 'wc2026-match-019'),
  (20, 'AUT', 'JOR', 'Levi''s Stadium', 'Santa Clara', '2026-06-17 04:00:00+00', 'group_stage', 'J', 'wc2026-match-020'),
  (21, 'POR', 'COD', 'NRG Stadium', 'Houston', '2026-06-17 17:00:00+00', 'group_stage', 'K', 'wc2026-match-021'),
  (22, 'ENG', 'CRO', 'AT&T Stadium', 'Arlington', '2026-06-17 20:00:00+00', 'group_stage', 'L', 'wc2026-match-022'),
  (23, 'GHA', 'PAN', 'BMO Field', 'Toronto', '2026-06-17 23:00:00+00', 'group_stage', 'L', 'wc2026-match-023'),
  (24, 'UZB', 'COL', 'Estadio Azteca', 'Mexico City', '2026-06-18 02:00:00+00', 'group_stage', 'K', 'wc2026-match-024'),
  (25, 'CZE', 'RSA', 'Mercedes-Benz Stadium', 'Atlanta', '2026-06-18 16:00:00+00', 'group_stage', 'A', 'wc2026-match-025'),
  (26, 'SUI', 'BIH', 'SoFi Stadium', 'Inglewood', '2026-06-18 19:00:00+00', 'group_stage', 'B', 'wc2026-match-026'),
  (27, 'CAN', 'QAT', 'BC Place', 'Vancouver', '2026-06-18 22:00:00+00', 'group_stage', 'B', 'wc2026-match-027'),
  (28, 'MEX', 'KOR', 'Estadio Akron', 'Guadalajara', '2026-06-19 01:00:00+00', 'group_stage', 'A', 'wc2026-match-028'),
  (29, 'USA', 'AUS', 'Lumen Field', 'Seattle', '2026-06-19 19:00:00+00', 'group_stage', 'D', 'wc2026-match-029'),
  (30, 'SCO', 'MAR', 'Gillette Stadium', 'Foxborough', '2026-06-19 22:00:00+00', 'group_stage', 'C', 'wc2026-match-030'),
  (31, 'BRA', 'HAI', 'Lincoln Financial Field', 'Philadelphia', '2026-06-20 00:30:00+00', 'group_stage', 'C', 'wc2026-match-031'),
  (32, 'TUR', 'PAR', 'Levi''s Stadium', 'Santa Clara', '2026-06-20 03:00:00+00', 'group_stage', 'D', 'wc2026-match-032'),
  (33, 'NED', 'SWE', 'NRG Stadium', 'Houston', '2026-06-20 17:00:00+00', 'group_stage', 'F', 'wc2026-match-033'),
  (34, 'GER', 'CIV', 'BMO Field', 'Toronto', '2026-06-20 20:00:00+00', 'group_stage', 'E', 'wc2026-match-034'),
  (35, 'ECU', 'CUW', 'Arrowhead Stadium', 'Kansas City', '2026-06-21 00:00:00+00', 'group_stage', 'E', 'wc2026-match-035'),
  (36, 'TUN', 'JPN', 'Estadio BBVA', 'Monterrey', '2026-06-21 04:00:00+00', 'group_stage', 'F', 'wc2026-match-036'),
  (37, 'ESP', 'KSA', 'Mercedes-Benz Stadium', 'Atlanta', '2026-06-21 16:00:00+00', 'group_stage', 'H', 'wc2026-match-037'),
  (38, 'BEL', 'IRN', 'SoFi Stadium', 'Inglewood', '2026-06-21 19:00:00+00', 'group_stage', 'G', 'wc2026-match-038'),
  (39, 'URU', 'CPV', 'Hard Rock Stadium', 'Miami Gardens', '2026-06-21 22:00:00+00', 'group_stage', 'H', 'wc2026-match-039'),
  (40, 'NZL', 'EGY', 'BC Place', 'Vancouver', '2026-06-22 01:00:00+00', 'group_stage', 'G', 'wc2026-match-040'),
  (41, 'ARG', 'AUT', 'AT&T Stadium', 'Arlington', '2026-06-22 17:00:00+00', 'group_stage', 'J', 'wc2026-match-041'),
  (42, 'FRA', 'IRQ', 'Lincoln Financial Field', 'Philadelphia', '2026-06-22 21:00:00+00', 'group_stage', 'I', 'wc2026-match-042'),
  (43, 'NOR', 'SEN', 'MetLife Stadium', 'East Rutherford', '2026-06-23 00:00:00+00', 'group_stage', 'I', 'wc2026-match-043'),
  (44, 'JOR', 'ALG', 'Levi''s Stadium', 'Santa Clara', '2026-06-23 03:00:00+00', 'group_stage', 'J', 'wc2026-match-044'),
  (45, 'POR', 'UZB', 'NRG Stadium', 'Houston', '2026-06-23 17:00:00+00', 'group_stage', 'K', 'wc2026-match-045'),
  (46, 'ENG', 'GHA', 'Gillette Stadium', 'Foxborough', '2026-06-23 20:00:00+00', 'group_stage', 'L', 'wc2026-match-046'),
  (47, 'PAN', 'CRO', 'BMO Field', 'Toronto', '2026-06-23 23:00:00+00', 'group_stage', 'L', 'wc2026-match-047'),
  (48, 'COL', 'COD', 'Estadio Akron', 'Guadalajara', '2026-06-24 02:00:00+00', 'group_stage', 'K', 'wc2026-match-048'),
  (49, 'SUI', 'CAN', 'BC Place', 'Vancouver', '2026-06-24 19:00:00+00', 'group_stage', 'B', 'wc2026-match-049'),
  (50, 'BIH', 'QAT', 'Lumen Field', 'Seattle', '2026-06-24 19:00:00+00', 'group_stage', 'B', 'wc2026-match-050'),
  (51, 'SCO', 'BRA', 'Hard Rock Stadium', 'Miami Gardens', '2026-06-24 22:00:00+00', 'group_stage', 'C', 'wc2026-match-051'),
  (52, 'MAR', 'HAI', 'Mercedes-Benz Stadium', 'Atlanta', '2026-06-24 22:00:00+00', 'group_stage', 'C', 'wc2026-match-052'),
  (53, 'CZE', 'MEX', 'Estadio Azteca', 'Mexico City', '2026-06-25 01:00:00+00', 'group_stage', 'A', 'wc2026-match-053'),
  (54, 'RSA', 'KOR', 'Estadio BBVA', 'Monterrey', '2026-06-25 01:00:00+00', 'group_stage', 'A', 'wc2026-match-054'),
  (55, 'CUW', 'CIV', 'Lincoln Financial Field', 'Philadelphia', '2026-06-25 20:00:00+00', 'group_stage', 'E', 'wc2026-match-055'),
  (56, 'ECU', 'GER', 'MetLife Stadium', 'East Rutherford', '2026-06-25 20:00:00+00', 'group_stage', 'E', 'wc2026-match-056'),
  (57, 'JPN', 'SWE', 'AT&T Stadium', 'Arlington', '2026-06-25 23:00:00+00', 'group_stage', 'F', 'wc2026-match-057'),
  (58, 'TUN', 'NED', 'Arrowhead Stadium', 'Kansas City', '2026-06-25 23:00:00+00', 'group_stage', 'F', 'wc2026-match-058'),
  (59, 'TUR', 'USA', 'SoFi Stadium', 'Inglewood', '2026-06-26 02:00:00+00', 'group_stage', 'D', 'wc2026-match-059'),
  (60, 'PAR', 'AUS', 'Levi''s Stadium', 'Santa Clara', '2026-06-26 02:00:00+00', 'group_stage', 'D', 'wc2026-match-060'),
  (61, 'NOR', 'FRA', 'Gillette Stadium', 'Foxborough', '2026-06-26 19:00:00+00', 'group_stage', 'I', 'wc2026-match-061'),
  (62, 'SEN', 'IRQ', 'BMO Field', 'Toronto', '2026-06-26 19:00:00+00', 'group_stage', 'I', 'wc2026-match-062'),
  (63, 'CPV', 'KSA', 'NRG Stadium', 'Houston', '2026-06-27 00:00:00+00', 'group_stage', 'H', 'wc2026-match-063'),
  (64, 'URU', 'ESP', 'Estadio Akron', 'Guadalajara', '2026-06-27 00:00:00+00', 'group_stage', 'H', 'wc2026-match-064'),
  (65, 'EGY', 'IRN', 'Lumen Field', 'Seattle', '2026-06-27 03:00:00+00', 'group_stage', 'G', 'wc2026-match-065'),
  (66, 'NZL', 'BEL', 'BC Place', 'Vancouver', '2026-06-27 03:00:00+00', 'group_stage', 'G', 'wc2026-match-066'),
  (67, 'PAN', 'ENG', 'MetLife Stadium', 'East Rutherford', '2026-06-27 21:00:00+00', 'group_stage', 'L', 'wc2026-match-067'),
  (68, 'CRO', 'GHA', 'Lincoln Financial Field', 'Philadelphia', '2026-06-27 21:00:00+00', 'group_stage', 'L', 'wc2026-match-068'),
  (69, 'COL', 'POR', 'Hard Rock Stadium', 'Miami Gardens', '2026-06-27 23:30:00+00', 'group_stage', 'K', 'wc2026-match-069'),
  (70, 'COD', 'UZB', 'Mercedes-Benz Stadium', 'Atlanta', '2026-06-27 23:30:00+00', 'group_stage', 'K', 'wc2026-match-070'),
  (71, 'ALG', 'AUT', 'Arrowhead Stadium', 'Kansas City', '2026-06-28 02:00:00+00', 'group_stage', 'J', 'wc2026-match-071'),
  (72, 'JOR', 'ARG', 'AT&T Stadium', 'Arlington', '2026-06-28 02:00:00+00', 'group_stage', 'J', 'wc2026-match-072'),
  (73, null, null, 'SoFi Stadium', 'Inglewood', '2026-06-28 19:00:00+00', 'round_of_32', null, 'wc2026-match-073'),
  (74, null, null, 'NRG Stadium', 'Houston', '2026-06-29 17:00:00+00', 'round_of_32', null, 'wc2026-match-074'),
  (75, null, null, 'Gillette Stadium', 'Foxborough', '2026-06-29 20:30:00+00', 'round_of_32', null, 'wc2026-match-075'),
  (76, null, null, 'Estadio BBVA', 'Monterrey', '2026-06-30 01:00:00+00', 'round_of_32', null, 'wc2026-match-076'),
  (77, null, null, 'AT&T Stadium', 'Arlington', '2026-06-30 17:00:00+00', 'round_of_32', null, 'wc2026-match-077'),
  (78, null, null, 'MetLife Stadium', 'East Rutherford', '2026-06-30 21:00:00+00', 'round_of_32', null, 'wc2026-match-078'),
  (79, null, null, 'Estadio Azteca', 'Mexico City', '2026-07-01 01:00:00+00', 'round_of_32', null, 'wc2026-match-079'),
  (80, null, null, 'Mercedes-Benz Stadium', 'Atlanta', '2026-07-01 16:00:00+00', 'round_of_32', null, 'wc2026-match-080'),
  (81, null, null, 'Lumen Field', 'Seattle', '2026-07-01 20:00:00+00', 'round_of_32', null, 'wc2026-match-081'),
  (82, null, null, 'Levi''s Stadium', 'Santa Clara', '2026-07-02 00:00:00+00', 'round_of_32', null, 'wc2026-match-082'),
  (83, null, null, 'SoFi Stadium', 'Inglewood', '2026-07-02 19:00:00+00', 'round_of_32', null, 'wc2026-match-083'),
  (84, null, null, 'BMO Field', 'Toronto', '2026-07-02 23:00:00+00', 'round_of_32', null, 'wc2026-match-084'),
  (85, null, null, 'BC Place', 'Vancouver', '2026-07-03 03:00:00+00', 'round_of_32', null, 'wc2026-match-085'),
  (86, null, null, 'AT&T Stadium', 'Arlington', '2026-07-03 18:00:00+00', 'round_of_32', null, 'wc2026-match-086'),
  (87, null, null, 'Hard Rock Stadium', 'Miami Gardens', '2026-07-03 22:00:00+00', 'round_of_32', null, 'wc2026-match-087'),
  (88, null, null, 'Arrowhead Stadium', 'Kansas City', '2026-07-04 01:30:00+00', 'round_of_32', null, 'wc2026-match-088'),
  (89, null, null, 'NRG Stadium', 'Houston', '2026-07-04 17:00:00+00', 'round_of_16', null, 'wc2026-match-089'),
  (90, null, null, 'Lincoln Financial Field', 'Philadelphia', '2026-07-04 21:00:00+00', 'round_of_16', null, 'wc2026-match-090'),
  (91, null, null, 'MetLife Stadium', 'East Rutherford', '2026-07-05 20:00:00+00', 'round_of_16', null, 'wc2026-match-091'),
  (92, null, null, 'Estadio Azteca', 'Mexico City', '2026-07-06 00:00:00+00', 'round_of_16', null, 'wc2026-match-092'),
  (93, null, null, 'AT&T Stadium', 'Arlington', '2026-07-06 19:00:00+00', 'round_of_16', null, 'wc2026-match-093'),
  (94, null, null, 'Lumen Field', 'Seattle', '2026-07-07 00:00:00+00', 'round_of_16', null, 'wc2026-match-094'),
  (95, null, null, 'Mercedes-Benz Stadium', 'Atlanta', '2026-07-07 16:00:00+00', 'round_of_16', null, 'wc2026-match-095'),
  (96, null, null, 'BC Place', 'Vancouver', '2026-07-07 20:00:00+00', 'round_of_16', null, 'wc2026-match-096'),
  (97, null, null, 'Gillette Stadium', 'Foxborough', '2026-07-09 20:00:00+00', 'quarter-final', null, 'wc2026-match-097'),
  (98, null, null, 'SoFi Stadium', 'Inglewood', '2026-07-10 19:00:00+00', 'quarter-final', null, 'wc2026-match-098'),
  (99, null, null, 'Hard Rock Stadium', 'Miami Gardens', '2026-07-11 21:00:00+00', 'quarter-final', null, 'wc2026-match-099'),
  (100, null, null, 'Arrowhead Stadium', 'Kansas City', '2026-07-12 01:00:00+00', 'quarter-final', null, 'wc2026-match-100'),
  (101, null, null, 'AT&T Stadium', 'Arlington', '2026-07-14 19:00:00+00', 'semi-final', null, 'wc2026-match-101'),
  (102, null, null, 'Mercedes-Benz Stadium', 'Atlanta', '2026-07-15 19:00:00+00', 'semi-final', null, 'wc2026-match-102'),
  (103, null, null, 'Hard Rock Stadium', 'Miami Gardens', '2026-07-18 21:00:00+00', 'third_place', null, 'wc2026-match-103'),
  (104, null, null, 'MetLife Stadium', 'East Rutherford', '2026-07-19 19:00:00+00', 'final', null, 'wc2026-match-104')
)
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
  kickoff_local_date_ec,
  kickoff_local_time_ec,
  betting_closes_local_date_ec,
  betting_closes_local_time_ec,
  external_id
)
select
  (select id from tournament),
  ht.id,
  at.id,
  v.id,
  sm.kickoff_at::timestamptz,
  sm.phase,
  sm.group_name,
  'scheduled',
  true,
  60,
  sm.kickoff_at::timestamptz - interval '60 minutes',
  (sm.kickoff_at::timestamptz at time zone 'America/Guayaquil')::date,
  (sm.kickoff_at::timestamptz at time zone 'America/Guayaquil')::time,
  ((sm.kickoff_at::timestamptz - interval '60 minutes') at time zone 'America/Guayaquil')::date,
  ((sm.kickoff_at::timestamptz - interval '60 minutes') at time zone 'America/Guayaquil')::time,
  sm.external_id
from source_matches sm
left join teams ht on ht.fifa_code = sm.home_code
left join teams at on at.fifa_code = sm.away_code
join venues v on v.name = sm.venue_name and v.city = sm.venue_city
on conflict (external_id) do update
set home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id,
    venue_id = excluded.venue_id,
    kickoff_at = excluded.kickoff_at,
    phase = excluded.phase,
    group_name = excluded.group_name,
    betting_cutoff_minutes = excluded.betting_cutoff_minutes,
    betting_closes_at = excluded.betting_closes_at,
    kickoff_local_date_ec = excluded.kickoff_local_date_ec,
    kickoff_local_time_ec = excluded.kickoff_local_time_ec,
    betting_closes_local_date_ec = excluded.betting_closes_local_date_ec,
    betting_closes_local_time_ec = excluded.betting_closes_local_time_ec,
    updated_at = now();
