import {
  calculateBinary,
  formatCalculatorValue,
  normalizeCalculatorResult,
} from '../src/screens/QuickCalculator/calculatorUi';

describe('calculator presentation and arithmetic', () => {
  it('formats values using Vietnamese separators', () => {
    expect(formatCalculatorValue('1234567.5')).toBe('1.234.567,5');
    expect(formatCalculatorValue('-42')).toBe('−42');
    expect(formatCalculatorValue('0.')).toBe('0,');
  });

  it('handles common binary calculations without floating point noise', () => {
    expect(calculateBinary(0.1, 0.2, '+')).toBe(0.3);
    expect(calculateBinary(8, 4, '÷')).toBe(2);
    expect(calculateBinary(7, 6, '×')).toBe(42);
  });

  it('rejects division by zero and non-finite results', () => {
    expect(calculateBinary(8, 0, '÷')).toBeNull();
    expect(normalizeCalculatorResult(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
