import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { BookOpen, Compass, House, UserCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, Text } from 'react-native';
import { appTheme, mainShellTheme } from '../theme/colors';

// Import screens
import HomeScreen from '../screens/Home/HomeScreen';
import LibraryScreen from '../screens/Library/LibraryScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import VipPackagesScreen from '../screens/VipPackages/VipPackagesScreen';
import ArticleDetailScreen from '../screens/ArticleDetail/ArticleDetailScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import UtilitiesScreen from '../screens/Utilities/UtilitiesScreen';
import FootballScreen from '../screens/Football/FootballScreen';
import FinanceScreen from '../screens/Finance/FinanceScreen';
import LotteryScreen from '../screens/Lottery/LotteryScreen';
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
import ArticleWebViewScreen from '../screens/ArticleWebView/ArticleWebViewScreen';
import PressReviewScreen from '../screens/Explore/PressReviewScreen';
import FontTypographySettingsScreen from '../screens/Settings/FontTypographySettingsScreen';
import AppearanceSettingsScreen from '../screens/Settings/AppearanceSettingsScreen';
import DownloadDataSettingsScreen from '../screens/Settings/DownloadDataSettingsScreen';
import PublicUserProfileScreen from '../screens/PublicUserProfile/PublicUserProfileScreen';

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
  Football: undefined;
  Finance: undefined;
  Lottery: undefined;
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
        name="Football"
        component={FootballScreen}
        options={{ title: 'Bóng đá', headerShown: false }}
      />
      <Stack.Screen
        name="Finance"
        component={FinanceScreen}
        options={{ title: 'Tài chính', headerShown: false }}
      />
      <Stack.Screen
        name="Lottery"
        component={LotteryScreen}
        options={{ title: 'Xổ số', headerShown: false }}
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
