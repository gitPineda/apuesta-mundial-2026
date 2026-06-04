-- Manual operational reset for test runs.
-- Run intentionally only; do not place this file in database/migrations.
--
-- Keeps:
-- - admin profiles and their roles
-- - roles, teams, venues, tournaments
-- - matches, betting_markets, odds
--   except the explicit test matches listed in special_matches_to_delete
-- - fee_settings, mobile_app_versions, bank_accounts
--
-- Deletes:
-- - non-admin users and their operational data
-- - bets, selections, payments, bank transfer receipts
-- - ledger entries, payment events, audit logs
-- - email delivery failures, match results
-- - non-admin responsible gaming limits, terms, KYC
-- - explicit test matches:
--   Ecuador vs Arabia Saudita friendly
--   Paris Saint-Germain vs Arsenal Champions final

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

create temporary table special_matches_to_delete as
select m.id
from matches m
left join teams ht on ht.id = m.home_team_id
left join teams at on at.id = m.away_team_id
where m.external_id in (
    'friendly-2026-ecu-ksa-20260530',
    'special-ecu-ksa-2026-05-30',
    'uefa-champions-final-psg-ars-2026-05-30'
  )
  or (
    ht.fifa_code = 'ECU'
    and at.fifa_code = 'KSA'
    and m.kickoff_local_date_ec = date '2026-05-30'
  )
  or (
    ht.fifa_code = 'PSG'
    and at.fifa_code = 'ARS'
    and m.kickoff_local_date_ec = date '2026-05-30'
  );

delete from odds
where market_id in (
  select bm.id
  from betting_markets bm
  join special_matches_to_delete sm on sm.id = bm.match_id
);

delete from betting_markets
where match_id in (select id from special_matches_to_delete);

delete from matches
where id in (select id from special_matches_to_delete);

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

drop table special_matches_to_delete;

commit;
