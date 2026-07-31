import {
  FONT_SCALE,
  FONT_SIZE_OPTIONS,
  scaleFont,
  scaleLineHeight,
} from '../src/theme/typography';

describe('reading typography', () => {
  it('có đủ bốn mức cỡ chữ theo đúng thứ tự', () => {
    expect(FONT_SIZE_OPTIONS.map((option) => option.value)).toEqual([
      'small',
      'medium',
      'large',
      'xlarge',
    ]);
  });

  it('hiển thị phần trăm rõ ràng cho người đọc', () => {
    expect(FONT_SIZE_OPTIONS.map((option) => option.percent)).toEqual([
      '90%',
      '100%',
      '115%',
      '130%',
    ]);
  });

  it('giữ nguyên cỡ chữ ở mức vừa', () => {
    expect(scaleFont(17, 'medium')).toBe(17);
    expect(scaleLineHeight(27, 'medium')).toBe(27);
  });

  it('thu nhỏ mức nhỏ còn 90 phần trăm', () => {
    expect(scaleFont(20, 'small')).toBe(18);
  });

  it('tăng mức lớn nhưng vẫn giữ bố cục dễ đọc', () => {
    expect(scaleFont(20, 'large')).toBe(23);
    expect(scaleLineHeight(20, 'large')).toBe(23);
  });

  it('giới hạn mức rất lớn ở 130 phần trăm', () => {
    expect(FONT_SCALE.xlarge).toBe(1.3);
    expect(scaleFont(20, 'xlarge')).toBe(26);
  });
});
