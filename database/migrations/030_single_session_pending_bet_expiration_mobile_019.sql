alter table profiles
  add column if not exists active_session_id uuid,
  add column if not exists active_session_started_at timestamptz,
  add column if not exists active_session_expires_at timestamptz;

create index if not exists idx_profiles_active_session_id
  on profiles(active_session_id)
  where active_session_id is not null;

update profiles
set active_session_id = null,
    active_session_started_at = null,
    active_session_expires_at = null
where active_session_id is not null
   or active_session_started_at is not null
   or active_session_expires_at is not null;

update bets b
set status = 'void',
    payment_status = 'failed',
    settled_at = now()
where b.status = 'pending_payment'
  and (
    b.created_at::date < current_date
    or exists (
      select 1
      from bet_selections bs
      join matches m on m.id = bs.match_id
      where bs.bet_id = b.id
        and m.betting_closes_at <= now()
    )
  );

update bet_selections bs
set status = 'void'
where exists (
  select 1
  from bets b
  where b.id = bs.bet_id
    and b.status = 'void'
    and b.payment_status = 'failed'
);

update mobile_app_versions
set is_current = false,
    is_supported = false,
    updated_at = now()
where platform = 'android'
  and version_id <> 'android-0.1.19-20';

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
  'android-0.1.19-20',
  '0.1.19',
  20,
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
