import {
  footballPollInterval,
  footballStatusLabel,
  isFutureIsoDate,
  isMatchForTab,
} from '../src/screens/Utilities/utilityUi';
import { utilityCacheKeys } from '../src/services/utilityCache';
import { FootballMatch } from '../src/types/utilities';

const match = (status: FootballMatch['status'], localDate = '2026-08-05') =>
  ({
    id: 1,
    competitionId: '2021',
    competition: 'Premier League',
    competitionCode: 'PL',
    season: '2026-2027',
    utcDate: `${localDate}T12:00:00Z`,
    localDate: `${localDate}T19:00:00`,
    status,
    homeTeam: { id: 1, name: 'A', shortName: 'A' },
    awayTeam: { id: 2, name: 'B', shortName: 'B' },
    score: {},
    updatedAt: `${localDate}T12:00:00Z`,
  }) as FootballMatch;

describe('utility data rules', () => {
  it('uses stable cache keys scoped to every football filter', () => {
    expect(utilityCacheKeys.football('2026-08-05', 'PL', '2026', 'today'))
      .toBe('football:2026-08-05:PL:2026:today');
    expect(utilityCacheKeys.lottery('central', 'danang', '2026-08-05', 'traditional'))
      .toBe('lottery:central:danang:2026-08-05:traditional');
  });

  it('never mixes scheduled and finished matches between tabs', () => {
    expect(isMatchForTab(match('SCHEDULED'), 'upcoming', '2026-08-05')).toBe(true);
    expect(isMatchForTab(match('FINISHED'), 'upcoming', '2026-08-05')).toBe(false);
    expect(isMatchForTab(match('FINISHED'), 'results', '2026-08-05')).toBe(true);
    expect(isMatchForTab(match('SCHEDULED'), 'results', '2026-08-05')).toBe(false);
  });

  it('filters the today tab by the selected local date', () => {
    expect(isMatchForTab(match('IN_PLAY'), 'today', '2026-08-05')).toBe(true);
    expect(isMatchForTab(match('IN_PLAY', '2026-08-06'), 'today', '2026-08-05')).toBe(false);
  });

  it('maps statuses at presentation time and polls only when needed', () => {
    expect(footballStatusLabel('HALFTIME')).toBe('Hết hiệp một');
    expect(footballPollInterval([match('IN_PLAY')])).toBe(15_000);
    expect(footballPollInterval([match('FINISHED')])).toBeNull();
  });

  it('prevents future lottery result dates', () => {
    expect(isFutureIsoDate('2026-08-06', new Date('2026-08-05T10:00:00+07:00'))).toBe(true);
    expect(isFutureIsoDate('2026-08-05', new Date('2026-08-05T10:00:00+07:00'))).toBe(false);
  });
});
