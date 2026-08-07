export type UtilityLoadStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'stale'
  | 'error';

export interface UtilityEnvelope<T> {
  data: T;
  source: string;
  updatedAt: string;
}

export interface UtilityResource<T> {
  status: UtilityLoadStatus;
  data: T | null;
  source: string | null;
  updatedAt: string | null;
  error: string | null;
  fromCache: boolean;
}

export type FootballStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'HALFTIME'
  | 'FINISHED'
  | 'POSTPONED'
  | 'CANCELED'
  | 'SUSPENDED';

export interface FootballTeam {
  id: number;
  name: string;
  shortName: string;
  crest?: string | null;
}

export interface FootballScore {
  home?: number | null;
  away?: number | null;
  halfTimeHome?: number | null;
  halfTimeAway?: number | null;
  extraTimeHome?: number | null;
  extraTimeAway?: number | null;
  penaltiesHome?: number | null;
  penaltiesAway?: number | null;
  duration?: string | null;
}

export interface FootballMatch {
  id: number;
  competitionId: string;
  competition: string;
  competitionCode: string;
  season: string;
  matchday?: number | null;
  utcDate: string;
  localDate: string;
  status: FootballStatus;
  minute?: number | null;
  stage?: string | null;
  homeTeam: FootballTeam;
  awayTeam: FootballTeam;
  score: FootballScore;
  venue?: string | null;
  updatedAt: string;
}

export interface FootballStanding {
  position: number;
  teamId: number;
  team: string;
  crest?: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalDifference: number;
  points: number;
}

export interface ExchangeRate {
  code: string;
  name: string;
  cashBuy?: number | null;
  transferBuy?: number | null;
  sell?: number | null;
}

export type LotteryStatus =
  | 'SCHEDULED'
  | 'DRAWING'
  | 'PARTIAL'
  | 'FINAL'
  | 'POSTPONED'
  | 'UNAVAILABLE';

export interface LotteryPrize {
  code: string;
  name: string;
  numbers: string[];
}

export interface LotteryDraw {
  region: 'north' | 'central' | 'south' | 'vietlott';
  province?: string | null;
  lotteryType?: string | null;
  drawDate: string;
  status: LotteryStatus;
  scheduledAt?: string | null;
  completedAt?: string | null;
  prizes: LotteryPrize[];
}

export interface GoldPrice {
  id: string;
  name: string;
  category: 'bar' | 'ring' | 'other';
  brand?: string | null;
  region?: string | null;
  buy?: number | null;
  sell?: number | null;
  change?: number | null;
  unit: string;
}
