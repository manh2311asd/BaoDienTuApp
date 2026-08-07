import {
  formatStorageBytes,
  getArticleTextMetrics,
  READING_EXPERIENCE_ROUTES,
} from '../src/screens/Settings/readingSettingsUi';

describe('reading settings UI contract', () => {
  it('maps the three profile rows to three distinct routes', () => {
    expect(READING_EXPERIENCE_ROUTES).toEqual({
      font: 'FontTypographySettings',
      appearance: 'AppearanceSettings',
      data: 'DownloadDataSettings',
    });
    expect(new Set(Object.values(READING_EXPERIENCE_ROUTES)).size).toBe(3);
  });

  it('uses the required fixed article font scales', () => {
    expect(getArticleTextMetrics(20, 30, 'small', 'default').fontSize).toBe(18);
    expect(getArticleTextMetrics(20, 30, 'medium', 'default').fontSize).toBe(20);
    expect(getArticleTextMetrics(20, 30, 'large', 'default').fontSize).toBe(23);
    expect(getArticleTextMetrics(20, 30, 'xlarge', 'default').fontSize).toBe(26);
  });

  it('changes line spacing independently from font size', () => {
    const compact = getArticleTextMetrics(17, 27, 'medium', 'compact');
    const relaxed = getArticleTextMetrics(17, 27, 'medium', 'relaxed');
    expect(compact.fontSize).toBe(relaxed.fontSize);
    expect(compact.lineHeight).toBeLessThan(relaxed.lineHeight);
  });

  it('formats measured storage without hard-coded labels', () => {
    expect(formatStorageBytes(0)).toBe('0 B');
    expect(formatStorageBytes(1536)).toBe('1.5 KB');
    expect(formatStorageBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
