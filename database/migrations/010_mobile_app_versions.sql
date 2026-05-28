create table if not exists mobile_app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  version_id text not null,
  version_name text not null,
  version_code integer not null,
  is_current boolean not null default false,
  is_supported boolean not null default true,
  force_update_message text not null default 'Tu version de la app esta obsoleta. Descarga e instala la nueva version para continuar.',
  released_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, version_id)
);

create unique index if not exists idx_mobile_app_versions_one_current
  on mobile_app_versions(platform)
  where is_current = true;

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
  'android-0.1.1-2',
  '0.1.1',
  2,
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
