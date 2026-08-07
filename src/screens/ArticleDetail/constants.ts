import { Platform } from 'react-native';
import { appTheme } from '../../theme/colors';

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
  bg: appTheme.light.appReadingBackground,
  card: appTheme.light.appSurface,
  border: appTheme.light.appBorder,
  ink: appTheme.light.appTextPrimary,
  muted: appTheme.light.appTextSecondary,
  accent: appTheme.light.appPrimary,
  accentBg: appTheme.light.appPrimaryContainer,
} as const;
