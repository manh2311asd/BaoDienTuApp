import {
  formatIsoDate,
  shiftIsoDate,
  isFutureIsoDate,
} from '../src/screens/Utilities/utilityUi';

describe('utility date rules', () => {
  it('formats dates to ISO format', () => {
    expect(formatIsoDate(new Date('2026-08-05T10:00:00'))).toBe('2026-08-05');
  });

  it('shifts ISO dates correctly', () => {
    expect(shiftIsoDate('2026-08-05', 1)).toBe('2026-08-06');
    expect(shiftIsoDate('2026-08-05', -1)).toBe('2026-08-04');
  });

  it('prevents future dates', () => {
    expect(isFutureIsoDate('2026-08-06', new Date('2026-08-05T10:00:00'))).toBe(true);
    expect(isFutureIsoDate('2026-08-05', new Date('2026-08-05T10:00:00'))).toBe(false);
  });
});
