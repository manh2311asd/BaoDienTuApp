export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  vip: string;
}

export const lightColors: ThemeColors = {
  background: '#FCFBF9',
  card: '#FFFFFF',
  text: '#111111',
  textMuted: '#787774',
  primary: '#1F6C9F',
  secondary: '#346538',
  border: '#EAEAEA',
  success: '#346538',
  warning: '#956400',
  danger: '#9F2F2D',
  vip: '#956400',
};

export const darkColors: ThemeColors = {
  background: '#171715',
  card: '#222220',
  text: '#F5F4F1',
  textMuted: '#A7A59F',
  primary: '#8AB9D6',
  secondary: '#93B18F',
  border: '#373733',
  success: '#93B18F',
  warning: '#D7B86B',
  danger: '#DF918E',
  vip: '#D7B86B',
};
