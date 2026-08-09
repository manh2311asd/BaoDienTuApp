import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Compass, House, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Text, ActivityIndicator, View } from 'react-native';
import { appTheme, mainShellTheme } from '../theme/colors';

// Import core screens (loaded statically for startup and navigation speed)
import HomeScreen from '../screens/Home/HomeScreen';
import LibraryScreen from '../screens/Library/LibraryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import ArticleDetailScreen from '../screens/ArticleDetail/ArticleDetailScreen';
import UtilitiesScreen from '../screens/Utilities/UtilitiesScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import ExploreScreen from '../screens/Explore/ExploreScreen';

// Lazy loading helper for non-critical screens to reduce startup parsing cost
const lazyScreen = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  const LazyComponent = React.lazy(importFunc);
  return (props: any) => (
    <React.Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1E6879" />
        </View>
      }
    >
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Lazy loaded screens
const VipPackagesScreen = lazyScreen(() => import('../screens/VipPackages/VipPackagesScreen'));
const CalendarScreen = lazyScreen(() => import('../screens/Calendar/CalendarScreen'));
const FinanceScreen = lazyScreen(() => import('../screens/Finance/FinanceScreen'));
const DayCounterScreen = lazyScreen(() => import('../screens/DayCounter/DayCounterScreen'));
const RemindersScreen = lazyScreen(() => import('../screens/Reminders/RemindersScreen'));
const QuickConverterScreen = lazyScreen(() => import('../screens/QuickConverter/QuickConverterScreen'));
const QuickCalculatorScreen = lazyScreen(() => import('../screens/QuickCalculator/QuickCalculatorScreen'));
const WeatherScreen = lazyScreen(() => import('../screens/Weather/WeatherScreen'));
const WeatherSettingsScreen = lazyScreen(() => import('../screens/Weather/WeatherSettingsScreen'));
const AuthorDetailScreen = lazyScreen(() => import('../screens/Author/AuthorDetailScreen'));
const NotificationsScreen = lazyScreen(() => import('../screens/Notifications/NotificationsScreen'));
const StaffWorkspaceScreen = lazyScreen(() => import('../screens/Staff/StaffWorkspaceScreen'));
const ArticleEditorScreen = lazyScreen(() => import('../screens/Staff/ArticleEditorScreen'));
const ModerationReviewScreen = lazyScreen(() => import('../screens/Staff/ModerationReviewScreen'));
const AdminUsersScreen = lazyScreen(() => import('../screens/Staff/AdminUsersScreen'));
const ArticleWebViewScreen = lazyScreen(() => import('../screens/ArticleWebView/ArticleWebViewScreen'));
const PressReviewScreen = lazyScreen(() => import('../screens/Explore/PressReviewScreen'));
const FontTypographySettingsScreen = lazyScreen(() => import('../screens/Settings/FontTypographySettingsScreen'));
const AppearanceSettingsScreen = lazyScreen(() => import('../screens/Settings/AppearanceSettingsScreen'));
const DownloadDataSettingsScreen = lazyScreen(() => import('../screens/Settings/DownloadDataSettingsScreen'));
const PublicUserProfileScreen = lazyScreen(() => import('../screens/PublicUserProfile/PublicUserProfileScreen'));

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  ArticleDetail: {
    articleId: number;
    isOffline?: boolean;
    articleType?: 'FREE' | 'VIP';
  };
  ArticleWebView: { url: string; title: string; sourceName?: string };
  VipPackages: undefined;
  Calendar: undefined;
  Utilities: undefined;

  Finance: undefined;
  DayCounter: undefined;
  Reminders: { title?: string; date?: string } | undefined;
  QuickConverter: undefined;
  QuickCalculator: undefined;
  Weather: undefined;
  WeatherSettings: undefined;
  AuthorDetail: { authorId: number; authorName: string };
  Notifications: undefined;
  StaffWorkspace: undefined;
  ArticleEditor: { articleId?: number } | undefined;
  ModerationReview: { articleId: number };
  AdminUsers: undefined;
  PressReview: undefined;
  FontTypographySettings: undefined;
  AppearanceSettings: undefined;
  DownloadDataSettings: undefined;
  PublicUserProfile: { userId: number };
};

export type TabParamList = {
  HomeTab: undefined;
  ExploreTab:
    | {
        initialSection?: 'latest' | 'journalists';
      }
    | undefined;
  LibraryTab:
    | {
        initialSection?: 'saved' | 'downloaded' | 'history';
      }
    | undefined;
  ProfileTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_LABELS: Record<keyof TabParamList, string> = {
  HomeTab: 'Trang chủ',
  ExploreTab: 'Khám phá',
  LibraryTab: 'Thư viện',
  ProfileTab: 'Cá nhân',
};

const ProfileTabScreen = () => {
  const user = useAppStore((state) => state.user);
  return user ? <ProfileScreen /> : <LoginScreen />;
};

function MainTabIcon({
  color,
  focused,
  routeName,
}: {
  color: string;
  focused: boolean;
  routeName: keyof TabParamList;
}) {
  const opacity = React.useRef(new Animated.Value(focused ? 1 : 0.82)).current;

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: focused ? 1 : 0.82,
      duration: 165,
      useNativeDriver: true,
    }).start();
  }, [focused, opacity]);

  const iconProps = {
    color,
    size: 23,
    weight: focused ? ('fill' as const) : ('regular' as const),
  };

  return (
    <Animated.View style={{ opacity }}>
      {routeName === 'HomeTab' ? (
        <House {...iconProps} />
      ) : routeName === 'ExploreTab' ? (
        <Compass {...iconProps} />
      ) : routeName === 'LibraryTab' ? (
        <BookOpen {...iconProps} />
      ) : (
        <UserCircle {...iconProps} />
      )}
    </Animated.View>
  );
}

const TabNavigator = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const insets = useSafeAreaInsets();
  const shell = mainShellTheme[themeMode];
  const bottomSafeArea = insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        freezeOnBlur: true,
        tabBarIcon: ({ color, focused }) => (
          <MainTabIcon color={color} focused={focused} routeName={route.name} />
        ),
        tabBarActiveTintColor: shell.appBottomActive,
        tabBarInactiveTintColor: shell.appBottomInactive,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: shell.appBottomBar,
          borderTopColor: shell.appBottomBorder,
          borderTopWidth: 1,
          height: 56 + bottomSafeArea,
          paddingBottom: Math.max(bottomSafeArea, 4),
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarLabel: ({ focused }) => (
          <Text
            numberOfLines={1}
            style={{
              color: focused
                ? shell.appBottomActiveText
                : shell.appBottomInactive,
              fontSize: 10,
              lineHeight: 12,
              marginTop: 3,
              fontWeight: focused ? '700' : '500',
            }}
          >
            {TAB_LABELS[route.name]}
          </Text>
        ),
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Trang chủ', tabBarAccessibilityLabel: 'Trang chủ' }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{ title: 'Khám phá', tabBarAccessibilityLabel: 'Khám phá' }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{ title: 'Thư viện', tabBarAccessibilityLabel: 'Thư viện' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileTabScreen}
        options={{ title: 'Cá nhân', tabBarAccessibilityLabel: 'Cá nhân' }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: shell.appHeader,
        },
        headerTintColor: shell.appHeaderText,
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
        name="Utilities"
        component={UtilitiesScreen}
        options={{ title: 'Tiện ích', headerShown: false }}
      />

      <Stack.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ title: 'Tài chính', headerShown: false }}
      />
      <Stack.Screen
        name="DayCounter"
        component={DayCounterScreen}
        options={{ title: 'Đếm ngày', headerShown: false }}
      />
      <Stack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ title: 'Nhắc việc', headerShown: false }}
      />
      <Stack.Screen
        name="QuickConverter"
        component={QuickConverterScreen}
        options={{ title: 'Chuyển đổi', headerShown: false }}
      />
      <Stack.Screen
        name="QuickCalculator"
        component={QuickCalculatorScreen}
        options={{ title: 'Máy tính', headerShown: false }}
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
      <Stack.Screen
        name="ArticleWebView"
        component={ArticleWebViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PressReview"
        component={PressReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FontTypographySettings"
        component={FontTypographySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        component={AppearanceSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DownloadDataSettings"
        component={DownloadDataSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PublicUserProfile"
        component={PublicUserProfileScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};
