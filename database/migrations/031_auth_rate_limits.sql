create table if not exists auth_rate_limits (
  type text not null,
  key text not null,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (type, key)
);

create index if not exists idx_auth_rate_limits_blocked_until
  on auth_rate_limits(blocked_until)
  where blocked_until is not null;
