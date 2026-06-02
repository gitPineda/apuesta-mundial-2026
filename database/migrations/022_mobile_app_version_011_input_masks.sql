update mobile_app_versions
set is_current = false,
    is_supported = false,
    updated_at = now()
where platform = 'android'
  and version_id <> 'android-0.1.11-12';

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
  'android-0.1.11-12',
  '0.1.11',
  12,
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
