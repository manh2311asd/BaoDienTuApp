import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Compass, Home, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, lightColors } from '../theme/colors';

// Import screens
import HomeScreen from '../screens/Home/HomeScreen';
import LibraryScreen from '../screens/Library/LibraryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import VipPackagesScreen from '../screens/VipPackages/VipPackagesScreen';
import ArticleDetailScreen from '../screens/ArticleDetail/ArticleDetailScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import WeatherScreen from '../screens/Weather/WeatherScreen';
import WeatherSettingsScreen from '../screens/Weather/WeatherSettingsScreen';
import AuthorDetailScreen from '../screens/Author/AuthorDetailScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import StaffWorkspaceScreen from '../screens/Staff/StaffWorkspaceScreen';
import ArticleEditorScreen from '../screens/Staff/ArticleEditorScreen';
import ModerationReviewScreen from '../screens/Staff/ModerationReviewScreen';
import AdminUsersScreen from '../screens/Staff/AdminUsersScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  ArticleDetail: {
    articleId: number;
    isOffline?: boolean;
    articleType?: 'FREE' | 'VIP';
  };
  VipPackages: undefined;
  Calendar: undefined;
  Weather: undefined;
  WeatherSettings: undefined;
  AuthorDetail: { authorId: number; authorName: string };
  Notifications: undefined;
  StaffWorkspace: undefined;
  ArticleEditor: { articleId?: number } | undefined;
  ModerationReview: { articleId: number };
  AdminUsers: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ExploreTab: undefined;
  LibraryTab:
    | {
        initialSection?: 'saved' | 'downloaded' | 'history';
      }
    | undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const ProfileTabScreen = () => {
  const user = useAppStore((state) => state.user);
  return user ? <ProfileScreen /> : <LoginScreen />;
};

const TabNavigator = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const colors = themeMode === 'light' ? lightColors : darkColors;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // Hide navigation header for tabs to use custom branding headers
        tabBarIcon: ({ color }) => {
          const iconProps = {
            color,
            size: 24,
            strokeWidth: 2,
          };
          if (route.name === 'HomeTab') return <Home {...iconProps} />;
          if (route.name === 'ExploreTab') return <Compass {...iconProps} />;
          if (route.name === 'LibraryTab') return <BookOpen {...iconProps} />;
          return <User {...iconProps} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + (insets.bottom > 0 ? insets.bottom - 8 : 0),
          paddingBottom: 10 + (insets.bottom > 0 ? insets.bottom - 12 : 0),
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Trang chủ' }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{ title: 'Khám phá' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ title: 'Thư viện' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabScreen}
        options={{ title: 'Cá nhân' }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const colors = themeMode === 'light' ? lightColors : darkColors;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VipPackages"
        component={VipPackagesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Lịch',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Weather"
        component={WeatherScreen}
        options={{
          title: 'Thời tiết',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="WeatherSettings"
        component={WeatherSettingsScreen}
        options={{ title: 'Thời tiết: Cài đặt' }}
      />
      <Stack.Screen
        name="AuthorDetail"
        component={AuthorDetailScreen}
        options={{ title: 'Chi tiết tác giả', headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Thông báo', headerShown: false }}
      />
      <Stack.Screen
        name="StaffWorkspace"
        component={StaffWorkspaceScreen}
        options={{ title: 'Không gian tác nghiệp', headerShown: false }}
      />
      <Stack.Screen
        name="ArticleEditor"
        component={ArticleEditorScreen}
        options={{ title: 'Soạn bài', headerShown: false }}
      />
      <Stack.Screen
        name="ModerationReview"
        component={ModerationReviewScreen}
        options={{ title: 'Kiểm duyệt bài', headerShown: false }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: 'Quản lý người dùng', headerShown: false }}
      />
    </Stack.Navigator>
  );
};
