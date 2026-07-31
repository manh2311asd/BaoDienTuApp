import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api/client';
import { Category, NewsNotification } from '../../types/content';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast/ToastContext';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const isToday = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (isToday(value)) {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function NotificationsScreen({ navigation }: any) {
  const colors = useAppStore((state) => state.getColors());
  const showImages = useAppStore((state) => state.showImages);
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NewsNotification[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadData = useCallback(
    async (refresh = false) => {
      refresh ? setRefreshing(true) : setLoading(true);
      const [notificationResult, categoryResult, preferenceResult] =
        await Promise.allSettled([
          apiClient.getNotifications(),
          apiClient.getCategories(),
          apiClient.getUserPreferences(),
        ]);

      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value.data);
      } else {
        showToast(
          notificationResult.reason instanceof Error
            ? notificationResult.reason.message
            : 'Không thể tải thông báo'
        );
      }
      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value.data);
      }
      if (preferenceResult.status === 'fulfilled') {
        setSelectedTopicIds(
          preferenceResult.value.data.selectedTopics.map((topic) => topic.id)
        );
        setNotificationsEnabled(
          preferenceResult.value.data.pushNotificationsEnabled
        );
      }
      setLoading(false);
      setRefreshing(false);
    },
    [showToast]
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const savePreferences = async (
    topicIds: number[],
    enabled: boolean
  ) => {
    setSavingPreferences(true);
    try {
      const response = await apiClient.updateUserPreferences(topicIds, enabled);
      setSelectedTopicIds(
        response.data.selectedTopics.map((topic) => topic.id)
      );
      setNotificationsEnabled(response.data.pushNotificationsEnabled);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Không thể lưu lựa chọn của bạn'
      );
      await loadData(true);
    } finally {
      setSavingPreferences(false);
    }
  };

  const toggleTopic = (categoryId: number) => {
    if (savingPreferences) {
      return;
    }
    const nextIds = selectedTopicIds.includes(categoryId)
      ? selectedTopicIds.filter((id) => id !== categoryId)
      : [...selectedTopicIds, categoryId];
    setSelectedTopicIds(nextIds);
    savePreferences(nextIds, notificationsEnabled);
  };

  const toggleNotifications = (enabled: boolean) => {
    if (savingPreferences) {
      return;
    }
    setNotificationsEnabled(enabled);
    savePreferences(selectedTopicIds, enabled);
  };

  const markAllRead = async () => {
    if (!notifications.some((item) => !item.read) || markingAll) {
      return;
    }
    setMarkingAll(true);
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true }))
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Không thể đánh dấu đã đọc'
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (notification: NewsNotification) => {
    if (!notification.read) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
      apiClient.markNotificationRead(notification.id).catch(() => undefined);
    }
    navigation.navigate('ArticleDetail', {
      articleId: notification.articleId,
      articleType: notification.articleType,
    });
  };

  const listHeader = (
    <>
      <View
        style={[
          styles.preferenceSection,
          { borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.preferenceHeadingRow}>
          <View style={styles.preferenceCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              DÒNG TIN CỦA BẠN
            </Text>
            <Text style={[styles.preferenceTitle, { color: colors.text }]}>
              Chọn chủ đề quan tâm
            </Text>
            <Text
              style={[styles.preferenceDescription, { color: colors.textMuted }]}
            >
              Chỉ nhận bài mới thuộc những chủ đề bạn thật sự muốn đọc.
            </Text>
          </View>
          <ActivityIndicator
            animating={savingPreferences}
            color={colors.primary}
            size="small"
          />
        </View>

        <View style={styles.topicGrid}>
          {categories.map((category) => {
            const selected = selectedTopicIds.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                activeOpacity={0.76}
                style={[
                  styles.topicChip,
                  {
                    borderColor: selected ? colors.text : colors.border,
                    backgroundColor: selected ? colors.text : colors.card,
                  },
                ]}
                onPress={() => toggleTopic(category.id)}
              >
                <Text
                  style={[
                    styles.topicText,
                    { color: selected ? colors.background : colors.textMuted },
                  ]}
                >
                  {selected ? '✓  ' : ''}
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            styles.notificationSwitchRow,
            { borderTopColor: colors.border },
          ]}
        >
          <View style={styles.switchCopy}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>
              Nhận tin theo chủ đề
            </Text>
            <Text style={[styles.switchHint, { color: colors.textMuted }]}>
              Tin nóng quan trọng vẫn được ưu tiên trong hộp thư.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            disabled={savingPreferences}
            trackColor={{ false: colors.border, true: '#BFDDF0' }}
            thumbColor={notificationsEnabled ? colors.primary : '#F5F5F5'}
          />
        </View>
      </View>

      <View style={styles.inboxHeading}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            HỘP THƯ
          </Text>
          <Text style={[styles.inboxTitle, { color: colors.text }]}>
            Tin dành cho bạn
          </Text>
        </View>
        <TouchableOpacity onPress={markAllRead} disabled={markingAll}>
          <Text style={[styles.markAllText, { color: colors.primary }]}>
            {markingAll ? 'Đang lưu…' : 'Đọc tất cả'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backGlyph, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Thông báo</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Tin mới, phản hồi và quyền thành viên
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={listHeader}
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const previous = index > 0 ? notifications[index - 1] : null;
            const showGroup =
              index === 0 || (previous && isToday(previous.createdAt) !== isToday(item.createdAt));
            return (
              <View>
                {showGroup && (
                  <Text
                    style={[styles.dayLabel, { color: colors.textMuted }]}
                  >
                    {isToday(item.createdAt) ? 'HÔM NAY' : 'TRƯỚC ĐÓ'}
                  </Text>
                )}
                <TouchableOpacity
                  activeOpacity={0.78}
                  style={[
                    styles.notificationRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: item.read
                        ? colors.background
                        : colors.card,
                    },
                  ]}
                  onPress={() => openNotification(item)}
                >
                  <View style={styles.unreadColumn}>
                    {!item.read && (
                      <View
                        style={[
                          styles.unreadDot,
                          { backgroundColor: colors.primary },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.notificationCopy}>
                    <View style={styles.notificationMeta}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          { color: colors.primary },
                        ]}
                      >
                        {item.categoryName.toUpperCase()}
                      </Text>
                      <Text style={[styles.time, { color: colors.textMuted }]}>
                        {formatNotificationTime(item.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.notificationTitle,
                        {
                          color: colors.text,
                          fontWeight: item.read ? '600' : '700',
                        },
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.notificationMessage,
                        { color: colors.textMuted },
                      ]}
                    >
                      {item.message}
                    </Text>
                  </View>
                  {showImages && item.articleImage ? (
                    <Image
                      source={{ uri: item.articleImage }}
                      style={styles.thumbnail}
                    />
                  ) : (
                    <View
                      style={[
                        styles.thumbnail,
                        styles.thumbnailFallback,
                        { backgroundColor: colors.card },
                      ]}
                    >
                      <Text
                        style={[
                          styles.thumbnailLetter,
                          { color: colors.textMuted },
                        ]}
                      >
                        T
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyMark, { color: colors.textMuted }]}>
                —
              </Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Chưa có thông báo
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                Chọn vài chủ đề phía trên. Tin phù hợp sẽ xuất hiện tại đây.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  backGlyph: {
    marginTop: -3,
    fontFamily: F_SERIF,
    fontSize: 34,
    lineHeight: 36,
  },
  headerCopy: {
    flex: 1,
    marginHorizontal: 14,
  },
  title: {
    fontFamily: F_SERIF,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  headerSpacer: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  preferenceSection: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  preferenceHeadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  preferenceCopy: {
    flex: 1,
    paddingRight: 14,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  preferenceTitle: {
    marginTop: 5,
    fontFamily: F_SERIF,
    fontSize: 21,
    fontWeight: '700',
  },
  preferenceDescription: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
  },
  topicGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    minHeight: 36,
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notificationSwitchRow: {
    minHeight: 66,
    marginTop: 8,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 16,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchHint: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
  },
  inboxHeading: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  inboxTitle: {
    marginTop: 4,
    fontFamily: F_SERIF,
    fontSize: 20,
    fontWeight: '700',
  },
  markAllText: {
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  dayLabel: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 5,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  notificationRow: {
    minHeight: 104,
    paddingVertical: 14,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  unreadColumn: {
    width: 18,
    alignItems: 'center',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  notificationCopy: {
    flex: 1,
    paddingRight: 12,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLabel: {
    flex: 1,
    paddingRight: 10,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  time: {
    fontSize: 9,
  },
  notificationTitle: {
    marginTop: 5,
    fontFamily: F_SERIF,
    fontSize: 15,
    lineHeight: 19,
  },
  notificationMessage: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  thumbnail: {
    width: 66,
    height: 66,
    borderRadius: 6,
  },
  thumbnailFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLetter: {
    fontFamily: F_SERIF,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyState: {
    paddingHorizontal: 44,
    paddingVertical: 44,
    alignItems: 'center',
  },
  emptyMark: {
    fontFamily: F_SERIF,
    fontSize: 30,
  },
  emptyTitle: {
    marginTop: 8,
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHint: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
  },
});
