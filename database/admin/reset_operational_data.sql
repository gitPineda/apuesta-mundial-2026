-- Manual operational reset for test runs.
-- Run intentionally only; do not place this file in database/migrations.
--
-- Keeps:
-- - admin profiles and their roles
-- - roles, teams, venues, tournaments
-- - matches, betting_markets, odds
-- - fee_settings, mobile_app_versions, bank_accounts
--
-- Deletes:
-- - non-admin users and their operational data
-- - bets, selections, payments, bank transfer receipts
-- - ledger entries, payment events, audit logs
-- - email delivery failures, match results
-- - non-admin responsible gaming limits, terms, KYC

begin;

delete from email_delivery_failures;
delete from ledger_entries;
delete from payment_events;
delete from bank_transfer_receipts;
delete from payments;
delete from bet_selections;
delete from bets;
delete from match_results;
delete from audit_logs;

delete from kyc_verifications
where user_id not in (
  select ur.user_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.name = 'admin'
);

delete from responsible_gaming_limits
where user_id not in (
  select ur.user_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.name = 'admin'
);

delete from terms_acceptance
where user_id not in (
  select ur.user_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.name = 'admin'
);

delete from user_roles
where user_id not in (
  select ur.user_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.name = 'admin'
);

delete from profiles
where id not in (
  select ur.user_id
  from user_roles ur
  join roles r on r.id = ur.role_id
  where r.name = 'admin'
);

update matches
set status = 'scheduled',
    updated_at = now()
where status <> 'scheduled';

update betting_markets
set status = 'open',
    updated_at = now()
where status <> 'open';

update odds
set status = 'active',
    updated_at = now()
where status <> 'active';

commit;
