alter table profiles
  add column if not exists password_hash text,
  add column if not exists email_confirmed boolean not null default false,
  add column if not exists email_confirmation_code text,
  add column if not exists email_confirmation_sent_at timestamptz,
  add column if not exists password_reset_code text,
  add column if not exists password_reset_expires_at timestamptz,
  add column if not exists password_reset_attempts integer not null default 0;

create unique index if not exists idx_profiles_email_lower on profiles(lower(email));

