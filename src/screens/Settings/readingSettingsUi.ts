import { Platform } from 'react-native';
import type {
  ArticleFontFamily,
  ArticleLineHeight,
  FontSize,
} from '../../store/useAppStore';

export const READING_EXPERIENCE_ROUTES = {
  font: 'FontTypographySettings',
  appearance: 'AppearanceSettings',
  data: 'DownloadDataSettings',
} as const;

export const ARTICLE_FONT_SIZE_SCALE: Record<FontSize, number> = {
  small: 0.9,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const ARTICLE_LINE_HEIGHT_SCALE: Record<ArticleLineHeight, number> = {
  compact: 0.92,
  default: 1,
  relaxed: 1.14,
};

export function getArticleFontFamily(
  family: ArticleFontFamily
): string | undefined {
  if (family === 'serif') {
    return Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    });
  }
  if (family === 'sans') {
    return Platform.select({
      ios: 'Helvetica Neue',
      android: 'sans-serif',
      default: 'sans-serif',
    });
  }
  return undefined;
}

export function getArticleTextMetrics(
  baseSize: number,
  baseLineHeight: number,
  size: FontSize,
  lineHeight: ArticleLineHeight
) {
  const sizeScale = ARTICLE_FONT_SIZE_SCALE[size];
  return {
    fontSize: Math.round(baseSize * sizeScale),
    lineHeight: Math.round(
      baseLineHeight * sizeScale * ARTICLE_LINE_HEIGHT_SCALE[lineHeight]
    ),
  };
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
