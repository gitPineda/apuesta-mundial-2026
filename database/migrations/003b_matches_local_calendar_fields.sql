alter table matches
  add column if not exists kickoff_local_date_ec date,
  add column if not exists kickoff_local_time_ec time,
  add column if not exists betting_closes_local_date_ec date,
  add column if not exists betting_closes_local_time_ec time;

create index if not exists idx_matches_kickoff_local_date_ec
  on matches(kickoff_local_date_ec);

update matches
set kickoff_local_date_ec = (kickoff_at at time zone 'America/Guayaquil')::date,
    kickoff_local_time_ec = (kickoff_at at time zone 'America/Guayaquil')::time,
    betting_closes_local_date_ec = (betting_closes_at at time zone 'America/Guayaquil')::date,
    betting_closes_local_time_ec = (betting_closes_at at time zone 'America/Guayaquil')::time
where kickoff_at is not null;
