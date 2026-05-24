const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'database/imports/world-cup-2026-schedule.json');
const outputPath = path.join(root, 'database/migrations/004_worldcup_matches.sql');
const matches = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const teamCodeBySourceName = {
  Mexico: 'MEX',
  'South Africa': 'RSA',
  'South Korea': 'KOR',
  Czechia: 'CZE',
  Canada: 'CAN',
  'Bosnia & Herzegovina': 'BIH',
  'United States': 'USA',
  Paraguay: 'PAR',
  Qatar: 'QAT',
  Switzerland: 'SUI',
  Brazil: 'BRA',
  Morocco: 'MAR',
  Haiti: 'HAI',
  Scotland: 'SCO',
  Australia: 'AUS',
  'Türkiye': 'TUR',
  Germany: 'GER',
  'Curaçao': 'CUW',
  Netherlands: 'NED',
  Japan: 'JPN',
  'Ivory Coast': 'CIV',
  Ecuador: 'ECU',
  'Saudi Arabia': 'KSA',
  Uruguay: 'URU',
  Spain: 'ESP',
  'Cabo Verde': 'CPV',
  'Cape Verde': 'CPV',
  Iran: 'IRN',
  'New Zealand': 'NZL',
  Belgium: 'BEL',
  Egypt: 'EGY',
  France: 'FRA',
  Senegal: 'SEN',
  Iraq: 'IRQ',
  Norway: 'NOR',
  Argentina: 'ARG',
  Algeria: 'ALG',
  Austria: 'AUT',
  Jordan: 'JOR',
  Ghana: 'GHA',
  Panama: 'PAN',
  England: 'ENG',
  Croatia: 'CRO',
  Portugal: 'POR',
  'DR Congo': 'COD',
  Uzbekistan: 'UZB',
  Colombia: 'COL',
  Sweden: 'SWE',
  Tunisia: 'TUN',
};

const timezoneByCity = {
  'Mexico City': 'America/Mexico_City',
  Guadalajara: 'America/Mexico_City',
  Monterrey: 'America/Monterrey',
  Toronto: 'America/Toronto',
  Vancouver: 'America/Vancouver',
  Inglewood: 'America/Los_Angeles',
  'Santa Clara': 'America/Los_Angeles',
  'East Rutherford': 'America/New_York',
  Foxborough: 'America/New_York',
  Philadelphia: 'America/New_York',
  Houston: 'America/Chicago',
  Arlington: 'America/Chicago',
  'Miami Gardens': 'America/New_York',
  Atlanta: 'America/New_York',
  'Kansas City': 'America/Chicago',
  Seattle: 'America/Los_Angeles',
};

const fixtureCorrections = {
  8: {
    date_utc: '2026-06-14',
    kickoff_utc: '04:00',
    correction_note: 'FIFA ticketing/hospitality lists Australia vs Turkiye at BC Place Vancouver on 2026-06-13 21:00 local time.',
  },
};

function sql(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function phase(group) {
  const normalized = group.toLowerCase();
  if (normalized.startsWith('group')) return 'group_stage';
  if (normalized === 'round of 32') return 'round_of_32';
  if (normalized === 'round of 16') return 'round_of_16';
  if (normalized === 'quarter-finals') return 'quarter_final';
  if (normalized === 'semi-finals') return 'semi_final';
  if (normalized === 'third place') return 'third_place';
  if (normalized === 'final') return 'final';
  return normalized.replace(/\s+/g, '_');
}

const venues = new Map();
for (const match of matches) {
  venues.set(`${match.venue}|${match.city}`, {
    name: match.venue,
    city: match.city,
    country: match.host_country === 'USA' ? 'United States' : match.host_country,
    timezone: timezoneByCity[match.city] ?? 'UTC',
  });
}

const venueRows = [...venues.values()]
  .map((venue) => `  (${sql(venue.name)}, ${sql(venue.city)}, ${sql(venue.country)}, ${sql(venue.timezone)})`)
  .join(',\n');

const matchRows = matches
  .map((match) => {
    const corrected = { ...match, ...(fixtureCorrections[match.match] ?? {}) };
    const homeCode = teamCodeBySourceName[corrected.team_a] ?? null;
    const awayCode = teamCodeBySourceName[corrected.team_b] ?? null;
    const kickoffAt = `${corrected.date_utc} ${corrected.kickoff_utc}:00+00`;
    const groupName = corrected.group.startsWith('Group ') ? corrected.group.replace('Group ', '') : null;
    return `  (${corrected.match}, ${sql(homeCode)}, ${sql(awayCode)}, ${sql(corrected.venue)}, ${sql(corrected.city)}, ${sql(kickoffAt)}, ${sql(phase(corrected.group))}, ${sql(groupName)}, ${sql(`wc2026-match-${String(corrected.match).padStart(3, '0')}`)})`;
  })
  .join(',\n');

const output = `create unique index if not exists idx_venues_name_city on venues(name, city);

insert into venues(name, city, country, timezone)
values
${venueRows}
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
${matchRows}
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
`;

fs.writeFileSync(outputPath, output);
console.log(`Generated ${outputPath}`);
