export type BinaryOperator = '+' | '-' | '×' | '÷';

export const normalizeCalculatorResult = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;
  const normalized = Number.parseFloat(value.toPrecision(12));
  return Object.is(normalized, -0) ? 0 : normalized;
};

export const calculateBinary = (
  left: number,
  right: number,
  operator: BinaryOperator
): number | null => {
  if (operator === '÷' && right === 0) return null;
  const raw =
    operator === '+'
      ? left + right
      : operator === '-'
        ? left - right
        : operator === '×'
          ? left * right
          : left / right;
  return normalizeCalculatorResult(raw);
};

export const formatCalculatorValue = (value: string): string => {
  if (!value || !Number.isFinite(Number(value))) return value || '0';
  if (/e/i.test(value)) return value.replace('.', ',');

  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart, decimalPart] = unsigned.split('.');
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = negative ? '−' : '';

  return decimalPart !== undefined
    ? `${sign}${groupedInteger},${decimalPart}`
    : `${sign}${groupedInteger}`;
};
