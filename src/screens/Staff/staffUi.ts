import { ArticleStatus } from '../../types/content';

export const STAFF_COLORS = {
  ink: '#111111',
  muted: '#787774',
  border: '#EAEAEA',
  blueBg: '#E1F3FE',
  blueText: '#1F6C9F',
  greenBg: '#EDF3EC',
  greenText: '#346538',
  yellowBg: '#FBF3DB',
  yellowText: '#956400',
  redBg: '#FDEBEC',
  redText: '#9F2F2D',
  grayBg: '#F0EFED',
};

export const STATUS_META: Record<
  ArticleStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  DRAFT: {
    label: 'BẢN NHÁP',
    backgroundColor: STAFF_COLORS.grayBg,
    color: STAFF_COLORS.muted,
  },
  PENDING: {
    label: 'CHỜ DUYỆT',
    backgroundColor: STAFF_COLORS.yellowBg,
    color: STAFF_COLORS.yellowText,
  },
  PUBLISHED: {
    label: 'ĐÃ ĐĂNG',
    backgroundColor: STAFF_COLORS.greenBg,
    color: STAFF_COLORS.greenText,
  },
  REJECTED: {
    label: 'CẦN SỬA',
    backgroundColor: STAFF_COLORS.redBg,
    color: STAFF_COLORS.redText,
  },
  HIDDEN: {
    label: 'ĐANG ẨN',
    backgroundColor: STAFF_COLORS.grayBg,
    color: STAFF_COLORS.redText,
  },
};

export const formatStaffDate = (value?: string) => {
  if (!value) {
    return '';
  }
  return new Date(value).toLocaleDateString('vi-VN');
};

export const formatStaffMoney = (value: number) =>
  `${Math.max(0, Math.round(value)).toLocaleString('vi-VN')}đ`;

export const stripArticleHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const toArticleHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p>${paragraph
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />')}</p>`
    )
    .join('');
