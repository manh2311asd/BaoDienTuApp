import type { FontSize } from '../store/useAppStore';

export const FONT_SCALE: Record<FontSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const FONT_SIZE_OPTIONS: Array<{
  value: FontSize;
  label: string;
  percent: string;
}> = [
  { value: 'small', label: 'Nhỏ', percent: '90%' },
  { value: 'medium', label: 'Vừa', percent: '100%' },
  { value: 'large', label: 'Lớn', percent: '115%' },
  { value: 'xlarge', label: 'Rất lớn', percent: '130%' },
];

export const scaleFont = (base: number, size: FontSize): number =>
  Math.round(base * FONT_SCALE[size] * 10) / 10;

export const scaleLineHeight = (base: number, size: FontSize): number =>
  Math.round(base * FONT_SCALE[size] * 10) / 10;
