import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Bell,
  Bookmark,
  ChevronRight,
  Clock3,
  Crown,
  Download,
  LogOut,
  Settings,
  X,
} from 'lucide-react-native';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import ReadingPreferencesSheet from '../../components/Reading/ReadingPreferencesSheet';
import { Article, Category } from '../../types/content';
import { apiClient } from '../../services/api/client';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;
const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
];

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {
    bookmarkedIds,
    getColors,
    logout,
    offlineIds,
    setUser,
    user,
  } = useAppStore();
  const colors = getColors();
  const [showSettings, setShowSettings] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Category[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      localDB.getRecentArticles().then(setRecentArticles);
      if (user) {
        Promise.allSettled([
          apiClient.getUserPreferences(),
          apiClient.getUnreadNotificationCount(),
        ]).then(([preferenceResult, unreadResult]) => {
          if (preferenceResult.status === 'fulfilled') {
            setSelectedTopics(preferenceResult.value.data.selectedTopics);
          }
          if (unreadResult.status === 'fulfilled') {
            setUnreadCount(unreadResult.value.data);
          }
        });
      }
    }, [user])
  );

  if (!user) {
    return null;
  }

  const persistAvatar = async (avatarValue: string) => {
    const response = await apiClient.updateMyAvatar(avatarValue);
    const updatedUser = { ...user, avatar: response.data.avatar };
    setUser(updatedUser);
    await localDB.saveUserSession(updatedUser);
    setShowAvatarPicker(false);
  };

  const updateAvatar = async (uri: string) => {
    if (savingAvatar) {
      return;
    }
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

  const clearCache = async () => {
    setClearingCache(true);
    try {
      await localDB.clearTransientCache();
      Alert.alert(
        'Đã dọn bộ nhớ đệm',
        'Dữ liệu thời tiết tạm đã được xóa. Bài offline và bài đã lưu vẫn được giữ nguyên.'
      );
    } finally {
      setClearingCache(false);
    }
  };

  const signOut = () => {
    setShowLogoutConfirmation(true);
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

  const isVip = user.role === 'VIP';
  const hasStaffWorkspace = ['AUTHOR', 'CENSOR', 'ADMIN'].includes(user.role);
  const workspaceTitle =
    user.role === 'AUTHOR'
      ? 'Không gian tác giả'
      : user.role === 'CENSOR'
        ? 'Bàn kiểm duyệt'
        : 'Trung tâm quản trị';
  const workspaceDescription =
    user.role === 'AUTHOR'
      ? 'Soạn bài, lưu bản nháp và theo dõi trạng thái kiểm duyệt.'
      : user.role === 'CENSOR'
        ? 'Đọc và xử lý các bài đang chờ xuất bản.'
        : 'Duyệt bài, quản lý xuất bản và phân quyền tài khoản.';
  const recentArticle = recentArticles[0];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.profileHeader}>
            <TouchableOpacity
              accessibilityLabel="Thay đổi ảnh đại diện"
              onPress={() => setShowAvatarPicker(true)}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.text }]}>
                  <Text
                    style={[styles.avatarLetter, { color: colors.background }]}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: colors.card }]}>
                <Camera color={colors.text} size={13} {...IC} />
              </View>
            </TouchableOpacity>

            <View style={styles.identity}>
              <Text style={[styles.name, { color: colors.text }]}>
                {user.name}
              </Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>
                {user.email}
              </Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: isVip ? '#FBF3DB' : '#E1F3FE' },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: isVip ? '#956400' : '#1F6C9F' },
                  ]}
                >
                  {user.role}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityLabel="Mở cài đặt"
              style={[styles.iconButton, { borderColor: colors.border }]}
              onPress={() => setShowSettings(true)}
            >
              <Settings color={colors.text} size={19} {...IC} />
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stats}>
            <View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                QUYỀN ĐỌC
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {isVip
                  ? 'Không giới hạn'
                  : `${user.freeArticlesLeft ?? 0} bài miễn phí`}
              </Text>
            </View>
            {user.vipExpiryDate && (
              <View style={styles.expiry}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  HẾT HẠN VIP
                </Text>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {new Date(user.vipExpiryDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {hasStaffWorkspace && (
          <TouchableOpacity
            activeOpacity={0.78}
            style={[
              styles.staffWorkspaceCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate('StaffWorkspace')}
          >
            <Text style={[styles.staffEyebrow, { color: colors.primary }]}>
              THE DAILY DESK
            </Text>
            <Text style={[styles.staffTitle, { color: colors.text }]}>
              {workspaceTitle}
            </Text>
            <Text style={[styles.staffDescription, { color: colors.textMuted }]}>
              {workspaceDescription}
            </Text>
            <View
              style={[styles.staffAction, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.staffActionText, { color: colors.primary }]}>
                Mở khu vực tác nghiệp
              </Text>
              <Text style={[styles.staffArrow, { color: colors.primary }]}>→</Text>
            </View>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.personalCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
                KHÔNG GIAN CỦA BẠN
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Đọc tiếp và quản lý
              </Text>
            </View>
          </View>

          <View style={[styles.quickGrid, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.quickItem,
                styles.quickItemDivider,
                { borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate('LibraryTab', { initialSection: 'saved' })
              }
            >
              <Bookmark color={colors.primary} size={20} {...IC} />
              <Text style={[styles.quickCount, { color: colors.text }]}>
                {bookmarkedIds.length}
              </Text>
              <Text style={[styles.quickLabel, { color: colors.textMuted }]}>
                Đã lưu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickItem,
                styles.quickItemDivider,
                { borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate('LibraryTab', {
                  initialSection: 'downloaded',
                })
              }
            >
              <Download color={colors.secondary} size={20} {...IC} />
              <Text style={[styles.quickCount, { color: colors.text }]}>
                {offlineIds.length}
              </Text>
              <Text style={[styles.quickLabel, { color: colors.textMuted }]}>
                Offline
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.quickItem,
                { borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate('LibraryTab', {
                  initialSection: 'history',
                })
              }
            >
              <Clock3 color={colors.warning} size={20} {...IC} />
              <Text style={[styles.quickCount, { color: colors.text }]}>
                {recentArticles.length}
              </Text>
              <Text style={[styles.quickLabel, { color: colors.textMuted }]}>
                Lịch sử
              </Text>
            </TouchableOpacity>
          </View>

          {recentArticle && (
            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.continueRow, { borderTopColor: colors.border }]}
              onPress={() =>
                navigation.navigate('ArticleDetail', {
                  articleId: recentArticle.id,
                  articleType: recentArticle.type,
                })
              }
            >
              <View
                style={[
                  styles.continueIcon,
                  { backgroundColor: colors.background },
                ]}
              >
                <Clock3 color={colors.primary} size={18} {...IC} />
              </View>
              <View style={styles.continueCopy}>
                <Text style={[styles.continueLabel, { color: colors.textMuted }]}>
                  ĐỌC TIẾP
                </Text>
                <Text
                  style={[styles.continueTitle, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {recentArticle.title}
                </Text>
              </View>
              <ChevronRight color={colors.textMuted} size={18} {...IC} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.78}
          style={[
            styles.followingCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={styles.followingHeader}>
            <View>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>
                DÒNG TIN CÁ NHÂN
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Chủ đề của bạn
              </Text>
            </View>
            <View style={styles.notificationSummary}>
              <Bell color={colors.primary} size={17} {...IC} />
              {unreadCount > 0 && (
                <View style={styles.notificationCount}>
                  <Text style={styles.notificationCountText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {selectedTopics.length > 0 ? (
            <View style={styles.topicPreview}>
              {selectedTopics.slice(0, 5).map((topic) => (
                <View
                  key={topic.id}
                  style={[
                    styles.topicBadge,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.topicBadgeText, { color: colors.text }]}>
                    {topic.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.followingEmpty,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Bell color={colors.textMuted} size={22} {...IC} />
              <View style={styles.followingEmptyCopy}>
                <Text style={[styles.followingName, { color: colors.text }]}>
                  Chưa chọn chủ đề
                </Text>
                <Text style={[styles.followingHint, { color: colors.textMuted }]}>
                  Chọn Công nghệ, Đời sống hoặc chủ đề bạn muốn nhận tin.
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.topicAction, { borderTopColor: colors.border }]}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>
              Quản lý chủ đề và thông báo
            </Text>
            <ChevronRight color={colors.primary} size={18} {...IC} />
          </View>
        </TouchableOpacity>

        {!isVip && (
          <TouchableOpacity
            activeOpacity={0.84}
            style={[
              styles.vipUpgradeCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => navigation.navigate('VipPackages')}
          >
            <View style={styles.vipUpgradeTop}>
              <View style={styles.vipIconBox}>
                <Crown color="#956400" size={19} {...IC} />
              </View>
              <Text style={styles.vipEyebrow}>THE DAILY VIP</Text>
            </View>
            <Text style={[styles.vipUpgradeTitle, { color: colors.text }]}>
              Nâng cấp trải nghiệm đọc
            </Text>
            <Text
              style={[styles.vipUpgradeDescription, { color: colors.textMuted }]}
            >
              Đọc bài VIP không giới hạn và sử dụng tính năng tóm tắt bằng AI.
            </Text>
            <View style={[styles.vipUpgradeAction, { borderTopColor: colors.border }]}>
              <Text style={[styles.vipUpgradeActionText, { color: colors.primary }]}>
                Xem các gói thành viên
              </Text>
              <ChevronRight color={colors.primary} size={18} {...IC} />
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.logoutButton, { borderColor: colors.border }]}
          onPress={signOut}
        >
          <LogOut color={colors.danger} size={17} {...IC} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>
            Đăng xuất
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ReadingPreferencesSheet
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onClearCache={clearCache}
        clearingCache={clearingCache}
      />

      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Ảnh đại diện
              </Text>
              <TouchableOpacity
                accessibilityLabel="Đóng chọn ảnh"
                onPress={() => setShowAvatarPicker(false)}
              >
                <X color={colors.text} size={20} {...IC} />
              </TouchableOpacity>
            </View>
            <View style={styles.avatarGrid}>
              {DEFAULT_AVATARS.map((uri) => (
                <TouchableOpacity
                  key={uri}
                  style={[
                    styles.avatarChoice,
                    {
                      borderColor: user.avatar === uri ? colors.text : colors.border,
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
              style={[
                styles.devicePhotoButton,
                {
                  backgroundColor: colors.text,
                  opacity: savingAvatar ? 0.7 : 1,
                },
              ]}
              disabled={savingAvatar}
              onPress={pickAvatarFromDevice}
            >
              {savingAvatar ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Camera color={colors.background} size={17} {...IC} />
              )}
              <Text
                style={[styles.devicePhotoText, { color: colors.background }]}
              >
                Chọn ảnh từ thiết bị
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppActionSheet
        visible={showLogoutConfirmation}
        eyebrow="TÀI KHOẢN"
        title="Đăng xuất khỏi thiết bị?"
        description="Phiên đăng nhập sẽ kết thúc. Các bài đã lưu và bài đọc offline vẫn được giữ trên thiết bị này."
        primaryLabel="Đăng xuất"
        secondaryLabel="Ở lại"
        tone="danger"
        loading={signingOut}
        onPrimary={confirmSignOut}
        onClose={() => setShowLogoutConfirmation(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  profileCard: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: F_SERIF,
    fontSize: 28,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  identity: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontFamily: F_SERIF,
    fontSize: 21,
    fontWeight: '700',
  },
  email: {
    marginTop: 3,
    fontSize: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  staffWorkspaceCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingTop: 19,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  staffEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  staffTitle: {
    marginTop: 7,
    fontFamily: F_SERIF,
    fontSize: 21,
    fontWeight: '700',
  },
  staffDescription: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
  },
  staffAction: {
    minHeight: 48,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  staffActionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  staffArrow: {
    fontSize: 19,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  stats: {
    flexDirection: 'row',
  },
  expiry: {
    marginLeft: 36,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  statValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  personalCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    marginTop: 3,
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
  },
  quickGrid: {
    marginTop: 14,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EAEAEA',
  },
  quickItem: {
    flex: 1,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  quickItemDivider: {
    borderRightWidth: 1,
  },
  quickCount: {
    marginTop: 8,
    fontFamily: F_SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  quickLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  continueRow: {
    marginTop: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  continueIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  continueCopy: {
    flex: 1,
    marginHorizontal: 10,
  },
  continueLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  continueTitle: {
    marginTop: 3,
    fontFamily: F_SERIF,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  followingCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  followingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  seeAll: {
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  notificationSummary: {
    minWidth: 42,
    height: 34,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 6,
  },
  notificationCount: {
    minWidth: 16,
    height: 16,
    marginLeft: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#9F2F2D',
  },
  notificationCountText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  topicPreview: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicBadge: {
    marginRight: 7,
    marginBottom: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 5,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topicAction: {
    marginTop: 10,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  followingRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
  },
  followingAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  followingInitial: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
  },
  followingCopy: {
    flex: 1,
    marginLeft: 10,
  },
  followingName: {
    fontFamily: F_SERIF,
    fontSize: 14,
    fontWeight: '700',
  },
  followingHint: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
  },
  followingEmpty: {
    minHeight: 68,
    marginTop: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  followingEmptyCopy: {
    flex: 1,
    marginHorizontal: 11,
  },
  vipUpgradeCard: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  vipUpgradeTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipIconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF3DB',
    borderRadius: 6,
  },
  vipEyebrow: {
    marginLeft: 10,
    color: '#956400',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  vipUpgradeTitle: {
    marginTop: 14,
    fontFamily: F_SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  vipUpgradeDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
  },
  vipUpgradeAction: {
    marginTop: 14,
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  vipUpgradeActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    height: 44,
    marginTop: 20,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,17,17,0.35)',
  },
  sheet: {
    maxHeight: '86%',
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetHeader: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
  },
  settingRow: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  fontSetting: {
    padding: 18,
    borderBottomWidth: 1,
  },
  fontOptions: {
    marginTop: 14,
    flexDirection: 'row',
  },
  fontOption: {
    flex: 1,
    height: 38,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
  },
  fontOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearCacheRow: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  version: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
  },
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
    borderWidth: 2,
    borderRadius: 8,
  },
  avatarChoiceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  devicePhotoButton: {
    height: 44,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  devicePhotoText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
});
