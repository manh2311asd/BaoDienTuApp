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

export interface AppThemeTokens {
  appBackground: string;
  appBackgroundAlt: string;
  appHeader: string;
  appHeaderPressed: string;
  appHeaderText: string;
  appHeaderTextSecondary: string;
  appHeaderAccent: string;
  appAccentText: string;
  appControlIcon: string;
  appPrimary: string;
  appPrimaryPressed: string;
  appOnPrimary: string;
  appPrimaryContainer: string;
  appCategoryContainer: string;
  appCategoryBorder: string;
  appSearchPlaceholder: string;
  appSecondary: string;
  appSecondaryContainer: string;
  appBlueContainer: string;
  appBlueIcon: string;
  appSageIcon: string;
  appYellowContainer: string;
  appRoseContainer: string;
  appSportContainer: string;
  appLifeContainer: string;
  appSurface: string;
  appSurfaceMuted: string;
  appExternalSurface: string;
  appBorder: string;
  appDivider: string;
  appTextPrimary: string;
  appTextSecondary: string;
  appTextMuted: string;
  appBottomBar: string;
  appBottomActive: string;
  appBottomActiveText: string;
  appBottomInactive: string;
  appBottomBorder: string;
  appReadingBackground: string;
  appVipBorder: string;
  appVipText: string;
  appError: string;
  appErrorContainer: string;
  appSuccess: string;
  appWarning: string;
  appOverlay: string;
}

export const appTheme: Record<'light' | 'dark', AppThemeTokens> = {
  light: {
    appBackground: '#F7F3ED',
    appBackgroundAlt: '#FBF7F1',
    appHeader: '#342D28',
    appHeaderPressed: '#29231F',
    appHeaderText: '#FFF9F2',
    appHeaderTextSecondary: '#D4CBC2',
    appHeaderAccent: '#F08A73',
    appAccentText: '#AD4E3F',
    appControlIcon: '#FFF9F2',
    appPrimary: '#C65F4D',
    appPrimaryPressed: '#AD4E3F',
    appOnPrimary: '#FFFFFF',
    appPrimaryContainer: '#F7DED3',
    appCategoryContainer: '#F7DED3',
    appCategoryBorder: '#E4DCD2',
    appSearchPlaceholder: '#999088',
    appSecondary: '#708978',
    appSecondaryContainer: '#E4EEE7',
    appBlueContainer: '#E6ECEE',
    appBlueIcon: '#4F6870',
    appSageIcon: '#557360',
    appYellowContainer: '#FAEDC5',
    appRoseContainer: '#FAE8E6',
    appSportContainer: '#E4EEE7',
    appLifeContainer: '#F1EBE3',
    appSurface: '#FFFDF9',
    appSurfaceMuted: '#F1EBE4',
    appExternalSurface: '#E6ECEE',
    appBorder: '#E4DCD2',
    appDivider: 'rgba(45, 37, 31, 0.08)',
    appTextPrimary: '#29231F',
    appTextSecondary: '#746D66',
    appTextMuted: '#999088',
    appBottomBar: '#342D28',
    appBottomActive: '#F08A73',
    appBottomActiveText: '#F4A18E',
    appBottomInactive: '#BDB3AA',
    appBottomBorder: 'rgba(255, 255, 255, 0.08)',
    appReadingBackground: '#FBF7F1',
    appVipBorder: '#E5D59F',
    appVipText: '#72551D',
    appError: '#B44449',
    appErrorContainer: '#FAE8E6',
    appSuccess: '#496653',
    appWarning: '#9A7021',
    appOverlay: 'rgba(48, 42, 38, 0.42)',
  },
  dark: {
    appBackground: '#181512',
    appBackgroundAlt: '#1F1B18',
    appHeader: '#241F1C',
    appHeaderPressed: '#332B27',
    appHeaderText: '#FFF9F2',
    appHeaderTextSecondary: '#CFC5BC',
    appHeaderAccent: '#F4A18E',
    appAccentText: '#F4A18E',
    appControlIcon: '#FFF9F2',
    appPrimary: '#E58570',
    appPrimaryPressed: '#CC705D',
    appOnPrimary: '#181512',
    appPrimaryContainer: '#432C26',
    appCategoryContainer: '#2A2420',
    appCategoryBorder: 'rgba(255, 255, 255, 0.10)',
    appSearchPlaceholder: '#998F87',
    appSecondary: '#91A595',
    appSecondaryContainer: '#29362D',
    appBlueContainer: '#2B3538',
    appBlueIcon: '#9BB0B6',
    appSageIcon: '#9DB3A2',
    appYellowContainer: '#40391F',
    appRoseContainer: '#432628',
    appSportContainer: '#29362D',
    appLifeContainer: '#342D28',
    appSurface: '#211D1A',
    appSurfaceMuted: '#2A2420',
    appExternalSurface: '#292623',
    appBorder: 'rgba(255, 255, 255, 0.10)',
    appDivider: 'rgba(255, 255, 255, 0.08)',
    appTextPrimary: '#F4EEE8',
    appTextSecondary: '#C1B7AE',
    appTextMuted: '#998F87',
    appBottomBar: '#241F1C',
    appBottomActive: '#F08A73',
    appBottomActiveText: '#F4A18E',
    appBottomInactive: '#BDB3AA',
    appBottomBorder: 'rgba(255, 255, 255, 0.08)',
    appReadingBackground: '#1F1B18',
    appVipBorder: '#655B36',
    appVipText: '#E7D38C',
    appError: '#EE8990',
    appErrorContainer: '#432628',
    appSuccess: '#91B49A',
    appWarning: '#D9B264',
    appOverlay: 'rgba(10, 8, 7, 0.68)',
  },
};

/**
 * Shared shell for the four persistent top-level tabs.
 *
 * Secondary screens keep `appTheme`, because some of them intentionally use
 * a stronger coloured toolbar. Keeping this palette separate prevents a
 * main-tab visual refresh from changing their established contrast rules.
 */
export const mainShellTheme: Record<'light' | 'dark', AppThemeTokens> = {
  light: {
    ...appTheme.light,
    appBackground: '#F7F4EF',
    appBackgroundAlt: '#FBF9F5',
    appHeader: '#FBF9F5',
    appHeaderPressed: '#FFFFFF',
    appHeaderText: '#2D2925',
    appHeaderTextSecondary: '#77716B',
    appHeaderAccent: '#D85F4D',
    appAccentText: '#B94E3F',
    appControlIcon: '#3D3833',
    appPrimary: '#D85F4D',
    appPrimaryPressed: '#BE4C3D',
    appOnPrimary: '#FFFFFF',
    appPrimaryContainer: '#FCE8E2',
    appCategoryContainer: '#FFF4EE',
    appCategoryBorder: '#EAD8CE',
    appSearchPlaceholder: '#8C857E',
    appSecondary: '#477A78',
    appSecondaryContainer: '#EEF2F1',
    appBlueContainer: '#EEF2F1',
    appBlueIcon: '#477A78',
    appSageIcon: '#477A78',
    appSurface: '#FFFFFF',
    appSurfaceMuted: '#FFF9F4',
    appExternalSurface: '#EEF2F1',
    appBorder: '#E5DED6',
    appDivider: 'rgba(45, 41, 37, 0.08)',
    appTextPrimary: '#2D2925',
    appTextSecondary: '#77716B',
    appTextMuted: '#9B958F',
    appBottomBar: '#FFFFFF',
    appBottomActive: '#D85F4D',
    appBottomActiveText: '#D85F4D',
    appBottomInactive: '#8C8782',
    appBottomBorder: '#E5DED6',
    appReadingBackground: '#FBF9F5',
  },
  dark: {
    ...appTheme.dark,
    appBackground: '#181715',
    appBackgroundAlt: '#1D1B19',
    appHeader: '#1D1B19',
    appHeaderPressed: '#23211F',
    appHeaderText: '#F4F0EB',
    appHeaderTextSecondary: '#A9A39D',
    appHeaderAccent: '#FF8A76',
    appAccentText: '#FF8A76',
    appControlIcon: '#F4F0EB',
    appPrimary: '#FF8A76',
    appPrimaryPressed: '#E97865',
    appOnPrimary: '#181715',
    appPrimaryContainer: '#3B2925',
    appCategoryContainer: '#2A2724',
    appCategoryBorder: 'rgba(244, 240, 235, 0.10)',
    appSearchPlaceholder: '#A9A39D',
    appSurface: '#23211F',
    appSurfaceMuted: '#2A2724',
    appBorder: 'rgba(244, 240, 235, 0.10)',
    appDivider: 'rgba(244, 240, 235, 0.08)',
    appTextPrimary: '#F4F0EB',
    appTextSecondary: '#C7C1BB',
    appTextMuted: '#A9A39D',
    appBottomBar: '#211F1D',
    appBottomActive: '#FF8A76',
    appBottomActiveText: '#FF8A76',
    appBottomInactive: '#A9A39D',
    appBottomBorder: 'rgba(244, 240, 235, 0.10)',
    appReadingBackground: '#181715',
  },
};

export interface UtilityThemeTokens {
  accent: string;
  container: string;
  border: string;
  header: string;
  canvas: string;
  darkAccent: string;
  darkContainer: string;
}

export const utilityThemes: Record<
  'calendar' | 'finance' | 'weather' | 'fuel',
  UtilityThemeTokens
> = {
  calendar: {
    accent: '#7058A5',
    container: '#EEE9F8',
    border: '#D9CFF0',
    header: '#59458F',
    canvas: '#F7F4FC',
    darkAccent: '#AE9AE4',
    darkContainer: '#342D49',
  },

  finance: {
    accent: '#1E6879',
    container: '#E2F1F4',
    border: '#C4DFE5',
    header: '#19566D',
    canvas: '#F1F9FB',
    darkAccent: '#75B8CD',
    darkContainer: '#233840',
  },
  weather: {
    accent: '#287DA1',
    container: '#DFF3FC',
    border: '#C7E5F1',
    header: '#206884',
    canvas: '#F1FAFE',
    darkAccent: '#79BBD6',
    darkContainer: '#243943',
  },
  fuel: {
    accent: '#A86416',
    container: '#FFF0D4',
    border: '#F0D6A5',
    header: '#885012',
    canvas: '#FFF9EE',
    darkAccent: '#DCA765',
    darkContainer: '#3D3224',
  },
};

export interface PageTheme {
  pageBackground: string;
  statusBarBackground: string;
  headerBackground: string;
  headerForeground: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  cardBackground: string;
  cardBackgroundAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  bottomBarBackground: string;
  bottomBarActive: string;
  bottomBarInactive: string;
  error: string;
  success: string;
  warning: string;
}

export function getPageTheme(
  pageId: string,
  themeMode: 'light' | 'dark'
): PageTheme {
  const shell = appTheme[themeMode];
  const utilityKey = pageId === 'pressReview'
    ? 'finance'
    : pageId === 'finance'
      ? pageId
      : undefined;
  const utility = utilityKey ? utilityThemes[utilityKey] : undefined;
  const dark = themeMode === 'dark';
  const primary = utility
    ? dark
      ? utility.darkAccent
      : utility.accent
    : shell.appPrimary;
  const primaryContainer = utility
    ? dark
      ? utility.darkContainer
      : utility.container
    : shell.appPrimaryContainer;

  return {
    pageBackground: utility && !dark ? utility.canvas : shell.appBackground,
    statusBarBackground: utility && !dark ? utility.header : shell.appHeader,
    headerBackground: utility && !dark ? utility.header : shell.appHeader,
    headerForeground: shell.appHeaderText,
    primary,
    onPrimary: shell.appHeaderText,
    primaryContainer,
    onPrimaryContainer: shell.appTextPrimary,
    secondary: shell.appSecondary,
    onSecondary: shell.appHeaderText,
    secondaryContainer: shell.appSecondaryContainer,
    onSecondaryContainer: shell.appTextPrimary,
    tertiary: shell.appWarning,
    tertiaryContainer: shell.appYellowContainer,
    onTertiaryContainer: shell.appTextPrimary,
    cardBackground: shell.appSurface,
    cardBackgroundAlt: utility ? primaryContainer : shell.appBackgroundAlt,
    border: utility && !dark ? utility.border : shell.appBorder,
    textPrimary: shell.appTextPrimary,
    textSecondary: shell.appTextSecondary,
    textMuted: shell.appTextMuted,
    bottomBarBackground: shell.appBottomBar,
    bottomBarActive: shell.appBottomActive,
    bottomBarInactive: shell.appBottomInactive,
    error: shell.appError,
    success: shell.appSuccess,
    warning: shell.appWarning,
  };
}

export const lightColors: ThemeColors = {
  background: appTheme.light.appBackground,
  card: appTheme.light.appSurface,
  text: appTheme.light.appTextPrimary,
  textMuted: appTheme.light.appTextSecondary,
  primary: appTheme.light.appPrimary,
  secondary: appTheme.light.appSecondary,
  border: appTheme.light.appBorder,
  success: appTheme.light.appSuccess,
  warning: appTheme.light.appWarning,
  danger: appTheme.light.appError,
  vip: appTheme.light.appWarning,
};

export const darkColors: ThemeColors = {
  background: appTheme.dark.appBackground,
  card: appTheme.dark.appSurface,
  text: appTheme.dark.appTextPrimary,
  textMuted: appTheme.dark.appTextSecondary,
  primary: appTheme.dark.appPrimary,
  secondary: appTheme.dark.appSecondary,
  border: appTheme.dark.appBorder,
  success: appTheme.dark.appSuccess,
  warning: appTheme.dark.appWarning,
  danger: appTheme.dark.appError,
  vip: appTheme.dark.appWarning,
};
