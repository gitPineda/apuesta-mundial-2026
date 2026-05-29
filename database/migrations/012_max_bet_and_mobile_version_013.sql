alter table fee_settings
  add column if not exists max_bet_amount numeric(12,2) not null default 100.00;

alter table fee_settings
  drop constraint if exists fee_settings_max_bet_amount_min;

alter table fee_settings
  add constraint fee_settings_max_bet_amount_min check (max_bet_amount >= 1);

update fee_settings
set max_bet_amount = 100.00
where max_bet_amount is null
   or max_bet_amount < 1;

update mobile_app_versions
set is_current = false,
    is_supported = false,
    updated_at = now()
where platform = 'android'
  and version_id <> 'android-0.1.3-4';

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
  'android-0.1.3-4',
  '0.1.3',
  4,
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
