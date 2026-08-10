import {
  DEMO_VISA,
  formatCardNumber,
  formatExpiry,
  validateDemoVisa,
} from '../src/utils/demoVisa';

describe('demo Visa checkout helpers', () => {
  it('formats card and expiry fields without keeping extra characters', () => {
    expect(formatCardNumber('4242-4242-4242-4242-99')).toBe(
      '4242 4242 4242 4242',
    );
    expect(formatExpiry('1230')).toBe('12/30');
  });

  it('accepts only the documented sample Visa', () => {
    expect(validateDemoVisa({ ...DEMO_VISA })).toBeNull();
    expect(validateDemoVisa({ ...DEMO_VISA, cvv: '999' })).toContain('CVV');
  });
});
