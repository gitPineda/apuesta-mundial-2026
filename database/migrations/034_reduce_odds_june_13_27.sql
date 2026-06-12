update odds o
set decimal_odds = case o.decimal_odds::numeric(10,2)
    when 2.00 then 1.40
    when 3.00 then 1.70
    when 4.00 then 2.10
    else o.decimal_odds
  end,
  updated_at = now()
from betting_markets bm
join matches m on m.id = bm.match_id
where o.market_id = bm.id
  and (m.kickoff_at at time zone 'America/Guayaquil')::date
    between date '2026-06-13' and date '2026-06-27'
  and o.decimal_odds::numeric(10,2) in (2.00, 3.00, 4.00);
