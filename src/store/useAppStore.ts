import { create } from 'zustand';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';
import { Appearance } from 'react-native';

import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Subscription } from '../types/content';

export type ThemeMode = 'light' | 'dark';
export type ThemeSetting = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ArticleFontFamily = 'app' | 'serif' | 'sans';
export type ArticleLineHeight = 'compact' | 'default' | 'relaxed';

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'MEMBER' | 'VIP' | 'AUTHOR' | 'CENSOR' | 'ADMIN';
  jwtToken: string;
  vipExpiryDate?: string | null;
  freeArticlesLeft: number;
  avatar?: string;
}

interface AppState {
  themeMode: ThemeMode;
  themeSetting: ThemeSetting;
  fontSize: FontSize;
  articleFontSize: FontSize;
  articleFontFamily: ArticleFontFamily;
  articleLineHeight: ArticleLineHeight;
  showImages: boolean;
  wifiOnlyDownloads: boolean;
  user: UserSession | null;
  bookmarkedIds: number[];
  offlineIds: number[];
  subscriptions: Subscription[];
  weatherAutoLocation: boolean;
  weatherLocation: WeatherLocation;
  toggleTheme: () => void;
  setThemeSetting: (setting: ThemeSetting) => void;
  setFontSize: (size: FontSize) => void;
  setArticleTypography: (settings: {
    fontSize: FontSize;
    fontFamily: ArticleFontFamily;
    lineHeight: ArticleLineHeight;
  }) => void;
  setShowImages: (show: boolean) => void;
  setWifiOnlyDownloads: (enabled: boolean) => void;
  setUser: (user: UserSession | null) => void;
  logout: () => void;
  setBookmarkedIds: (ids: number[]) => void;
  toggleBookmark: (id: number) => void;
  setOfflineIds: (ids: number[]) => void;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  addSubscription: (subscription: Subscription) => void;
  removeSubscription: (
    targetType: Subscription['targetType'],
    targetId: number
  ) => void;
  setWeatherAutoLocation: (enabled: boolean) => void;
  setWeatherLocation: (location: WeatherLocation) => void;
  getColors: () => ThemeColors;
}

// Initial theme resolution
const initialThemeSetting: ThemeSetting = 'light';
const resolveInitialThemeMode = (setting: ThemeSetting): ThemeMode => {
  if (setting === 'system') {
    return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
  }
  return setting as ThemeMode;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeSetting: initialThemeSetting,
      themeMode: resolveInitialThemeMode(initialThemeSetting),
      fontSize: 'medium',
      articleFontSize: 'medium',
      articleFontFamily: 'app',
      articleLineHeight: 'default',
      showImages: true,
      wifiOnlyDownloads: false,
      user: null,
      bookmarkedIds: [],
      offlineIds: [],
      subscriptions: [],
      weatherAutoLocation: false,
      weatherLocation: {
        name: 'Hà Nội',
        latitude: 21.0285,
        longitude: 105.8542,
      },
      
      toggleTheme: () => set((state) => {
        const nextMode = state.themeMode === 'light' ? 'dark' : 'light';
        return { themeMode: nextMode, themeSetting: nextMode };
      }),
      
      setThemeSetting: (setting) => set(() => {
        let mode = setting;
        if (setting === 'system') {
          mode = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
        }
        return { themeSetting: setting, themeMode: mode as ThemeMode };
      }),
      
      setFontSize: (size) => set({ fontSize: size }),

      setArticleTypography: ({ fontSize, fontFamily, lineHeight }) =>
        set({
          articleFontSize: fontSize,
          articleFontFamily: fontFamily,
          articleLineHeight: lineHeight,
        }),
      
      setShowImages: (show) => set({ showImages: show }),

      setWifiOnlyDownloads: (enabled) =>
        set({ wifiOnlyDownloads: enabled }),
      
      setUser: (user) => set({ user }),
      
      logout: () => set({ user: null, subscriptions: [] }),
      
      setBookmarkedIds: (ids) => set({ bookmarkedIds: ids }),
      
      toggleBookmark: (id) =>
        set((state) => {
          const exists = state.bookmarkedIds.includes(id);
          const newIds = exists
            ? state.bookmarkedIds.filter((item) => item !== id)
            : [...state.bookmarkedIds, id];
          return { bookmarkedIds: newIds };
        }),
        
      setOfflineIds: (ids) => set({ offlineIds: ids }),

      setSubscriptions: (subscriptions) => set({ subscriptions }),

      addSubscription: (subscription) =>
        set((state) => ({
          subscriptions: [
            subscription,
            ...state.subscriptions.filter(
              (item) =>
                item.targetType !== subscription.targetType ||
                item.targetId !== subscription.targetId
            ),
          ],
        })),

      removeSubscription: (targetType, targetId) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter(
            (item) =>
              item.targetType !== targetType || item.targetId !== targetId
          ),
        })),

      setWeatherAutoLocation: (enabled) =>
        set({ weatherAutoLocation: enabled }),

      setWeatherLocation: (location) => set({ weatherLocation: location }),
      
      getColors: () => {
        return get().themeMode === 'light' ? lightColors : darkColors;
      },
    }),
    {
      name: '@BaoDienTu:app_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeSetting: state.themeSetting,
        themeMode: state.themeMode,
        fontSize: state.fontSize,
        articleFontSize: state.articleFontSize,
        articleFontFamily: state.articleFontFamily,
        articleLineHeight: state.articleLineHeight,
        showImages: state.showImages,
        wifiOnlyDownloads: state.wifiOnlyDownloads,
        bookmarkedIds: state.bookmarkedIds,
        offlineIds: state.offlineIds,
        subscriptions: state.subscriptions,
        weatherAutoLocation: state.weatherAutoLocation,
        weatherLocation: state.weatherLocation,
      }),
    }
  )
);

// Listen for device system theme appearance changes
Appearance.addChangeListener(({ colorScheme }) => {
  const store = useAppStore.getState();
  if (store.themeSetting === 'system') {
    const nextMode: ThemeMode = colorScheme === 'light' ? 'light' : 'dark';
    useAppStore.setState({ themeMode: nextMode });
  }
});
