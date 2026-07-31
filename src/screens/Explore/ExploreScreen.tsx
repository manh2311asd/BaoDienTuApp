import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Bell, BookOpen, Check, Eye, Heart, Laptop, Landmark, Search, Star, Users } from 'lucide-react-native';
import { Article, Category } from '../../types/content';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast/ToastContext';
import { scaleFont, scaleLineHeight } from '../../theme/typography';

type ExploreSection = 'latest' | 'popular' | 'journalists';

interface AuthorSummary {
  id: number;
  name: string;
  articleCount: number;
  viewCount: number;
}

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const F_SANS = Platform.select({
  ios: 'Helvetica Neue',
  android: 'sans-serif',
  default: 'System',
});
const IC = { strokeWidth: 2 } as const;

export default function ExploreScreen({ navigation }: any) {
  const {
    addSubscription,
    fontSize,
    getColors,
    removeSubscription,
    showImages,
    subscriptions,
    user,
  } = useAppStore();
  const colors = getColors();
  const { showToast } = useToast();
  const [section, setSection] = useState<ExploreSection>('latest');
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [followLoadingId, setFollowLoadingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [artRes, catRes] = await Promise.all([
        apiClient.searchArticles(),
        apiClient.getCategories(),
      ]);
      setArticles(artRes.data || []);
      setCategories(catRes.data || []);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Không thể tải trang khám phá'
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN');
  const visibleArticles = useMemo(() => {
    const filtered = articles.filter((article) => {
      if (!normalizedQuery) {
        return true;
      }
      return [article.title, article.authorName, article.categoryName].some(
        (value) =>
          (value || '').toLocaleLowerCase('vi-VN').includes(normalizedQuery)
      );
    });
    return [...filtered].sort((left, right) =>
      section === 'popular'
        ? right.viewCount - left.viewCount
        : new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
    );
  }, [articles, normalizedQuery, section]);

  const authors = useMemo(() => {
    const grouped = new Map<number, AuthorSummary>();
    articles.forEach((article) => {
      if (!article.authorId) {
        return;
      }
      const current = grouped.get(article.authorId);
      grouped.set(article.authorId, {
        id: article.authorId,
        name: article.authorName || `Tác giả #${article.authorId}`,
        articleCount: (current?.articleCount || 0) + 1,
        viewCount: (current?.viewCount || 0) + article.viewCount,
      });
    });
    return [...grouped.values()]
      .filter(
        (author) =>
          !normalizedQuery ||
          author.name.toLocaleLowerCase('vi-VN').includes(normalizedQuery)
      )
      .sort(
        (left, right) =>
          right.articleCount - left.articleCount ||
          right.viewCount - left.viewCount
      );
  }, [articles, normalizedQuery]);

  const isFollowing = (authorId: number) =>
    subscriptions.some(
      (item) => item.targetType === 'AUTHOR' && item.targetId === authorId
    );

  const toggleFollow = async (author: AuthorSummary) => {
    if (!user) {
      showToast('Đăng nhập để theo dõi nhà báo');
      navigation.navigate('ProfileTab');
      return;
    }

    setFollowLoadingId(author.id);
    try {
      if (isFollowing(author.id)) {
        await apiClient.unsubscribeTopic('AUTHOR', author.id);
        removeSubscription('AUTHOR', author.id);
        showToast(`Đã bỏ theo dõi ${author.name}`);
      } else {
        const response = await apiClient.subscribeTopic('AUTHOR', author.id);
        addSubscription(response.data);
        showToast(`Đang theo dõi ${author.name}`);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật theo dõi lúc này'
      );
    } finally {
      setFollowLoadingId(null);
    }
  };

  const renderArticle = ({ item, index }: { item: Article; index: number }) => {
    const isFirst = index === 0 && !query && section === 'latest';
    if (isFirst) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.firstArticleCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() =>
            navigation.navigate('ArticleDetail', {
              articleId: item.id,
              articleType: item.type,
            })
          }
        >
          {showImages && item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.firstThumbnail} />
          ) : (
            <View
              style={[
                styles.firstThumbnail,
                { backgroundColor: colors.border },
              ]}
            />
          )}
          <View style={styles.firstArticleContent}>
            <View style={styles.articleMetaTop}>
              <Text style={[styles.category, { color: colors.primary }]}>
                {(item.categoryName || 'Tin tức').toUpperCase()}
              </Text>
              {item.type === 'VIP' && (
                <View style={styles.vipBadge}>
                  <Star color="#7A5200" fill="#7A5200" size={9} {...IC} />
                  <Text style={styles.vipText}>VIP</Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={3}
              style={[
                styles.firstArticleTitle,
                {
                  color: colors.text,
                  fontSize: scaleFont(19, fontSize),
                  lineHeight: scaleLineHeight(25, fontSize),
                },
              ]}
            >
              {item.title}
            </Text>
            <View style={styles.articleFooter}>
              <Text style={[styles.author, { color: colors.textMuted }]}>
                {item.authorName}
              </Text>
              <Eye color={colors.textMuted} size={12} {...IC} />
              <Text style={[styles.viewCount, { color: colors.textMuted }]}>
                {item.viewCount}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.articleRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() =>
          navigation.navigate('ArticleDetail', {
            articleId: item.id,
            articleType: item.type,
          })
        }
      >
        <View style={styles.articleCopy}>
          <View style={styles.articleMetaTop}>
            <Text style={[styles.category, { color: colors.primary }]}>
              {(item.categoryName || 'Tin tức').toUpperCase()}
            </Text>
            {item.type === 'VIP' && (
              <View style={styles.vipBadge}>
                <Star color="#7A5200" fill="#7A5200" size={9} {...IC} />
                <Text style={styles.vipText}>VIP</Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={3}
            style={[
              styles.articleTitle,
              {
                color: colors.text,
                fontSize: scaleFont(15, fontSize),
                lineHeight: scaleLineHeight(20, fontSize),
              },
            ]}
          >
            {item.title}
          </Text>
          <View style={styles.articleFooter}>
            <Text style={[styles.author, { color: colors.textMuted }]}>
              {item.authorName}
            </Text>
            <Eye color={colors.textMuted} size={12} {...IC} />
            <Text style={[styles.viewCount, { color: colors.textMuted }]}>
              {item.viewCount}
            </Text>
          </View>
        </View>
        {showImages && item.coverImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.thumbnail} />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.border },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderAuthor = ({ item }: { item: AuthorSummary }) => {
    const followed = isFollowing(item.id);
    return (
      <View
        style={[
          styles.authorRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.authorIdentity}
          onPress={() =>
            navigation.navigate('AuthorDetail', {
              authorId: item.id,
              authorName: item.name,
            })
          }
        >
          <View style={[styles.authorAvatar, { backgroundColor: colors.text }]}>
            <Text style={[styles.authorInitial, { color: colors.background }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorCopy}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.authorStats, { color: colors.textMuted }]}>
              {item.articleCount} bài viết · {item.viewCount} lượt đọc
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={followLoadingId === item.id}
          style={[
            styles.followButton,
            {
              backgroundColor: followed ? colors.card : colors.text,
              borderColor: followed ? colors.border : colors.text,
            },
          ]}
          onPress={() => toggleFollow(item)}
        >
          {followLoadingId === item.id ? (
            <ActivityIndicator
              size="small"
              color={followed ? colors.text : colors.background}
            />
          ) : followed ? (
            <Check color={colors.text} size={15} {...IC} />
          ) : (
            <Bell color={colors.background} size={15} {...IC} />
          )}
          <Text
            style={[
              styles.followText,
              { color: followed ? colors.text : colors.background },
            ]}
          >
            {followed ? 'Đang theo dõi' : 'Theo dõi'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const getCategoryStyle = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('công nghệ') || n.includes('tech') || n.includes('số')) {
      return { bg: '#E1F3FE', color: '#1F6C9F', icon: <Laptop color="#1F6C9F" size={18} {...IC} /> };
    }
    if (n.includes('đời sống') || n.includes('sống')) {
      return { bg: '#EDF3EC', color: '#346538', icon: <Heart color="#346538" size={18} {...IC} /> };
    }
    if (n.includes('kinh doanh') || n.includes('tài chính')) {
      return { bg: '#FBF3DB', color: '#8B6200', icon: <Landmark color="#8B6200" size={18} {...IC} /> };
    }
    if (n.includes('sức khỏe') || n.includes('y tế')) {
      return { bg: '#FDEBEC', color: '#A62624', icon: <Activity color="#A62624" size={18} {...IC} /> };
    }
    if (n.includes('khoa học')) {
      return { bg: '#F2EBF9', color: '#7E57C2', icon: <Star color="#7E57C2" size={18} {...IC} /> };
    }
    return { bg: '#F0EFED', color: '#72736F', icon: <BookOpen color="#72736F" size={18} {...IC} /> };
  };

  const renderCategoryGrid = () => {
    if (query || section !== 'latest' || categories.length === 0) return null;
    return (
      <View style={styles.gridContainer}>
        <Text style={[styles.gridTitle, { color: colors.text }]}>Chủ đề nổi bật</Text>
        <View style={styles.grid}>
          {categories.slice(0, 6).map((cat) => {
            const catStyle = getCategoryStyle(cat.name);
            const count = articles.filter((a) => a.categoryId === cat.id).length;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.gridItem, { backgroundColor: catStyle.bg, borderColor: colors.border }]}
                activeOpacity={0.75}
                onPress={() => setQuery(cat.name)}
              >
                <View style={styles.gridItemHeader}>
                  {catStyle.icon}
                  {count > 0 && (
                    <Text style={[styles.gridItemCount, { color: catStyle.color }]}>
                      {count} bài
                    </Text>
                  )}
                </View>
                <Text style={[styles.gridItemName, { color: colors.text }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const data = section === 'journalists' ? authors : visibleArticles;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>Khám phá</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Xem tin mới, tin được đọc nhiều và tìm theo chủ đề.
        </Text>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Search color={colors.textMuted} size={18} {...IC} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Tìm bài viết, chủ đề hoặc tác giả"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.tabs}>
          {[
            { value: 'latest' as const, label: 'Mới nhất' },
            { value: 'popular' as const, label: 'Xem nhiều' },
            { value: 'journalists' as const, label: 'Tác giả' },
          ].map((item) => {
            const selected = section === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={styles.tab}
                onPress={() => setSection(item.value)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: selected ? colors.primary : colors.textMuted },
                    selected && styles.tabTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selected && (
                  <View style={[styles.tabUnderline, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={data as any[]}
          key={section}
          keyExtractor={(item) => `${section}-${item.id}`}
          renderItem={
            section === 'journalists'
              ? (renderAuthor as any)
              : (renderArticle as any)
          }
          ListHeaderComponent={renderCategoryGrid}
          contentContainerStyle={[
            styles.list,
            data.length === 0 && styles.emptyList,
          ]}
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
            <View style={styles.center}>
              <Search color={colors.textMuted} size={32} {...IC} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Chưa tìm thấy kết quả
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Thử một từ khóa khác hoặc quay lại mục Mới nhất.
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
    paddingHorizontal: 16,
    paddingTop: 14,
    borderBottomWidth: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    marginLeft: 7,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heading: {
    marginTop: 10,
    fontFamily: F_SERIF,
    fontSize: 31,
    fontWeight: '700',
  },
  subheading: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 19,
  },
  searchBox: {
    height: 46,
    marginTop: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontSize: 14,
  },
  tabs: {
    marginTop: 18,
    flexDirection: 'row',
  },
  tab: {
    marginRight: 24,
    paddingVertical: 11,
    alignItems: 'flex-start',
  },
  tabUnderline: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextSelected: {
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  articleRow: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 12,
  },
  articleCopy: {
    flex: 1,
    paddingRight: 14,
  },
  articleMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  category: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  vipBadge: {
    marginLeft: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF3DB',
    borderRadius: 4,
  },
  vipText: {
    marginLeft: 3,
    color: '#956400',
    fontSize: 8,
    fontWeight: '800',
  },
  articleTitle: {
    fontFamily: F_SERIF,
    fontWeight: '700',
  },
  articleFooter: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    flex: 1,
    marginRight: 8,
    fontSize: 11,
  },
  viewCount: {
    marginLeft: 4,
    fontSize: 10,
  },
  thumbnail: {
    width: 92,
    height: 80,
    borderRadius: 7,
  },
  thumbnailPlaceholder: {
    opacity: 0.55,
  },
  authorRow: {
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 12,
  },
  authorIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInitial: {
    fontFamily: F_SERIF,
    fontSize: 20,
    fontWeight: '700',
  },
  authorCopy: {
    flex: 1,
    marginLeft: 11,
  },
  authorName: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
  },
  authorStats: {
    marginTop: 4,
    fontSize: 11,
  },
  followButton: {
    minWidth: 88,
    height: 34,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  followText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyTitle: {
    marginTop: 12,
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  gridContainer: {
    paddingBottom: 4,
    marginTop: 8,
  },
  gridTitle: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  gridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridItemCount: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '700',
  },
  gridItemName: {
    fontFamily: F_SANS,
    fontSize: 14,
    fontWeight: '700',
  },
  firstArticleCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  firstThumbnail: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  firstArticleContent: {
    padding: 14,
  },
  firstArticleTitle: {
    fontFamily: F_SERIF,
    fontWeight: '700',
    marginBottom: 8,
  },
});
