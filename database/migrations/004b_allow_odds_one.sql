alter table odds
  drop constraint if exists odds_decimal_min;

alter table odds
  add constraint odds_decimal_min check (decimal_odds >= 1);
