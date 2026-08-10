export const DEMO_VISA = {
  number: '4242 4242 4242 4242',
  holder: 'NGUYEN VAN LONG',
  expiry: '12/30',
  cvv: '123',
} as const;

export interface DemoVisaForm {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}

export const emptyDemoVisaForm = (): DemoVisaForm => ({
  number: '',
  holder: '',
  expiry: '',
  cvv: '',
});

export const normalizeCardNumber = (value: string) =>
  value.replace(/\D/g, '').slice(0, 16);

export const formatCardNumber = (value: string) =>
  normalizeCardNumber(value)
    .replace(/(.{4})/g, '$1 ')
    .trim();

export const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}/${digits.slice(2)}`
    : digits;
};

export const validateDemoVisa = (form: DemoVisaForm): string | null => {
  if (
    normalizeCardNumber(form.number) !== normalizeCardNumber(DEMO_VISA.number)
  ) {
    return 'Bản demo chỉ chấp nhận số thẻ Visa thử nghiệm hiển thị bên dưới.';
  }
  if (form.holder.trim().toUpperCase() !== DEMO_VISA.holder) {
    return 'Tên chủ thẻ mẫu chưa đúng.';
  }
  if (form.expiry !== DEMO_VISA.expiry) {
    return 'Ngày hết hạn của thẻ mẫu chưa đúng.';
  }
  if (form.cvv !== DEMO_VISA.cvv) {
    return 'CVV của thẻ mẫu chưa đúng.';
  }
  return null;
};
