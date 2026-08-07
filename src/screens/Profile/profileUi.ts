export type MembershipState = 'active' | 'expired' | 'none';

export interface MembershipDisplay {
  state: MembershipState;
  label: string;
  value: string;
  formattedExpiry: string | null;
}

const parseExpiry = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const formatMembershipDate = (value?: string | null) => {
  const parsed = parseExpiry(value);
  return parsed ? parsed.toLocaleDateString('vi-VN') : null;
};

export const getMembershipDisplay = (
  role: string,
  expiryValue?: string | null,
  now = new Date()
): MembershipDisplay => {
  const expiry = parseExpiry(expiryValue);
  const formattedExpiry = formatMembershipDate(expiryValue);

  if (expiry) {
    const expiryEnd = new Date(expiry);
    expiryEnd.setHours(23, 59, 59, 999);
    if (expiryEnd.getTime() < now.getTime()) {
      return {
        state: 'expired',
        label: 'ĐÃ HẾT HẠN',
        value: formattedExpiry || 'Đã hết hạn',
        formattedExpiry,
      };
    }
  }

  if (role === 'VIP') {
    return {
      state: 'active',
      label: 'HẠN THÀNH VIÊN',
      value: formattedExpiry || 'Đang hoạt động',
      formattedExpiry,
    };
  }

  return {
    state: 'none',
    label: 'THÀNH VIÊN',
    value: 'Chưa đăng ký',
    formattedExpiry: null,
  };
};

export const normalizeReadingProgress = (
  value?: number | null
): number | null => {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  const percentage = value <= 1 ? value * 100 : value;
  const rounded = Math.round(percentage);
  return rounded > 0 && rounded < 100 ? rounded : null;
};
