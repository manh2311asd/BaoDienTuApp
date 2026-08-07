import AsyncStorage from '@react-native-async-storage/async-storage';
import { UtilityEnvelope } from '../types/utilities';

const PREFIX = '@BaoDienTu:utility:';

export interface CachedUtility<T> {
  savedAt: number;
  payload: UtilityEnvelope<T>;
}

export const utilityCacheKeys = {
  dashboard: (name: 'football' | 'finance' | 'lottery') =>
    `dashboard:${name}`,
  football: (
    date: string,
    competition: string,
    season: string,
    tab: string
  ) => `football:${date}:${competition || 'all'}:${season || 'current'}:${tab}`,
  footballStandings: (competition: string, season: string) =>
    `football:standings:${competition || 'none'}:${season || 'current'}`,
  finance: (tab: 'forex' | 'gold' | 'stocks') => `finance:${tab}`,
  lottery: (
    region: string,
    province: string,
    drawDate: string,
    lotteryType: string
  ) =>
    `lottery:${region}:${province || 'all'}:${drawDate}:${lotteryType || 'traditional'}`,
};

export async function readUtilityCache<T>(
  key: string
): Promise<CachedUtility<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUtility<T>;
    if (!parsed?.payload || !Number.isFinite(parsed.savedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeUtilityCache<T>(
  key: string,
  payload: UtilityEnvelope<T>
) {
  const value: CachedUtility<T> = { savedAt: Date.now(), payload };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  return value;
}

export const isUtilityCacheFresh = (
  cache: CachedUtility<unknown> | null,
  ttl: number
) => Boolean(cache && Date.now() - cache.savedAt < ttl);
