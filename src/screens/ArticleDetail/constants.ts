import { Platform } from 'react-native';

export const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export const F_SANS = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  default: 'System',
});

export const IC = { strokeWidth: 2 } as const;

export const C = {
  bg: '#FCFBF9',
  card: '#FFFFFF',
  border: '#EAEAEA',
  ink: '#111111',
  muted: '#787774',
  accent: '#1F6C9F',
  accentBg: '#E1F3FE',
} as const;
