import {
  getMembershipDisplay,
  normalizeReadingProgress,
} from '../src/screens/Profile/profileUi';

describe('profile presentation helpers', () => {
  it('shows a clear unregistered state when a member has no VIP expiry', () => {
    expect(getMembershipDisplay('MEMBER', null).value).toBe('Chưa đăng ký');
  });

  it('labels an expired membership instead of showing an unexplained date', () => {
    const result = getMembershipDisplay(
      'MEMBER',
      '2026-07-25',
      new Date('2026-08-05T12:00:00+07:00')
    );
    expect(result.state).toBe('expired');
    expect(result.label).toBe('ĐÃ HẾT HẠN');
    expect(result.value).toContain('25');
  });

  it('keeps an active VIP expiry visible', () => {
    const result = getMembershipDisplay(
      'VIP',
      '2027-07-25',
      new Date('2026-08-05T12:00:00+07:00')
    );
    expect(result.state).toBe('active');
    expect(result.formattedExpiry).toBeTruthy();
  });

  it('recognizes a paid member from the active expiry even when the base role remains MEMBER', () => {
    const result = getMembershipDisplay(
      'MEMBER',
      '2027-07-25',
      new Date('2026-08-05T12:00:00+07:00')
    );
    expect(result.state).toBe('active');
    expect(result.label).toBe('HẠN THÀNH VIÊN');
    expect(result.formattedExpiry).toBeTruthy();
  });

  it('only displays genuine in-progress reading values', () => {
    expect(normalizeReadingProgress(0.42)).toBe(42);
    expect(normalizeReadingProgress(67)).toBe(67);
    expect(normalizeReadingProgress(0)).toBeNull();
    expect(normalizeReadingProgress(1)).toBeNull();
    expect(normalizeReadingProgress(undefined)).toBeNull();
  });
});
