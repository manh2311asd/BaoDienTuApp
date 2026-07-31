import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import { Article } from '../../types/content';

// Import split modular components directly from folder
import AuthorHeader from './AuthorHeader';
import AuthorProfile from './AuthorProfile';
import AuthorTimelineItem from './AuthorTimelineItem';
import { useToast } from '../../components/Toast/ToastContext';

const AuthorDetailScreen = ({ route, navigation }: any) => {
  const { authorId, authorName } = route.params;
  const {
    addSubscription,
    getColors,
    removeSubscription,
    setSubscriptions,
    subscriptions,
    user,
  } = useAppStore();
  const colors = getColors();
  const { showToast } = useToast();

  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const isFollowing = subscriptions.some(
    (item) => item.targetType === 'AUTHOR' && item.targetId === authorId
  );

  const fetchAuthorArticles = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.searchArticles(
        undefined,
        undefined,
        undefined,
        authorId
      );
      // Sort articles descending
      const sorted = [...res.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setArticles(sorted);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Không thể tải danh sách bài viết của tác giả.');
    } finally {
      setIsLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    fetchAuthorArticles();
  }, [fetchAuthorArticles]);

  useEffect(() => {
    if (!user) {
      setSubscriptions([]);
      return;
    }
    apiClient
      .getMySubscriptions()
      .then((response) => setSubscriptions(response.data))
      .catch(() => undefined);
  }, [setSubscriptions, user]);

  const toggleFollow = async () => {
    if (!user) {
      showToast('Đăng nhập để theo dõi nhà báo');
      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await apiClient.unsubscribeTopic('AUTHOR', authorId);
        removeSubscription('AUTHOR', authorId);
        showToast(`Đã bỏ theo dõi ${authorName}`);
      } else {
        const response = await apiClient.subscribeTopic('AUTHOR', authorId);
        addSubscription(response.data);
        showToast(`Đang theo dõi ${authorName}`);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật theo dõi lúc này'
      );
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const renderAuthorProfile = () => {
    return (
      <AuthorProfile
        authorName={authorName}
        articlesCount={articles.length}
        colors={colors}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onToggleFollow={toggleFollow}
      />
    );
  };

  const renderTimelineItem = (item: Article, index: number) => {
    return (
      <AuthorTimelineItem
        item={item}
        index={index}
        articlesLength={articles.length}
        colors={colors}
        user={user}
        formatDateTime={formatDateTime}
        navigation={navigation}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AuthorHeader navigation={navigation} colors={colors} />

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={fetchAuthorArticles}>
            <Text style={styles.retryText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={renderAuthorProfile}
          renderItem={({ item, index }) => renderTimelineItem(item, index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default AuthorDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
});
