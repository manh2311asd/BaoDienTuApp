import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import { Article, Category } from '../../types/content';
import { Bell, CloudSun, Compass, Eye, Search, Star, WifiOff } from 'lucide-react-native';
import ReadingPreferencesSheet from '../../components/Reading/ReadingPreferencesSheet';
import { scaleFont, scaleLineHeight } from '../../theme/typography';

// §3 Font tokens
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const F_SANS  = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });
const IC = { strokeWidth: 2 } as const;

// §4 Palette
const C = {
  bg:       '#FCFBF9',
  card:     '#FFFFFF',
  border:   '#EAEAEA',
  ink:      '#111111',
  muted:    '#787774',
  accent:   '#1F6C9F',
  accentBg: '#E1F3FE',
  vip:      '#956400',
  vipBg:    '#FBF3DB',
};

export default function HomeScreen({ navigation }: any) {
  const { fontSize, getColors, showImages, user } = useAppStore();
  const colors = getColors();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState('');
  const [showReadingSettings, setShowReadingSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const requestId = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      apiClient
        .getUnreadNotificationCount()
        .then((response) => setUnreadCount(response.data))
        .catch(() => setUnreadCount(0));
    }, [user])
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    apiClient
      .getCategories()
      .then((response) => setCategories(response.data || []))
      .catch(() => setCategories([]));
  }, []);

  const fetchArticles = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++requestId.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await apiClient.searchArticles(
        debouncedQuery || undefined,
        selectedCatId || undefined
      );
      if (currentRequestId === requestId.current) {
        setArticles(response.data || []);
      }
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải danh sách bài viết.'
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [debouncedQuery, selectedCatId]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleRefresh = () => {
    fetchArticles(true);
  };

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Gần đây';
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Render Skeleton Placeholders
  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        {/* Hero Card Skeleton */}
        <View style={styles.skeHeroCard}>
          <View style={styles.skeHeroImg} />
          <View style={styles.skeHeroTitle} />
          <View style={styles.skeHeroText} />
        </View>
        {/* Compact List Skeletons */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.skeCompactRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.skeTextLine} />
              <View style={[styles.skeTextLine, { width: '60%', marginTop: 8 }]} />
            </View>
            <View style={styles.skeThumb} />
          </View>
        ))}
      </View>
    );
  };

  // Header of FlatList containing Logo, Date Bar, and Horizontal Categories
  const renderHeader = () => {
    const today = new Date();
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dateString = `${days[today.getDay()]}, Ngày ${today.getDate()} tháng ${today.getMonth() + 1}`;

    return (
      <View
        style={[
          styles.headerBlock,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        {/* Masthead Branding */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandTitle, { color: colors.text }]}>The Daily</Text>
          <View style={styles.utilityRow}>
            <TouchableOpacity
              accessibilityLabel="Chọn cỡ chữ"
              onPress={() => setShowReadingSettings(true)}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.aaLabel, { color: colors.text }]}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Weather')}
              style={[
                styles.iconBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <CloudSun color={colors.text} size={20} {...IC} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Mở thông báo"
              onPress={() =>
                user
                  ? navigation.navigate('Notifications')
                  : navigation.navigate('ProfileTab')
              }
              style={[
                styles.iconBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Bell color={colors.text} size={18} {...IC} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Bar */}
        <View style={styles.dateBar}>
          <TouchableOpacity
            accessibilityLabel="Mở lịch"
            onPress={() => navigation.navigate('Calendar')}
          >
            <Text style={[styles.dateText, { color: colors.textMuted }]} maxFontSizeMultiplier={1.4}>{dateString}</Text>
          </TouchableOpacity>
          <View style={[styles.editionBadge, { backgroundColor: colors.card }]}>
            <Text style={[styles.editionText, { color: colors.text }]} maxFontSizeMultiplier={1.3}>Bản kỹ thuật số</Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Search color={colors.textMuted} size={17} {...IC} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm bài viết"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>

        {/* Horizontal Category Scroll Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              selectedCatId === null && { backgroundColor: colors.text },
            ]}
            onPress={() => setSelectedCatId(null)}
          >
            <Text 
              style={[
                styles.categoryText,
                { color: colors.textMuted },
                selectedCatId === null && { color: colors.background },
              ]}
              maxFontSizeMultiplier={1.4}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedCatId === cat.id && { backgroundColor: colors.text },
              ]}
              onPress={() => setSelectedCatId(cat.id)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  { color: colors.textMuted },
                  selectedCatId === cat.id && { color: colors.background },
                ]}
                maxFontSizeMultiplier={1.4}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Split Articles into Hero (1st) and Compact (rest)
  const heroArticle = articles.length > 0 ? articles[0] : null;
  const listArticles = articles.length > 1 ? articles.slice(1) : [];

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {renderHeader()}

      {loading && !refreshing ? (
        renderSkeleton()
      ) : error ? (
        <View style={styles.emptyCenter}>
          <WifiOff color={colors.textMuted} size={36} {...IC} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Không thể tải tin</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.text }]}
            onPress={() => fetchArticles()}
          >
            <Text style={[styles.retryBtnText, { color: colors.background }]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Compass color={colors.textMuted} size={36} {...IC} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có bài viết</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>Không tìm thấy bài viết nào phù hợp trong danh mục này.</Text>
        </View>
      ) : (
        <FlatList
          data={listArticles}
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={60}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={() => {
            if (!heroArticle) return null;
            return (
              <TouchableOpacity
                style={[
                  styles.heroCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() =>
                  navigation.navigate('ArticleDetail', {
                    articleId: heroArticle.id,
                    articleType: heroArticle.type,
                  })
                }
                activeOpacity={0.9}
              >
                {showImages && heroArticle.coverImage ? (
                  <Image source={{ uri: heroArticle.coverImage }} style={styles.heroImage} />
                ) : (
                  <View
                    style={[
                      styles.heroImage,
                      styles.imagePlaceholder,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
                <View style={styles.heroContent}>
                  {heroArticle.type === 'VIP' && (
                    <View style={styles.vipBadge}>
                      <Star color={C.vip} size={10} fill={C.vip} {...IC} />
                      <Text style={styles.vipText} maxFontSizeMultiplier={1.3}>VIP EXCLUSIVE</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.heroTitle,
                      {
                        color: colors.text,
                        fontSize: scaleFont(20, fontSize),
                        lineHeight: scaleLineHeight(26, fontSize),
                      },
                    ]}
                    allowFontScaling
                    maxFontSizeMultiplier={1.35}
                  >
                    {heroArticle.title}
                  </Text>
                  <Text
                    style={[
                      styles.heroSapo,
                      {
                        color: colors.textMuted,
                        fontSize: scaleFont(14, fontSize),
                        lineHeight: scaleLineHeight(21, fontSize),
                      },
                    ]}
                    allowFontScaling
                    maxFontSizeMultiplier={1.35}
                    numberOfLines={3}
                  >
                    {heroArticle.sapo}
                  </Text>
                  
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>{heroArticle.categoryName || 'Tin tức'}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>{formatDate(heroArticle.createdAt)}</Text>
                    {heroArticle.viewCount > 0 && (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <Eye color={C.muted} size={11} style={{ marginRight: 2 }} {...IC} />
                        <Text style={styles.metaLabel} maxFontSizeMultiplier={1.3}>{heroArticle.viewCount} lượt xem</Text>
                      </>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.compactCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() =>
                navigation.navigate('ArticleDetail', {
                  articleId: item.id,
                  articleType: item.type,
                })
              }
              activeOpacity={0.8}
            >
              <View style={styles.compactTextContainer}>
                {item.type === 'VIP' && (
                  <View style={[styles.vipBadge, { marginBottom: 4 }]}>
                    <Text style={styles.vipText} maxFontSizeMultiplier={1.3}>VIP</Text>
                  </View>
                )}
                <Text
                  style={[
                    styles.compactTitle,
                    {
                      color: colors.text,
                      fontSize: scaleFont(15, fontSize),
                      lineHeight: scaleLineHeight(20, fontSize),
                    },
                  ]}
                  allowFontScaling
                  maxFontSizeMultiplier={1.35}
                  numberOfLines={fontSize === 'xlarge' ? 3 : 2}
                >
                  {item.title}
                </Text>
                
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>{item.categoryName || 'Tin tức'}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={[styles.metaLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1.3}>{formatDate(item.createdAt)}</Text>
                </View>
              </View>
              
              {showImages && item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.compactThumb} />
              ) : (
                <View
                  style={[
                    styles.compactThumb,
                    styles.imagePlaceholder,
                    { backgroundColor: colors.border },
                  ]}
                />
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <ReadingPreferencesSheet
        visible={showReadingSettings}
        onClose={() => setShowReadingSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerBlock: {
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  brandTitle: {
    fontFamily: F_SERIF,
    fontSize: 32,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -1,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: C.card,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.bg,
    backgroundColor: '#9F2F2D',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  aaLabel: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
  },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  searchBox: {
    height: 42,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 6,
    backgroundColor: C.card,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    color: C.ink,
    fontFamily: F_SANS,
    fontSize: 14,
  },
  dateText: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  editionBadge: {
    backgroundColor: '#F0EFED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editionText: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '600',
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    backgroundColor: C.card,
  },
  categoryChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  categoryText: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.muted,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 218,
  },
  imagePlaceholder: {
    backgroundColor: '#EAEAEA',
  },
  heroContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.vipBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  vipText: {
    fontFamily: F_SANS,
    fontSize: 9,
    fontWeight: '700',
    color: C.vip,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: F_SERIF,
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 26,
    marginBottom: 6,
  },
  heroSapo: {
    fontFamily: F_SANS,
    fontSize: 14,
    color: C.muted,
    lineHeight: 21,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaLabel: {
    fontFamily: F_SANS,
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 6,
    color: C.border,
  },
  compactCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  compactTextContainer: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontFamily: F_SERIF,
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 20,
    marginBottom: 4,
  },
  compactThumb: {
    width: 90,
    height: 80,
    borderRadius: 8,
  },
  emptyCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 16,
    minHeight: 40,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 5,
    backgroundColor: C.ink,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Skeleton Loading Styles
  skeletonContainer: {
    paddingTop: 16,
  },
  skeHeroCard: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingBottom: 18,
  },
  skeHeroImg: {
    height: 210,
    backgroundColor: '#EAEAEA',
    marginBottom: 16,
  },
  skeHeroTitle: {
    height: 18,
    backgroundColor: '#EAEAEA',
    borderRadius: 4,
    width: '80%',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  skeHeroText: {
    height: 14,
    backgroundColor: '#EAEAEA',
    borderRadius: 4,
    width: '86%',
    marginHorizontal: 18,
  },
  skeCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  skeTextLine: {
    height: 14,
    backgroundColor: '#EAEAEA',
    borderRadius: 4,
    width: '75%',
  },
  skeThumb: {
    width: 80,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#EAEAEA',
    marginLeft: 12,
  },
});
