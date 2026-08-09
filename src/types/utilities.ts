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

export interface ExchangeRate {
  code: string;
  name: string;
  cashBuy?: number | null;
  transferBuy?: number | null;
  sell?: number | null;
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
