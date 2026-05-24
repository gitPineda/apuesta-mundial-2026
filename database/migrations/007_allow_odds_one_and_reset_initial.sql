update odds
set decimal_odds = 1.00,
    updated_at = now()
where market_id in (
  select bm.id
  from betting_markets bm
  join matches m on m.id = bm.match_id
  where m.external_id like 'wc2026-match-%'
);
