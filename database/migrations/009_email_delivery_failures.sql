create table if not exists email_delivery_failures (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  notification_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  subject text,
  error_message text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_email_delivery_failures_created_at
  on email_delivery_failures(created_at desc);

create index if not exists idx_email_delivery_failures_related
  on email_delivery_failures(related_entity_type, related_entity_id);
