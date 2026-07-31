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
  background: '#F7F6F3',
  card: '#FFFFFF',
  text: '#191919',
  textMuted: '#72736F',
  primary: '#28627A',
  secondary: '#346538',
  border: '#E7E6E2',
  success: '#346538',
  warning: '#8B6200',
  danger: '#A62624',
  vip: '#8B6200',
};

export const darkColors: ThemeColors = {
  background: '#151513',
  card: '#1E1E1B',
  text: '#F3F2EE',
  textMuted: '#B7B7AF',
  primary: '#8EB8C8',
  secondary: '#93B18F',
  border: '#33332E',
  success: '#93B18F',
  warning: '#D7B86B',
  danger: '#E57373',
  vip: '#D7B86B',
};
