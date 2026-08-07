import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, ChatCircleText } from 'phosphor-react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { apiClient } from '../../services/api/client';
import { PublicUserProfile, UserCommentActivity } from '../../types/content';
import { F_SERIF, F_SANS } from '../ArticleDetail/constants';
import { scaleFont } from '../../theme/typography';
import { useAppStore } from '../../store/useAppStore';

const PAGE_SIZE = 20;

const getInitials = (name?: string) => {
  if (!name) return 'U';
  const cleanName = name.trim();
  if (cleanName.length === 0) return 'U';
  return cleanName.charAt(0).toUpperCase();
};

const getPastelColor = (name?: string) => {
  if (!name) return '#F1EBE4';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const pastelColors = [
    '#F7DED3', // Accent Container
    '#E4EEE7', // Sage Container
    '#E6ECEE', // Blue-gray
    '#F1EBE4', // Surface muted
    '#EADCC9', // Warm clay
    '#DCE3E6', // Cool gray-blue
  ];
  const index = Math.abs(hash) % pastelColors.length;
  return pastelColors[index];
};

const mapRoleLabel = (role?: string) => {
  if (!role) return 'Thành viên The Daily';
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'Quản trị viên';
    case 'AUTHOR':
      return 'Tác giả';
    case 'CENSOR':
      return 'Kiểm duyệt viên';
    case 'VIP':
      return 'Thành viên VIP';
    case 'MEMBER':
    default:
      return 'Thành viên The Daily';
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date} · ${time}`;
};

export default function PublicUserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const fontSize = useAppStore((state) => state.fontSize);
  
  const { userId } = route.params as { userId: number };

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [comments, setComments] = useState<UserCommentActivity[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());

  const loadInitialData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingProfile(true);
    }
    setError(null);
    try {
      // 1. Fetch public profile
      const profileRes = await apiClient.getPublicProfile(userId);
      setProfile(profileRes.data);

      // 2. Fetch first page of comments
      const commentsRes = await apiClient.getUserComments(userId, 0, PAGE_SIZE);
      setComments(commentsRes.data.content);
      setPage(0);
      setHasNext(commentsRes.data.hasNext);
    } catch (e: any) {
      setError(e.message || 'Không thể tải thông tin hồ sơ.');
    } finally {
      setLoadingProfile(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const loadMoreComments = async () => {
    if (loadingComments || !hasNext || loadingProfile) return;

    setLoadingComments(true);
    const nextPage = page + 1;
    try {
      const res = await apiClient.getUserComments(userId, nextPage, PAGE_SIZE);
      setComments((prev) => [...prev, ...res.data.content]);
      setPage(nextPage);
      setHasNext(res.data.hasNext);
    } catch (e) {
      console.warn('Lỗi tải thêm bình luận:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleExpand = (commentId: number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const renderCommentItem = ({ item }: { item: UserCommentActivity }) => {
    const isLongText = item.content.length > 200;
    const isExpanded = expandedComments.has(item.commentId);
    const displayText = isLongText && !isExpanded 
      ? `${item.content.substring(0, 180).trim()}...` 
      : item.content;

    return (
      <View style={styles.activityCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCategory}>{item.article.categoryName || 'Tin tức'}</Text>
          <Text style={styles.cardDot}>·</Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={[styles.cardContent, { fontSize: scaleFont(13.5, fontSize) }]}>
          “{displayText}”
        </Text>

        {isLongText && (
          <TouchableOpacity 
            style={styles.expandButton} 
            onPress={() => handleToggleExpand(item.commentId)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? 'Thu gọn' : 'Xem thêm →'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.articleBox}>
          <Text style={styles.articleBoxLabel}>Trong bài:</Text>
          <Text style={styles.articleBoxTitle} numberOfLines={2}>
            {item.article.title}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.ctaLink}
          onPress={() => navigation.navigate('ArticleDetail', { articleId: item.article.id })}
          hitSlop={{ top: 12, bottom: 12, left: 15, right: 15 }}
        >
          <Text style={styles.ctaText}>Xem bài báo →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    if (!profile) return null;

    return (
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile.avatarUrl && profile.avatarUrl.trim() !== '' ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatarFallback, { backgroundColor: getPastelColor(profile.displayName) }]}>
              <Text style={styles.profileAvatarFallbackText}>
                {getInitials(profile.displayName)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.profileName}>{profile.displayName}</Text>
        <Text style={styles.profileRole}>{mapRoleLabel(profile.role)}</Text>
        <Text style={styles.profileMeta}>{profile.commentCount} bình luận</Text>
        
        <View style={styles.divider} />
        
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleLabel}>HOẠT ĐỘNG</Text>
          <Text style={styles.sectionSubtitleLabel}>Bình luận gần đây</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (loadingComments) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#999088" />
          <Text style={styles.footerLoaderText}>Đang tải thêm...</Text>
        </View>
      );
    }
    if (!hasNext && comments.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <Text style={styles.footerLoaderText}>Bạn đã xem hết bình luận.</Text>
        </View>
      );
    }
    return <View style={{ height: 24 }} />;
  };

  const renderEmpty = () => {
    if (loadingProfile) return null;

    return (
      <View style={styles.emptyContainer}>
        <ChatCircleText size={48} color="#999088" weight="light" />
        <Text style={styles.emptyTitle}>Chưa có bình luận</Text>
        <Text style={styles.emptySubtitle}>
          Người dùng này chưa tham gia thảo luận trên The Daily.
        </Text>
      </View>
    );
  };

  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        {/* Header Skeleton */}
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonName} />
          <View style={styles.skeletonRole} />
          <View style={styles.skeletonMeta} />
        </View>
        <View style={styles.skeletonDivider} />
        {/* Cards Skeletons */}
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.skeletonCard}>
            <View style={styles.skeletonMetaRow} />
            <View style={styles.skeletonContentLine} />
            <View style={[styles.skeletonContentLine, { width: '80%' }]} />
            <View style={styles.skeletonArticleBox} />
            <View style={styles.skeletonCta} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Nav Bar */}
      <View style={styles.topNavBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color="#29231F" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Hồ sơ công khai</Text>
        <View style={{ width: 48 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadInitialData()}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : loadingProfile ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => String(item.commentId)}
          renderItem={renderCommentItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreComments}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadInitialData(true)}
              colors={['#C65F4D']}
              tintColor="#C65F4D"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F3ED', // Canvas background
  },
  topNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DCD2', // Divider
    backgroundColor: '#F7F3ED',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: F_SANS,
    fontSize: 14,
    fontWeight: '700',
    color: '#29231F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    shadowColor: 'transparent',
    elevation: 0,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#E4DCD2',
  },
  profileAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4DCD2',
  },
  profileAvatarFallbackText: {
    fontFamily: F_SERIF,
    fontSize: 32,
    fontWeight: '700',
    color: '#29231F',
  },
  profileName: {
    fontFamily: F_SERIF,
    fontSize: 24,
    fontWeight: '700',
    color: '#29231F',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileRole: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: '#746D66',
    textAlign: 'center',
    marginBottom: 2,
  },
  profileMeta: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: '#999088',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E4DCD2',
    marginVertical: 24,
  },
  sectionTitleRow: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  sectionTitleLabel: {
    fontFamily: F_SANS,
    fontSize: 11,
    fontWeight: '700',
    color: '#999088',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionSubtitleLabel: {
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
    color: '#29231F',
  },
  activityCard: {
    backgroundColor: '#FFFDF9', // Surface
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardCategory: {
    fontFamily: F_SANS,
    fontSize: 11,
    fontWeight: '700',
    color: '#C65F4D', // Accent text
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDot: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: '#999088',
    marginHorizontal: 6,
  },
  cardDate: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: '#999088',
  },
  cardContent: {
    fontFamily: F_SANS,
    color: '#29231F',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  expandButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: '#C65F4D',
    fontWeight: '600',
  },
  articleBox: {
    backgroundColor: '#F1EBE4', // Surface muted
    borderRadius: 6,
    padding: 12,
    marginTop: 14,
    marginBottom: 12,
  },
  articleBoxLabel: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: '#999088',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  articleBoxTitle: {
    fontFamily: F_SERIF,
    fontSize: 13.5,
    fontWeight: '700',
    color: '#29231F',
    lineHeight: 18,
  },
  ctaLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  ctaText: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '700',
    color: '#C65F4D', // Accent
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: '#999088',
    marginTop: 6,
  },
  emptyContainer: {
    paddingTop: 48,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: F_SERIF,
    fontSize: 17,
    fontWeight: '700',
    color: '#29231F',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: '#746D66',
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontFamily: F_SANS,
    fontSize: 14,
    color: '#746D66',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#29231F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  // Skeleton Loading styles
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  skeletonHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  skeletonAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E4DCD2',
    marginBottom: 16,
  },
  skeletonName: {
    width: 140,
    height: 20,
    backgroundColor: '#E4DCD2',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonRole: {
    width: 160,
    height: 14,
    backgroundColor: '#E4DCD2',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonMeta: {
    width: 80,
    height: 12,
    backgroundColor: '#E4DCD2',
    borderRadius: 4,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#E4DCD2',
    marginBottom: 24,
  },
  skeletonCard: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E4DCD2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  skeletonMetaRow: {
    width: 120,
    height: 12,
    backgroundColor: '#E4DCD2',
    borderRadius: 3,
    marginBottom: 14,
  },
  skeletonContentLine: {
    width: '100%',
    height: 14,
    backgroundColor: '#E4DCD2',
    borderRadius: 3,
    marginBottom: 8,
  },
  skeletonArticleBox: {
    height: 52,
    backgroundColor: '#F1EBE4',
    borderRadius: 6,
    marginTop: 14,
    marginBottom: 12,
  },
  skeletonCta: {
    width: 90,
    height: 14,
    backgroundColor: '#E4DCD2',
    borderRadius: 3,
  },
});
