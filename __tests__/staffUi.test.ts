import {
  formatStaffMoney,
  STATUS_META,
  stripArticleHtml,
  toArticleHtml,
} from '../src/screens/Staff/staffUi';

describe('staff article helpers', () => {
  it('converts plain paragraphs to safe article HTML', () => {
    expect(toArticleHtml('Đoạn một & nguồn.\n\nĐoạn <hai>.')).toBe(
      '<p>Đoạn một &amp; nguồn.</p><p>Đoạn &lt;hai&gt;.</p>'
    );
  });

  it('restores readable paragraphs from stored HTML', () => {
    expect(
      stripArticleHtml('<p>Đoạn một.</p><p>Đoạn hai &amp; nguồn.</p>')
    ).toBe('Đoạn một.\n\nĐoạn hai & nguồn.');
  });

  it('defines a visible editorial label for every workflow state', () => {
    expect(STATUS_META.DRAFT.label).toBe('BẢN NHÁP');
    expect(STATUS_META.PENDING.label).toBe('CHỜ DUYỆT');
    expect(STATUS_META.REJECTED.label).toBe('CẦN SỬA');
  });

  it('formats estimated revenue in Vietnamese đồng', () => {
    expect(formatStaffMoney(1400)).toContain('1');
    expect(formatStaffMoney(1400)).toContain('400');
    expect(formatStaffMoney(1400)).toMatch(/đ$/);
  });
});
