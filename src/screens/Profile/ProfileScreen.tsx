import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Camera,
  ChevronRight,
  CircleUserRound,
  Crown,
  Database,
  Download,
  FileText,
  HelpCircle,
  History,
  Info,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Palette,
  Settings,
  Tags,
  Type,
  Users,
  X,
} from 'lucide-react-native';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import { apiClient } from '../../services/api/client';
import { mainShellTheme } from '../../theme/colors';
import { getMembershipDisplay } from './profileUi';
import type { RootStackParamList, TabParamList } from '../../navigation/RootNavigator';
import { READING_EXPERIENCE_ROUTES } from '../Settings/readingSettingsUi';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;
const PROFILE_LOCAL_TTL = 5 * 60 * 1000;

interface ProfileLocalCache {
  savedAt: number;
  topicCount: number | null;
}

interface InfoSheetState {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  onPrimary?: () => void;
}

interface ProfileRow {
  key: string;
  title: string;
  supporting?: string;
  icon: React.ReactNode;
  iconBackground: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

type ProfileNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'ProfileTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

let profileLocalCache: ProfileLocalCache | null = null;

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ProfileNavigation>();
  const {
    bookmarkedIds,
    logout,
    offlineIds,
    setSubscriptions,
    setUser,
    subscriptions,
    themeMode,
    user,
  } = useAppStore();
  const shell = mainShellTheme[themeMode];
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [infoSheet, setInfoSheet] = useState<InfoSheetState | null>(null);
  const [initialLoading, setInitialLoading] = useState(!profileLocalCache);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [profileDataError, setProfileDataError] = useState(false);
  const [topicCount, setTopicCount] = useState<number | null>(
    profileLocalCache?.topicCount ?? null
  );

  const loadProfileData = useCallback(
    async (force = false, pullRefresh = false) => {
      const cached = profileLocalCache;
      if (cached) {
        setTopicCount(cached.topicCount);
      }

      const cacheFresh =
        cached && Date.now() - cached.savedAt < PROFILE_LOCAL_TTL;
      if (!force && cacheFresh) {
        setInitialLoading(false);
        return;
      }

      if (!cached) setInitialLoading(true);
      else if (!pullRefresh) setBackgroundFetching(true);

      const [preferenceResult, subscriptionResult] = await Promise.allSettled([
        apiClient.getUserPreferences(),
        apiClient.getMySubscriptions(),
      ]);
      const nextTopicCount =
        preferenceResult.status === 'fulfilled'
          ? preferenceResult.value.data.selectedTopics.length
          : cached?.topicCount ?? null;
      const remoteFailed =
        preferenceResult.status === 'rejected' ||
        subscriptionResult.status === 'rejected';

      if (subscriptionResult.status === 'fulfilled') {
        setSubscriptions(subscriptionResult.value.data);
      }

      profileLocalCache = {
        savedAt: remoteFailed ? Date.now() - PROFILE_LOCAL_TTL : Date.now(),
        topicCount: nextTopicCount,
      };
      setTopicCount(nextTopicCount);
      setProfileDataError(remoteFailed);
      setInitialLoading(false);
      setBackgroundFetching(false);
    },
    [setSubscriptions]
  );

  useFocusEffect(
    useCallback(() => {
      loadProfileData(false).catch(() => {
        setInitialLoading(false);
        setBackgroundFetching(false);
        setProfileDataError(true);
      });
    }, [loadProfileData])
  );

  if (!user) return null;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadProfileData(true, true);
    } finally {
      setRefreshing(false);
    }
  };

  const persistAvatar = async (avatarValue: string) => {
    const response = await apiClient.updateMyAvatar(avatarValue);
    const updatedUser = { ...user, avatar: response.data.avatar };
    setUser(updatedUser);
    await localDB.saveUserSession(updatedUser);
    setShowAvatarPicker(false);
  };

  const updateAvatar = async (uri: string) => {
    if (savingAvatar) return;
    setSavingAvatar(true);
    try {
      await persistAvatar(uri);
    } catch (error: any) {
      Alert.alert(
        'Chưa lưu được ảnh đại diện',
        error?.message || 'Vui lòng kiểm tra kết nối rồi thử lại.'
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const pickAvatarFromDevice = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Cần quyền truy cập ảnh',
        'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để chọn ảnh đại diện.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setSavingAvatar(true);
      try {
        const upload = await apiClient.uploadArticleImage(
          asset.uri,
          asset.mimeType || 'image/jpeg',
          asset.fileName || `avatar-${user.id}.jpg`
        );
        await persistAvatar(upload.data.path);
      } catch (error: any) {
        Alert.alert(
          'Chưa lưu được ảnh đại diện',
          error?.message || 'Vui lòng kiểm tra kết nối rồi thử lại.'
        );
      } finally {
        setSavingAvatar(false);
      }
    }
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    try {
      await localDB.clearUserSession();
      setShowLogoutConfirmation(false);
      logout();
    } finally {
      setSigningOut(false);
    }
  };

  const openInfoSheet = (sheet: InfoSheetState) => setInfoSheet(sheet);
  const runInfoSheetAction = () => {
    const action = infoSheet?.onPrimary;
    setInfoSheet(null);
    if (action) setTimeout(action, 180);
  };

  const openAccountSettings = () =>
    openInfoSheet({
      eyebrow: 'TÀI KHOẢN',
      title: 'Thông tin hồ sơ',
      description: `${user.name}\n${user.email}\n\nBạn có thể thay ảnh đại diện. Họ tên, email và mật khẩu chưa hỗ trợ chỉnh sửa trong phiên bản hiện tại.`,
      primaryLabel: 'Đổi ảnh đại diện',
      onPrimary: () => setShowAvatarPicker(true),
    });

  const membership = getMembershipDisplay(user.role, user.vipExpiryDate);
  const hasActiveVip = membership.state === 'active';
  const hasStaffWorkspace = ['AUTHOR', 'CENSOR', 'ADMIN'].includes(user.role);
  const followedAuthorCount = subscriptions.filter(
    (item) => item.targetType === 'AUTHOR'
  ).length;

  const membershipStatus =
    membership.state === 'expired'
      ? 'Đã hết hạn'
      : membership.state === 'active'
        ? 'VIP đang hoạt động'
        : 'Chưa đăng ký';
  const membershipMeta =
    membership.state === 'expired'
      ? membership.formattedExpiry
      : membership.state === 'active' && membership.formattedExpiry
        ? `Đến ${membership.formattedExpiry}`
        : null;
  const membershipAction =
    membership.state === 'expired'
      ? 'Gia hạn'
      : membership.state === 'active'
        ? 'Quản lý'
        : 'Xem các gói';
  const membershipStatusBackground =
    membership.state === 'expired'
      ? shell.appErrorContainer
      : membership.state === 'active'
        ? shell.appSecondaryContainer
        : shell.appSurfaceMuted;
  const membershipStatusColor =
    membership.state === 'expired'
      ? shell.appError
      : membership.state === 'active'
        ? shell.appSuccess
        : shell.appTextSecondary;

  const topicSupporting = initialLoading
    ? 'Đang cập nhật'
    : topicCount == null
      ? 'Chưa thể cập nhật'
      : topicCount === 0
        ? 'Chưa thiết lập'
        : `${topicCount} chủ đề đã chọn`;
  const authorSupporting =
    initialLoading && subscriptions.length === 0
      ? 'Đang cập nhật'
      : profileDataError && subscriptions.length === 0
        ? 'Chưa thể cập nhật'
        : followedAuthorCount === 0
          ? 'Chưa theo dõi tác giả'
          : `${followedAuthorCount} tác giả`;

  const readingRows: ProfileRow[] = [
    {
      key: 'saved',
      title: 'Bài đã lưu',
      supporting: `${bookmarkedIds.length} bài`,
      icon: <Bookmark color={shell.appBlueIcon} size={18} {...IC} />,
      iconBackground: shell.appBlueContainer,
      onPress: () =>
        navigation.navigate('LibraryTab', { initialSection: 'saved' }),
    },
    {
      key: 'offline',
      title: 'Bài offline',
      supporting: `${offlineIds.length} bài`,
      icon: <Download color={shell.appSageIcon} size={18} {...IC} />,
      iconBackground: shell.appSecondaryContainer,
      onPress: () =>
        navigation.navigate('LibraryTab', { initialSection: 'downloaded' }),
    },
    {
      key: 'history',
      title: 'Lịch sử đọc',
      supporting: 'Các bài đã xem gần đây',
      icon: <History color={shell.appPrimary} size={18} {...IC} />,
      iconBackground: shell.appPrimaryContainer,
      onPress: () =>
        navigation.navigate('LibraryTab', { initialSection: 'history' }),
    },
  ];

  const personalizationRows: ProfileRow[] = [
    {
      key: 'topics',
      title: 'Chủ đề quan tâm',
      supporting: topicSupporting,
      icon: <Tags color={shell.appPrimary} size={18} {...IC} />,
      iconBackground: shell.appPrimaryContainer,
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      key: 'authors',
      title: 'Tác giả theo dõi',
      supporting: authorSupporting,
      icon: <Users color={shell.appSageIcon} size={18} {...IC} />,
      iconBackground: shell.appSecondaryContainer,
      onPress: () =>
        navigation.navigate('ExploreTab', { initialSection: 'journalists' }),
    },
  ];

  const accountRows: ProfileRow[] = [
    {
      key: 'account',
      title: 'Cài đặt tài khoản',
      supporting: 'Hồ sơ và ảnh đại diện',
      icon: <CircleUserRound color={shell.appTextSecondary} size={18} {...IC} />,
      iconBackground: shell.appBlueContainer,
      onPress: openAccountSettings,
    },
    {
      key: 'membership',
      title: 'Gói thành viên',
      supporting:
        membership.state === 'active' ? membershipStatus : 'Quyền lợi và thanh toán',
      icon: <Crown color={shell.appWarning} size={18} {...IC} />,
      iconBackground: shell.appYellowContainer,
      onPress: () => navigation.navigate('VipPackages'),
    },
    {
      key: 'notifications',
      title: 'Thông báo',
      supporting: 'Tin mới, bình luận và chủ đề',
      icon: <Bell color={shell.appPrimary} size={18} {...IC} />,
      iconBackground: shell.appPrimaryContainer,
      onPress: () => navigation.navigate('Notifications'),
    },
    ...(hasStaffWorkspace
      ? [
          {
            key: 'staff',
            title: 'Khu vực tác nghiệp',
            supporting: 'Bài viết, kiểm duyệt và quản trị',
            icon: (
              <BriefcaseBusiness color={shell.appSageIcon} size={18} {...IC} />
            ),
            iconBackground: shell.appSecondaryContainer,
            onPress: () => navigation.navigate('StaffWorkspace'),
          },
        ]
      : []),
  ];

  const readingExperienceRows: ProfileRow[] = [
    {
      key: 'font',
      title: 'Cỡ chữ và kiểu chữ',
      supporting: 'Nhỏ, mặc định, lớn và rất lớn',
      icon: <Type color={shell.appPrimary} size={18} {...IC} />,
      iconBackground: shell.appPrimaryContainer,
      accessibilityLabel: 'Mở cài đặt cỡ chữ và kiểu chữ',
      testID: 'profile-reading-font-settings',
      onPress: () => navigation.navigate(READING_EXPERIENCE_ROUTES.font),
    },
    {
      key: 'appearance',
      title: 'Giao diện',
      supporting: 'Sáng, tối hoặc theo hệ thống',
      icon: <Palette color={shell.appSageIcon} size={18} {...IC} />,
      iconBackground: shell.appSecondaryContainer,
      accessibilityLabel: 'Mở cài đặt giao diện',
      testID: 'profile-reading-appearance-settings',
      onPress: () => navigation.navigate(READING_EXPERIENCE_ROUTES.appearance),
    },
    {
      key: 'data',
      title: 'Tải xuống và dữ liệu',
      supporting: 'Ảnh bài viết và dữ liệu tạm',
      icon: <Database color={shell.appTextSecondary} size={18} {...IC} />,
      iconBackground: shell.appBlueContainer,
      accessibilityLabel: 'Mở cài đặt tải xuống và dữ liệu',
      testID: 'profile-reading-download-data-settings',
      onPress: () => navigation.navigate(READING_EXPERIENCE_ROUTES.data),
    },
  ];

  const privacyRows: ProfileRow[] = [
    {
      key: 'privacy',
      title: 'Quyền riêng tư và bảo mật',
      supporting: 'Phiên đăng nhập và quyền thông báo',
      icon: <LockKeyhole color={shell.appSageIcon} size={18} {...IC} />,
      iconBackground: shell.appSecondaryContainer,
      onPress: () =>
        openInfoSheet({
          eyebrow: 'QUYỀN RIÊNG TƯ',
          title: 'Dữ liệu và bảo mật',
          description:
            'Phiên đăng nhập được lưu bảo mật trên thiết bị. Bạn có thể quản lý quyền nhận tin trong màn Thông báo hoặc đăng xuất để xóa phiên hiện tại.',
          primaryLabel: 'Mở thông báo',
          onPrimary: () => navigation.navigate('Notifications'),
        }),
    },
    {
      key: 'help',
      title: 'Trợ giúp và phản hồi',
      supporting: 'Hướng dẫn sử dụng và báo lỗi',
      icon: <HelpCircle color={shell.appPrimary} size={18} {...IC} />,
      iconBackground: shell.appPrimaryContainer,
      onPress: () =>
        openInfoSheet({
          eyebrow: 'HỖ TRỢ',
          title: 'Trợ giúp và phản hồi',
          description:
            'Bản thử nghiệm hiện chưa kết nối kênh hỗ trợ trực tiếp. Khi gặp lỗi, hãy ghi lại màn hình và gửi cho nhóm phát triển.',
          primaryLabel: 'Đã hiểu',
        }),
    },
    {
      key: 'terms',
      title: 'Điều khoản và chính sách',
      supporting: 'Quyền sử dụng và chính sách nội dung',
      icon: <FileText color={shell.appTextSecondary} size={18} {...IC} />,
      iconBackground: shell.appBlueContainer,
      onPress: () =>
        openInfoSheet({
          eyebrow: 'CHÍNH SÁCH',
          title: 'Điều khoản sử dụng',
          description:
            'Ứng dụng đang ở giai đoạn thử nghiệm nội bộ. Tài liệu điều khoản chính thức chưa được cấu hình trong phiên bản này.',
          primaryLabel: 'Đã hiểu',
        }),
    },
    {
      key: 'about',
      title: 'Giới thiệu NewsDaily',
      supporting: 'Thông tin sản phẩm và phiên bản',
      icon: <Info color={shell.appWarning} size={18} {...IC} />,
      iconBackground: shell.appYellowContainer,
      onPress: () =>
        openInfoSheet({
          eyebrow: 'NEWSDAILY',
          title: 'Tin tức trong một trải nghiệm tập trung',
          description:
            'NewsDaily là ứng dụng đọc báo React Native dành cho nội dung nội bộ, bài nguồn ngoài, đọc offline và tiện ích hằng ngày.',
          primaryLabel: 'Đóng',
        }),
    },
  ];

  const renderSectionHeading = (eyebrow: string, title?: string) => (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionEyebrow, { color: shell.appPrimary }]}>
        {eyebrow}
      </Text>
      {!!title && (
        <Text style={[styles.sectionTitle, { color: shell.appTextPrimary }]}>
          {title}
        </Text>
      )}
    </View>
  );

  const renderRows = (rows: ProfileRow[]) => (
    <View
      style={[
        styles.group,
        { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
      ]}
    >
      {rows.map((row, index) => (
        <React.Fragment key={row.key}>
          <TouchableOpacity
            accessibilityLabel={row.accessibilityLabel || row.title}
            accessibilityRole="button"
            activeOpacity={0.72}
            style={styles.listRow}
            onPress={row.onPress}
            testID={row.testID}
          >
            <View
              style={[styles.rowIcon, { backgroundColor: row.iconBackground }]}
            >
              {row.icon}
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: shell.appTextPrimary }]}>
                {row.title}
              </Text>
              {!!row.supporting && (
                <Text style={[styles.rowMeta, { color: shell.appTextSecondary }]}>
                  {row.supporting}
                </Text>
              )}
            </View>
            <ChevronRight color={shell.appTextMuted} size={16} {...IC} />
          </TouchableOpacity>
          {index < rows.length - 1 && (
            <View
              style={[
                styles.indentedDivider,
                { backgroundColor: shell.appDivider },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: shell.appBackground }]}
    >
      <ScrollView
        style={{ backgroundColor: shell.appBackground }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 84 + insets.bottom },
        ]}
        accessibilityState={{
          busy: initialLoading || refreshing || backgroundFetching,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={shell.appPrimary}
            colors={[shell.appPrimary]}
            progressBackgroundColor={shell.appSurface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <View style={styles.headerCopy}>
            <Text style={[styles.screenTitle, { color: shell.appTextPrimary }]}>
              Cá nhân
            </Text>
            <Text style={[styles.screenSubtitle, { color: shell.appTextSecondary }]}>
              Quản lý tài khoản và trải nghiệm đọc
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Mở cài đặt giao diện"
            accessibilityRole="button"
            style={styles.settingsButton}
            onPress={() => navigation.navigate('AppearanceSettings')}
          >
            <View
              style={[styles.settingsVisual, { borderColor: shell.appBorder }]}
            >
              <Settings color={shell.appControlIcon} size={20} {...IC} />
            </View>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.identityCard,
            { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
          ]}
        >
          <View
            style={[styles.identityAccent, { backgroundColor: shell.appPrimary }]}
          />
          <View style={styles.identityTopRow}>
            <TouchableOpacity
              accessibilityLabel="Thay đổi ảnh đại diện"
              accessibilityRole="button"
              style={styles.avatarButton}
              onPress={() => setShowAvatarPicker(true)}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: shell.appPrimaryContainer },
                  ]}
                >
                  <Text style={[styles.avatarLetter, { color: shell.appSecondary }]}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: shell.appSurface,
                    borderColor: shell.appBorder,
                  },
                ]}
              >
                <Camera color={shell.appSecondary} size={12} {...IC} />
              </View>
            </TouchableOpacity>

            <View style={styles.identityCopy}>
              <Text style={[styles.name, { color: shell.appTextPrimary }]}>
                {user.name}
              </Text>
              <Text style={[styles.email, { color: shell.appTextSecondary }]}>
                {user.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: shell.appSecondaryContainer },
                ]}
              >
                <Text style={[styles.roleText, { color: shell.appSuccess }]}>
                  {user.role}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[styles.identityDetails, { borderTopColor: shell.appDivider }]}
          >
            <View style={styles.readingLimitColumn}>
              <Text style={[styles.detailLabel, { color: shell.appTextMuted }]}>
                BÀI MIỄN PHÍ CÒN LẠI
              </Text>
              <Text style={[styles.detailValue, { color: shell.appTextPrimary }]}>
                {hasActiveVip
                  ? 'Không giới hạn'
                  : `${user.freeArticlesLeft ?? 0} bài`}
              </Text>
            </View>
            <View
              style={[
                styles.membershipColumn,
                { borderLeftColor: shell.appDivider },
              ]}
            >
              <Text style={[styles.detailLabel, { color: shell.appTextMuted }]}>
                THÀNH VIÊN
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: membershipStatusBackground },
                ]}
              >
                <Text style={[styles.statusText, { color: membershipStatusColor }]}>
                  {membershipStatus}
                </Text>
              </View>
              {!!membershipMeta && (
                <Text style={[styles.membershipDate, { color: shell.appTextSecondary }]}>
                  {membershipMeta}
                </Text>
              )}
            </View>
          </View>

          <View
            style={[styles.profileActions, { borderTopColor: shell.appDivider }]}
          >
            <TouchableOpacity
              accessibilityRole="button"
              hitSlop={3}
              style={styles.profileActionButton}
              onPress={openAccountSettings}
            >
              <Text style={[styles.profileActionText, { color: shell.appTextPrimary }]}>
                Chỉnh sửa hồ sơ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              hitSlop={3}
              style={styles.profileActionButton}
              onPress={() => navigation.navigate('VipPackages')}
            >
              <Text style={[styles.profileActionText, { color: shell.appPrimary }]}>
                {membershipAction} →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.78}
          style={[
            styles.vipCard,
            {
              backgroundColor: shell.appYellowContainer,
              borderColor: shell.appVipBorder,
            },
          ]}
          onPress={() => navigation.navigate('VipPackages')}
        >
          <View style={styles.vipLabelRow}>
            <Crown color={shell.appWarning} size={17} {...IC} />
            <Text style={[styles.vipLabel, { color: shell.appWarning }]}>
              NEWSDAILY VIP
            </Text>
          </View>
          <Text
            numberOfLines={2}
            style={[styles.vipDescription, { color: shell.appTextPrimary }]}
          >
            {membership.state === 'active'
              ? membership.formattedExpiry
                ? `Gói của bạn đang hoạt động đến ${membership.formattedExpiry}.`
                : 'Gói của bạn đang hoạt động.'
              : 'Đọc không giới hạn và sử dụng các tính năng dành cho thành viên.'}
          </Text>
          <View style={styles.vipAction}>
            <Text style={[styles.vipActionText, { color: shell.appPrimary }]}>
              {membership.state === 'active' ? 'Quản lý gói' : 'Xem quyền lợi'}
            </Text>
            <ChevronRight color={shell.appPrimary} size={17} {...IC} />
          </View>
        </TouchableOpacity>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('KHÔNG GIAN CỦA BẠN', 'Đọc và quản lý')}
          {renderRows(readingRows)}
        </View>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('CÁ NHÂN HÓA')}
          {renderRows(personalizationRows)}
        </View>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('TÀI KHOẢN')}
          {renderRows(accountRows)}
        </View>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('TRẢI NGHIỆM ĐỌC')}
          {renderRows(readingExperienceRows)}
        </View>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('TIỆN ÍCH')}
          {renderRows([
            {
              key: 'utilities',
              title: 'Tiện ích mỗi ngày',
              supporting: 'Lịch, thể thao, tài chính và xổ số',
              icon: <LayoutGrid color={shell.appSageIcon} size={18} {...IC} />,
              iconBackground: shell.appSecondaryContainer,
              onPress: () => navigation.navigate('Utilities'),
            },
          ])}
        </View>

        <View style={styles.sectionBlock}>
          {renderSectionHeading('HỖ TRỢ')}
          {renderRows(privacyRows)}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.72}
          style={[
            styles.logoutRow,
            {
              backgroundColor: shell.appErrorContainer,
              borderColor: shell.appBorder,
            },
          ]}
          onPress={() => setShowLogoutConfirmation(true)}
        >
          <LogOut color={shell.appError} size={18} {...IC} />
          <Text style={[styles.logoutText, { color: shell.appError }]}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: shell.appOverlay }]}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
            ]}
          >
            <View
              style={[styles.sheetHeader, { borderBottomColor: shell.appDivider }]}
            >
              <Text style={[styles.sheetTitle, { color: shell.appTextPrimary }]}>
                Ảnh đại diện
              </Text>
              <TouchableOpacity
                accessibilityLabel="Đóng chọn ảnh"
                accessibilityRole="button"
                style={styles.sheetCloseButton}
                onPress={() => setShowAvatarPicker(false)}
              >
                <X color={shell.appTextPrimary} size={20} {...IC} />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarGrid}>
              {DEFAULT_AVATARS.map((uri) => (
                <TouchableOpacity
                  accessibilityLabel="Chọn ảnh đại diện có sẵn"
                  accessibilityRole="button"
                  key={uri}
                  style={[
                    styles.avatarChoice,
                    {
                      borderColor:
                        user.avatar === uri ? shell.appPrimary : shell.appBorder,
                      opacity: savingAvatar ? 0.55 : 1,
                    },
                  ]}
                  disabled={savingAvatar}
                  onPress={() => updateAvatar(uri)}
                >
                  <Image source={{ uri }} style={styles.avatarChoiceImage} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={[
                styles.devicePhotoButton,
                {
                  backgroundColor: shell.appPrimary,
                  opacity: savingAvatar ? 0.7 : 1,
                },
              ]}
              disabled={savingAvatar}
              onPress={pickAvatarFromDevice}
            >
              {savingAvatar ? (
                <ActivityIndicator color={shell.appOnPrimary} size="small" />
              ) : (
                <Camera color={shell.appOnPrimary} size={17} {...IC} />
              )}
              <Text style={[styles.devicePhotoText, { color: shell.appOnPrimary }]}>
                Chọn ảnh từ thiết bị
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppActionSheet
        visible={showLogoutConfirmation}
        eyebrow="TÀI KHOẢN"
        title="Đăng xuất khỏi tài khoản?"
        description="Bạn có thể đăng nhập lại bất cứ lúc nào."
        primaryLabel="Đăng xuất"
        secondaryLabel="Hủy"
        tone="danger"
        loading={signingOut}
        onPrimary={confirmSignOut}
        onClose={() => setShowLogoutConfirmation(false)}
      />

      <AppActionSheet
        visible={Boolean(infoSheet)}
        eyebrow={infoSheet?.eyebrow}
        title={infoSheet?.title || ''}
        description={infoSheet?.description || ''}
        primaryLabel={infoSheet?.primaryLabel || 'Đóng'}
        secondaryLabel="Để sau"
        onPrimary={runInfoSheetAction}
        onClose={() => setInfoSheet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 80 },
  screenHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 10 },
  screenTitle: {
    fontFamily: F_SERIF,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  screenSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  settingsButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsVisual: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  identityCard: {
    marginTop: 2,
    marginHorizontal: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 10,
  },
  identityAccent: {
    position: 'absolute',
    top: 0,
    left: 14,
    width: 30,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  identityTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatarButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: F_SERIF, fontSize: 23, fontWeight: '700' },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  name: {
    fontFamily: F_SERIF,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
  },
  email: { marginTop: 1, fontSize: 12, lineHeight: 16 },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleText: { fontSize: 9, lineHeight: 11, fontWeight: '800', letterSpacing: 0.45 },
  identityDetails: {
    marginTop: 7,
    paddingTop: 6,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  readingLimitColumn: { flex: 0.95, minWidth: 0, paddingRight: 8 },
  membershipColumn: {
    flex: 1.25,
    minWidth: 0,
    paddingLeft: 10,
    borderLeftWidth: 1,
  },
  detailLabel: { fontSize: 9, lineHeight: 11, fontWeight: '700', letterSpacing: 0.3 },
  detailValue: { marginTop: 2, fontSize: 13, lineHeight: 16, fontWeight: '700' },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusText: { fontSize: 9.5, lineHeight: 11, fontWeight: '700' },
  membershipDate: { marginTop: 2, fontSize: 10.5, lineHeight: 13 },
  profileActions: {
    marginTop: 4,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  profileActionButton: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  profileActionText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  vipCard: {
    marginTop: 10,
    marginHorizontal: 15,
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderWidth: 1,
    borderRadius: 10,
  },
  vipLabelRow: { flexDirection: 'row', alignItems: 'center' },
  vipLabel: { marginLeft: 7, fontSize: 9.5, lineHeight: 13, fontWeight: '800', letterSpacing: 0.55 },
  vipDescription: {
    marginTop: 6,
    maxWidth: 310,
    fontFamily: F_SERIF,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  vipAction: {
    minHeight: 30,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vipActionText: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  sectionBlock: { marginTop: 22 },
  sectionHeading: { marginHorizontal: 16, marginBottom: 8 },
  sectionEyebrow: { fontSize: 9.5, lineHeight: 12, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: {
    marginTop: 3,
    fontFamily: F_SERIF,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '700',
  },
  group: {
    marginHorizontal: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 10,
  },
  listRow: {
    minHeight: 56,
    paddingHorizontal: 13,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 10, paddingRight: 8 },
  rowTitle: { fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  rowMeta: { marginTop: 1, fontSize: 11, lineHeight: 15 },
  indentedDivider: { height: 1, marginLeft: 55, marginRight: 13 },
  logoutRow: {
    minHeight: 54,
    marginTop: 22,
    marginHorizontal: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  logoutText: { marginLeft: 10, fontSize: 13.5, lineHeight: 18, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '86%',
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetHeader: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  sheetTitle: { fontFamily: F_SERIF, fontSize: 19, fontWeight: '700' },
  sheetCloseButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatarGrid: {
    padding: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  avatarChoice: {
    width: '30%',
    aspectRatio: 1,
    marginBottom: 14,
    padding: 3,
    borderWidth: 1,
    borderRadius: 10,
  },
  avatarChoiceImage: { width: '100%', height: '100%', borderRadius: 7 },
  devicePhotoButton: {
    minHeight: 48,
    marginHorizontal: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  devicePhotoText: { marginLeft: 9, fontSize: 13, fontWeight: '800' },
});
