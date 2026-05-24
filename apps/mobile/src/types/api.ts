export interface Match {
  id: string;
  kickoff_at: string;
  phase: string;
  group_name?: string;
  status: string;
  betting_enabled: boolean;
  betting_closes_at: string;
  home_score?: number | null;
  away_score?: number | null;
  result_is_official?: boolean | null;
  result_recorded_at?: string | null;
  is_past_or_finished?: boolean;
  kickoff_local_date?: string;
  kickoff_local_time?: string;
  betting_closes_local_date?: string;
  betting_closes_local_time?: string;
  display_timezone?: string;
  home_team_name: string;
  away_team_name: string;
  home_team_code: string;
  away_team_code: string;
  venue_name: string;
  venue_city: string;
  venue_country: string;
  accepts_bets: boolean;
}

export interface Odd {
  id: string;
  selectionKey: string;
  selectionLabel: string;
  decimalOdds: string;
  status: string;
}

export interface Market {
  id: string;
  name: string;
  type: string;
  status: string;
  odds: Odd[];
}

export interface BetQuote {
  stake: number;
  multiplier: number;
  grossPayout: number;
  platformFeePercent: number;
  operatorFeePercent: number;
  platformFeeAmount: number;
  operatorFeeAmount: number;
  netPayout: number;
}

export interface Bet {
  id: string;
  total_stake: string;
  gross_payout: string;
  net_payout: string;
  status: string;
  payment_status: string;
  source: string;
  created_at: string;
}
