import { FootballMatch, FootballStatus } from '../../types/utilities';

export type FootballTab = 'today' | 'upcoming' | 'results' | 'standings';

const UPCOMING_STATUSES: FootballStatus[] = ['SCHEDULED', 'TIMED'];
const RESULT_STATUSES: FootballStatus[] = ['FINISHED'];
const LIVE_STATUSES: FootballStatus[] = ['IN_PLAY', 'PAUSED', 'HALFTIME'];

export const formatIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
};

export const matchLocalDate = (match: FootballMatch) =>
  match.localDate?.slice(0, 10) || match.utcDate.slice(0, 10);

export const isMatchForTab = (
  match: FootballMatch,
  tab: FootballTab,
  selectedDate: string
) => {
  if (tab === 'today') return matchLocalDate(match) === selectedDate;
  if (tab === 'upcoming') return UPCOMING_STATUSES.includes(match.status);
  if (tab === 'results') return RESULT_STATUSES.includes(match.status);
  return false;
};

export const footballStatusLabel = (status: FootballStatus) => {
  const labels: Record<FootballStatus, string> = {
    SCHEDULED: 'Sắp diễn ra',
    TIMED: 'Đã có giờ thi đấu',
    IN_PLAY: 'Đang diễn ra',
    PAUSED: 'Tạm dừng',
    HALFTIME: 'Hết hiệp một',
    FINISHED: 'Kết thúc',
    POSTPONED: 'Tạm hoãn',
    CANCELED: 'Đã hủy',
    SUSPENDED: 'Bị gián đoạn',
  };
  return labels[status];
};

export const footballPollInterval = (matches: FootballMatch[]) => {
  if (matches.some((match) => LIVE_STATUSES.includes(match.status))) return 15_000;
  const now = Date.now();
  const nearKickoff = matches.some((match) => {
    if (!UPCOMING_STATUSES.includes(match.status)) return false;
    const kickOff = new Date(match.utcDate).getTime();
    return kickOff >= now && kickOff - now <= 30 * 60 * 1000;
  });
  if (nearKickoff) return 45_000;
  if (matches.some((match) => UPCOMING_STATUSES.includes(match.status))) {
    return 5 * 60_000;
  }
  return null;
};

export const isFutureIsoDate = (value: string, today = new Date()) =>
  value > formatIsoDate(today);
