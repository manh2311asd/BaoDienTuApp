import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ActivityIndicator,
  InteractionManager,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import { Article, Category } from '../../types/content';
import { Bell, CloudSun, Compass, Eye, Search, Star, WifiOff } from 'lucide-react-native';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { mainShellTheme } from '../../theme/colors';

// §3 Font tokens
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const F_SANS  = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });
const IC = { strokeWidth: 2 } as const;

// §4 Palette
const C = {
  bg: mainShellTheme.light.appBackground,
  card: mainShellTheme.light.appSurface,
  border: mainShellTheme.light.appBorder,
  ink: mainShellTheme.light.appTextPrimary,
  muted: mainShellTheme.light.appTextSecondary,
  accent: mainShellTheme.light.appPrimary,
  accentBg: mainShellTheme.light.appPrimaryContainer,
  vip: mainShellTheme.light.appWarning,
  vipBg: mainShellTheme.light.appYellowContainer,
};

const HOME_NOTIFICATION_TTL = 2 * 60 * 1000;
let homeNotificationCache: {
  userId: number;
  count: number;
  savedAt: number;
} | null = null;

const HOME_ARTICLE_CACHE_KEY = '@BaoDienTu:home_articles_v3';
const HOME_CATEGORY_CACHE_KEY = '@BaoDienTu:home_categories_v3';

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { fontSize, showImages, themeMode, user } = useAppStore();
  const dark = themeMode === 'dark';
  const shell = mainShellTheme[themeMode];
  const colors = {
    text: shell.appTextPrimary,
    textMuted: shell.appTextSecondary,
    border: shell.appBorder,
  };
  const homeCanvas = shell.appBackground;
  const homeSurface = shell.appSurface;
  const homeHeader = shell.appHeader;
  const homeAccent = shell.appPrimary;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const requestId = useRef(0);

  // Pagination states
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const categoryScrollRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<{[key: string]: {x: number, width: number}}>({});

  const scrollToChip = useCallback((catId: number | null) => {
    setTimeout(() => {
      const key = catId === null ? 'all' : catId.toString();
      const layout = chipLayoutsRef.current[key];
      if (layout && categoryScrollRef.current) {
        const screenWidth = Dimensions.get('window').width;
        const targetX = layout.x - screenWidth / 2 + layout.width / 2;
        categoryScrollRef.current.scrollTo({
          x: Math.max(0, targetX),
          animated: true,
        });
      }
    }, 50);
  }, []);

  const handleChipLayout = useCallback((key: string, event: any) => {
    const { x, width } = event.nativeEvent.layout;
    chipLayoutsRef.current[key] = { x, width };
    const isSelected = (key === 'all' && selectedCatId === null) || (selectedCatId !== null && selectedCatId.toString() === key);
    if (isSelected) {
      scrollToChip(selectedCatId);
    }
  }, [selectedCatId, scrollToChip]);

  useEffect(() => {
    scrollToChip(selectedCatId);
  }, [selectedCatId, categories, scrollToChip]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      if (homeNotificationCache?.userId === user.id) {
        setUnreadCount(homeNotificationCache.count);
        if (Date.now() - homeNotificationCache.savedAt < HOME_NOTIFICATION_TTL) {
          return;
        }
      }

      apiClient
        .getUnreadNotificationCount()
        .then((response) => {
          homeNotificationCache = {
            userId: user.id,
            count: response.data,
            savedAt: Date.now(),
          };
          setUnreadCount(response.data);
        })
        .catch(() => undefined);
    }, [user])
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // SWR Cache Hydration on Mount
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const [cachedArticlesRaw, cachedCategoriesRaw] = await Promise.all([
          AsyncStorage.getItem(HOME_ARTICLE_CACHE_KEY),
          AsyncStorage.getItem(HOME_CATEGORY_CACHE_KEY),
        ]);
        if (!active) return;
        if (cachedArticlesRaw) {
          const parsed = JSON.parse(cachedArticlesRaw);
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setArticles(parsed.data);
            setInitialLoading(false);
            hasLoadedOnceRef.current = true;
          }
        }
        if (cachedCategoriesRaw) {
          const parsed = JSON.parse(cachedCategoriesRaw);
          if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
            setCategories(parsed.data);
          }
        }
      } catch {
        // Hydration error is fine
      }
    };
    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    apiClient
      .getCategories()
      .then((response) => {
        const nextCategories = response.data || [];
        setCategories(nextCategories);
        AsyncStorage.setItem(
          HOME_CATEGORY_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), data: nextCategories })
        ).catch(() => undefined);
      })
      .catch(() => setCategories([]));
  }, []);

  const fetchArticles = useCallback(async (isRefresh = false, targetPage = 0) => {
    const currentRequestId = ++requestId.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) {
      setRefreshing(true);
    } else if (targetPage > 0) {
      setLoadingMore(true);
    } else if (!hasLoadedOnceRef.current) {
      setInitialLoading(true);
    } else {
      setBackgroundFetching(true);
    }
    setError('');

    try {
      const response = await apiClient.searchArticles({
        keyword: debouncedQuery || undefined,
        categoryId: selectedCatId || undefined,
        origin: 'INTERNAL',
        page: targetPage,
        size: 15,
      }, {
        signal: controller.signal
      });

      if (currentRequestId === requestId.current) {
        const resData = response.data;

        let newArticles: Article[] = [];
        let ended = true;

        if (resData && typeof resData === 'object' && 'content' in resData) {
          newArticles = (resData as any).content;
          ended = (resData as any).last;
        } else if (Array.isArray(resData)) {
          newArticles = resData;
          ended = true;
        }

        if (targetPage === 0 || isRefresh) {
          setArticles(newArticles);
          // Update cache for the first page of articles
          if (!debouncedQuery && selectedCatId === null) {
            AsyncStorage.setItem(
              HOME_ARTICLE_CACHE_KEY,
              JSON.stringify({ savedAt: Date.now(), data: newArticles })
            ).catch(() => undefined);
          }
        } else {
          setArticles(prev => [...prev, ...newArticles]);
        }

        setPage(targetPage);
        setHasMore(!ended);
        hasLoadedOnceRef.current = true;
      }
    } catch (requestError: any) {
      if (requestError?.name === 'CanceledError' || requestError?.message === 'canceled') {
        return;
      }
      console.warn('[HomeScreen API Error]', requestError?.message || requestError);
      if (currentRequestId === requestId.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải danh sách bài viết.'
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setInitialLoading(false);
        setRefreshing(false);
        setBackgroundFetching(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedQuery, selectedCatId]);

  useEffect(() => {
    fetchArticles(false, 0);
  }, [fetchArticles]);

  useEffect(() => {
    if (articles.length === 0 || selectedCatId !== null || debouncedQuery) return;
    const task = InteractionManager.runAfterInteractions(() => {
      const savedAt = Date.now();
      navigation.preload?.('ExploreTab');
      Promise.all([
        AsyncStorage.setItem(
          '@BaoDienTu:explore_articles_v2',
          JSON.stringify({ savedAt, data: articles.slice(0, 20) })
        ),
        categories.length > 0
          ? AsyncStorage.setItem(
              '@BaoDienTu:explore_categories_v2',
              JSON.stringify({ savedAt, data: categories })
            )
          : Promise.resolve(),
      ]).catch(() => undefined);
    });
    return () => task.cancel();
  }, [articles, categories, debouncedQuery, navigation, selectedCatId]);

  const handleRefresh = () => {
    if (refreshing) return;
    fetchArticles(true, 0);
    if (categories.length === 0) {
      apiClient
        .getCategories()
        .then((response) => {
          const nextCategories = response.data || [];
          setCategories(nextCategories);
          AsyncStorage.setItem(
            HOME_CATEGORY_CACHE_KEY,
            JSON.stringify({ savedAt: Date.now(), data: nextCategories })
          ).catch(() => undefined);
        })
        .catch(() => setCategories([]));
    }
  };

  const handleLoadMore = () => {
    if (!initialLoading && !backgroundFetching && !loadingMore && hasMore) {
      fetchArticles(false, page + 1);
    }
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
        <View
          style={[
            styles.skeHeroCard,
            { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
          ]}
        >
          <View style={[styles.skeHeroImg, { backgroundColor: shell.appSurfaceMuted }]} />
          <View style={[styles.skeHeroTitle, { backgroundColor: shell.appSurfaceMuted }]} />
          <View style={[styles.skeHeroText, { backgroundColor: shell.appSurfaceMuted }]} />
        </View>
        {/* Compact List Skeletons */}
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.skeCompactRow,
              { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={[styles.skeTextLine, { backgroundColor: shell.appSurfaceMuted }]} />
              <View style={[styles.skeTextLine, { width: '60%', marginTop: 8, backgroundColor: shell.appSurfaceMuted }]} />
            </View>
            <View style={[styles.skeThumb, { backgroundColor: shell.appSurfaceMuted }]} />
          </View>
        ))}
      </View>
    );
  };

  // Memoized Header Element of FlatList containing Logo, Date Bar, Horizontal Categories, Error Warning, and Hero Article
  const listHeaderElement = useMemo(() => {
    const today = new Date();
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dateString = `${days[today.getDay()]}, Ngày ${today.getDate()} tháng ${today.getMonth() + 1}`;

    const heroArticle = articles.length > 0 ? articles[0] : null;

    return (
      <>
        <View
          style={[
            styles.headerBlock,
            { backgroundColor: shell.appBackgroundAlt, borderColor: shell.appBorder },
          ]}
        >
          <View style={[styles.masthead, { backgroundColor: homeHeader }]}>
            {/* Masthead Branding */}
            <View style={styles.brandRow}>
              <Text style={[styles.brandTitle, { color: shell.appHeaderText }]}>NewsDaily</Text>
              <View style={styles.utilityRow}>
                <TouchableOpacity
                  accessibilityLabel="Chọn cỡ chữ"
                  hitSlop={4}
                  onPress={() => navigation.navigate('FontTypographySettings')}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
                  ]}
                >
                  <Text style={[styles.aaLabel, { color: shell.appControlIcon }]}>Aa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Mở thời tiết"
                  hitSlop={4}
                  onPress={() => navigation.navigate('Weather')}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
                  ]}
                >
                  <CloudSun color={shell.appControlIcon} size={20} {...IC} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Mở thông báo"
                  hitSlop={4}
                  onPress={() =>
                    user
                      ? navigation.navigate('Notifications')
                      : navigation.navigate('ProfileTab')
                  }
                  style={[
                    styles.iconBtn,
                    { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
                  ]}
                >
                  <Bell color={shell.appControlIcon} size={18} {...IC} />
                  {unreadCount > 0 && (
                    <View
                      style={[
                        styles.notificationBadge,
                        { backgroundColor: shell.appError, borderColor: homeHeader },
                      ]}
                    >
                      <Text style={[styles.notificationBadgeText, { color: shell.appOnPrimary }]}>
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
                hitSlop={6}
                onPress={() => navigation.navigate('Calendar')}
              >
                <Text style={[styles.dateText, { color: shell.appHeaderTextSecondary }]}>{dateString}</Text>
              </TouchableOpacity>
              <View style={[styles.editionBadge, { backgroundColor: shell.appPrimaryContainer }]}>
                <Text style={[styles.editionText, { color: shell.appAccentText }]}>Bản kỹ thuật số</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: homeSurface,
                borderColor: searchFocused ? shell.appPrimary : shell.appBorder,
              },
            ]}
          >
            <Search color={shell.appPrimary} size={17} {...IC} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Tìm bài viết"
              placeholderTextColor={shell.appSearchPlaceholder}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {backgroundFetching && !refreshing && (
              <ActivityIndicator color={shell.appPrimary} size="small" />
            )}
          </View>

          {/* Horizontal Category Scroll Bar */}
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              accessibilityRole="button"
              hitSlop={{ top: 6, bottom: 6 }}
              style={[
                styles.categoryChip,
                { backgroundColor: dark ? shell.appSurface : shell.appCategoryContainer, borderColor: shell.appCategoryBorder },
                selectedCatId === null && { backgroundColor: homeAccent, borderColor: homeAccent },
              ]}
              onLayout={(e) => handleChipLayout('all', e)}
              onPress={() => setSelectedCatId(null)}
            >
              <Text 
                style={[
                  styles.categoryText,
                  { color: colors.textMuted },
                  selectedCatId === null && { color: shell.appOnPrimary },
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6 }}
                style={[
                  styles.categoryChip,
                  { backgroundColor: dark ? shell.appSurface : shell.appCategoryContainer, borderColor: shell.appCategoryBorder },
                  selectedCatId === cat.id && { backgroundColor: homeAccent, borderColor: homeAccent },
                ]}
                onLayout={(e) => handleChipLayout(cat.id.toString(), e)}
                onPress={() => setSelectedCatId(cat.id)}
              >
                <Text 
                  style={[
                    styles.categoryText,
                    { color: colors.textMuted },
                    selectedCatId === cat.id && { color: shell.appOnPrimary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Error Warning Banner */}
        {error && articles.length > 0 ? (
          <View
            style={[
              styles.inlineWarning,
              {
                backgroundColor: shell.appPrimaryContainer,
                borderColor: shell.appBorder,
              },
            ]}
          >
            <WifiOff color={shell.appError} size={15} {...IC} />
            <Text style={[styles.inlineWarningText, { color: colors.text }]}>Không thể cập nhật tin mới. Nội dung gần nhất vẫn được giữ lại.</Text>
          </View>
        ) : null}

        {/* Hero Article */}
        {heroArticle ? (
          <TouchableOpacity
            style={[
              styles.heroCard,
              { backgroundColor: homeSurface, borderColor: colors.border },
            ]}
            onPress={() => {
              if (heroArticle.origin === 'EXTERNAL') {
                navigation.navigate('ArticleWebView', {
                  url: heroArticle.originalUrl,
                  title: heroArticle.title,
                });
              } else {
                navigation.navigate('ArticleDetail', {
                  articleId: heroArticle.id,
                  articleType: heroArticle.type,
                });
              }
            }}
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
                <View style={[styles.vipBadge, { backgroundColor: shell.appYellowContainer }]}>
                  <Star color={shell.appWarning} size={10} fill={shell.appWarning} {...IC} />
                  <Text style={[styles.vipText, { color: shell.appWarning }]}>VIP EXCLUSIVE</Text>
                </View>
              )}
              <Text
                style={[
                  styles.heroTitle,
                  {
                    color: colors.text,
                    fontSize: scaleFont(23, fontSize),
                    lineHeight: scaleLineHeight(29, fontSize),
                  },
                ]}
                allowFontScaling
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
                numberOfLines={3}
              >
                {heroArticle.sapo}
              </Text>
              <View style={styles.metaRow}>
                {heroArticle.origin === 'EXTERNAL' && heroArticle.sourceName && (
                  <View style={[styles.sourceBadge, { backgroundColor: shell.appSecondaryContainer }]}>
                    <Text style={[styles.sourceText, { color: shell.appSecondary }]}>{heroArticle.sourceName}</Text>
                  </View>
                )}
                <Text style={[styles.metaLabel, { color: shell.appPrimary }]}>{heroArticle.categoryName || 'Tin tức'}</Text>
                <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{formatDate(heroArticle.createdAt)}</Text>
                {heroArticle.viewCount > 0 && (
                  <>
                    <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                    <Eye color={colors.textMuted} size={11} style={{ marginRight: 2 }} {...IC} />
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{heroArticle.viewCount} lượt xem</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ) : null}
      </>
    );
  }, [
    unreadCount,
    query,
    searchFocused,
    backgroundFetching,
    refreshing,
    categories,
    selectedCatId,
    dark,
    shell,
    colors,
    homeSurface,
    homeAccent,
    homeHeader,
    error,
    articles,
    showImages,
    fontSize,
    navigation,
    handleChipLayout,
    scrollToChip,
  ]);

  // Split Articles into Hero (1st) and Compact (rest)
  const { heroArticle, listArticles } = useMemo(() => {
    return {
      heroArticle: articles.length > 0 ? articles[0] : null,
      listArticles: articles.length > 1 ? articles.slice(1) : [],
    };
  }, [articles]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: homeCanvas }]}
    >
      <FlatList
        data={listArticles}
        keyExtractor={(item) => item.id.toString()}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: 78 + insets.bottom },
          articles.length === 0 && { flexGrow: 1, justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={() => {
          if (!loadingMore) return null;
          return <ActivityIndicator size="small" color={colors.text} style={{ marginVertical: 16 }} />;
        }}
        ListEmptyComponent={() => {
          if (initialLoading) return renderSkeleton();
          if (error) {
            return (
              <View style={styles.emptyCenter}>
                <WifiOff color={colors.textMuted} size={36} {...IC} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Không thể tải tin</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: shell.appPrimary }]}
                  onPress={() => fetchArticles()}
                >
                  <Text style={[styles.retryBtnText, { color: shell.appOnPrimary }]}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View style={styles.emptyCenter}>
              <Compass color={colors.textMuted} size={36} {...IC} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có bài viết</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Không tìm thấy bài viết nào phù hợp trong danh mục này.</Text>
            </View>
          );
        }}
        ListHeaderComponent={listHeaderElement}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.compactCard,
              { backgroundColor: homeSurface, borderColor: colors.border },
            ]}
            onPress={() => {
              if (item.origin === 'EXTERNAL') {
                navigation.navigate('ArticleWebView', {
                  url: item.originalUrl,
                  title: item.title,
                });
              } else {
                navigation.navigate('ArticleDetail', {
                  articleId: item.id,
                  articleType: item.type,
                });
              }
            }}
            activeOpacity={0.8}
          >
            <View style={styles.compactTextContainer}>
              {item.type === 'VIP' && (
                <View style={[styles.vipBadge, { marginBottom: 4, backgroundColor: shell.appYellowContainer }]}>
                  <Text style={[styles.vipText, { color: shell.appWarning }]}>VIP</Text>
                </View>
              )}
              <Text
                style={[
                  styles.compactTitle,
                  {
                    color: colors.text,
                    fontSize: scaleFont(17, fontSize),
                    lineHeight: scaleLineHeight(22, fontSize),
                  },
                ]}
                allowFontScaling
                numberOfLines={fontSize === 'xlarge' ? 3 : 2}
              >
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                {item.origin === 'EXTERNAL' && item.sourceName && (
                  <View style={[styles.sourceBadge, { backgroundColor: shell.appSecondaryContainer }]}>
                    <Text style={[styles.sourceText, { color: shell.appSecondary }]}>{item.sourceName}</Text>
                  </View>
                )}
                <Text style={[styles.metaLabel, { color: shell.appPrimary }]}>{item.categoryName || 'Tin tức'}</Text>
                <Text style={[styles.metaDot, { color: colors.border }]}>·</Text>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
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
  masthead: {
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  brandTitle: {
    fontFamily: F_SERIF,
    fontSize: 32,
    fontWeight: '700',
    color: mainShellTheme.light.appHeaderText,
    letterSpacing: -1,
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
    backgroundColor: mainShellTheme.light.appError,
  },
  notificationBadgeText: {
    color: mainShellTheme.light.appOnPrimary,
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
    marginTop: 4,
    marginBottom: 5,
  },
  searchBox: {
    height: 46,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
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
    backgroundColor: mainShellTheme.light.appPrimaryContainer,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editionText: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '600',
    color: mainShellTheme.light.appAccentText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 7,
  },
  categoryChip: {
    minHeight: 35,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    backgroundColor: C.card,
  },
  categoryText: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.muted,
    fontWeight: '600',
  },
  listContainer: {
    paddingTop: 12,
    paddingBottom: 48,
  },
  inlineWarning: {
    minHeight: 38,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  inlineWarningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    lineHeight: 16,
  },
  heroCard: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  imagePlaceholder: {
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
  },
  heroContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 17,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontFamily: F_SERIF,
    fontSize: 23,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 29,
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
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 6,
  },
  sourceText: {
    fontFamily: F_SANS,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaLabel: {
    fontFamily: F_SANS,
    fontSize: 11.5,
    color: C.muted,
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 6,
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
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 22,
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
    color: mainShellTheme.light.appOnPrimary,
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
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
    marginBottom: 16,
  },
  skeHeroTitle: {
    height: 18,
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
    borderRadius: 4,
    width: '80%',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  skeHeroText: {
    height: 14,
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
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
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
    borderRadius: 4,
    width: '75%',
  },
  skeThumb: {
    width: 80,
    height: 70,
    borderRadius: 6,
    backgroundColor: mainShellTheme.light.appSurfaceMuted,
    marginLeft: 12,
  },
});
