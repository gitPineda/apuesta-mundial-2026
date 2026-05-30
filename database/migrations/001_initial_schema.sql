create extension if not exists "pgcrypto";

do $$ begin
  create type user_status as enum ('active', 'blocked', 'self_excluded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kyc_status as enum ('not_started', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('scheduled', 'live', 'finished', 'postponed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type market_type as enum ('match_winner', 'final_winner', 'exact_score', 'total_goals', 'both_teams_score', 'parlay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type market_status as enum ('open', 'suspended', 'closed', 'settled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type odds_status as enum ('active', 'suspended', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bet_status as enum ('pending_payment', 'payment_review', 'paid', 'active', 'won', 'lost', 'void', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bet_selection_status as enum ('pending', 'won', 'lost', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_provider as enum ('demo', 'bank_transfer', 'payphone');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('created', 'pending', 'confirmed', 'rejected', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type receipt_status as enum ('pending_review', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists profiles (
  id uuid primary key,
  username text unique not null,
  email text unique not null,
  full_name text,
  birth_date date,
  country text default 'EC',
  phone text,
  is_adult_verified boolean not null default false,
  kyc_status kyc_status not null default 'not_started',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists user_roles (
  user_id uuid not null references profiles(id),
  role_id uuid not null references roles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  user_agent text,
  unique (user_id, terms_version)
);

create table if not exists responsible_gaming_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  daily_limit numeric(12,2) not null default 0,
  weekly_limit numeric(12,2) not null default 0,
  monthly_limit numeric(12,2) not null default 0,
  self_excluded_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  document_type text,
  document_number text,
  status kyc_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at date not null,
  ends_at date not null,
  country text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  fifa_code text unique not null,
  name text not null,
  country text,
  flag_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  country text not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id),
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  venue_id uuid references venues(id),
  kickoff_at timestamptz not null,
  phase text not null,
  group_name text,
  status match_status not null default 'scheduled',
  betting_enabled boolean not null default true,
  betting_cutoff_minutes integer not null default 60,
  betting_closes_at timestamptz not null,
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint betting_cutoff_positive check (betting_cutoff_minutes >= 0)
);

create index if not exists idx_matches_kickoff_at on matches(kickoff_at);
create index if not exists idx_matches_betting_closes_at on matches(betting_closes_at);

create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  home_score integer not null,
  away_score integer not null,
  champion_selection_key text,
  source text not null default 'admin',
  is_official boolean not null default true,
  recorded_by uuid references profiles(id),
  recorded_at timestamptz not null default now(),
  unique (match_id)
);

create table if not exists betting_markets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id),
  type market_type not null,
  name text not null,
  line_value numeric(8,2),
  status market_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_betting_markets_match_id on betting_markets(match_id);
create unique index if not exists idx_betting_markets_unique_market
  on betting_markets(match_id, type, name, coalesce(line_value, -1));

create table if not exists odds (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references betting_markets(id),
  selection_key text not null,
  selection_label text not null,
  decimal_odds numeric(10,4) not null,
  status odds_status not null default 'active',
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint odds_decimal_min check (decimal_odds > 1)
);

create index if not exists idx_odds_market_id on odds(market_id);
create unique index if not exists idx_odds_unique_selection
  on odds(market_id, selection_key);

create table if not exists fee_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform_fee_percent numeric(5,2) not null default 4.00,
  operator_fee_percent numeric(5,2) not null default 6.00,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fee_platform_range check (platform_fee_percent >= 0 and platform_fee_percent <= 100),
  constraint fee_operator_range check (operator_fee_percent >= 0 and operator_fee_percent <= 100)
);

create unique index if not exists idx_fee_settings_one_active
  on fee_settings(is_active)
  where is_active = true;

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  total_stake numeric(12,2) not null,
  gross_payout numeric(12,2) not null,
  platform_fee_percent numeric(5,2) not null,
  operator_fee_percent numeric(5,2) not null,
  platform_fee_amount numeric(12,2) not null,
  operator_fee_amount numeric(12,2) not null,
  net_payout numeric(12,2) not null,
  currency text not null default 'USD',
  status bet_status not null default 'pending_payment',
  payment_status payment_status not null default 'created',
  source payment_provider not null default 'demo',
  idempotency_key text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  settled_at timestamptz,
  constraint bet_stake_positive check (total_stake > 0),
  constraint bet_payout_non_negative check (gross_payout >= 0 and net_payout >= 0)
);

create unique index if not exists idx_bets_user_idempotency
  on bets(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists bet_selections (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id),
  match_id uuid not null references matches(id),
  market_id uuid not null references betting_markets(id),
  odds_id uuid not null references odds(id),
  selection_key text not null,
  frozen_odds numeric(10,4) not null,
  line_value numeric(8,2),
  status bet_selection_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_bet_selections_bet_id on bet_selections(bet_id);
create index if not exists idx_bet_selections_match_id on bet_selections(match_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id),
  user_id uuid not null references profiles(id),
  provider payment_provider not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status payment_status not null default 'created',
  provider_transaction_id text,
  idempotency_key text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint payment_amount_positive check (amount > 0)
);

create unique index if not exists idx_payments_provider_transaction
  on payments(provider, provider_transaction_id)
  where provider_transaction_id is not null;

create unique index if not exists idx_payments_idempotency on payments(idempotency_key);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id),
  provider payment_provider not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  account_type text not null,
  document_number text,
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists bank_transfer_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  bank_account_id uuid not null references bank_accounts(id),
  transfer_number text not null,
  sender_bank text not null,
  sender_name text not null,
  sender_document text,
  transfer_date date not null,
  receipt_file_url text,
  admin_status receipt_status not null default 'pending_review',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (transfer_number, sender_bank)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  bet_id uuid references bets(id),
  payment_id uuid references payments(id),
  type text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references profiles(id),
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_actor on audit_logs(actor_user_id);

insert into roles(name, description)
values
  ('user', 'Usuario final'),
  ('operator', 'Operador administrativo'),
  ('admin', 'Administrador completo')
on conflict (name) do nothing;

insert into fee_settings(name, platform_fee_percent, operator_fee_percent, is_active)
values ('Comisiones MVP', 4.00, 6.00, true)
on conflict do nothing;
