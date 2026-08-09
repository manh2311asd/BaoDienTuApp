import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Search,
  Bookmark,
  ExternalLink,
  WifiOff,
  Compass,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import { localDB } from '../../services/localDB';
import { Article } from '../../types/content';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { getPageTheme } from '../../theme/colors';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const F_SANS = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });

const SOURCES = ['Tất cả', 'VnExpress', 'Tuổi Trẻ', 'Thanh Niên', 'VietnamNet', 'Dân Trí'];

const CATEGORIES = [
  'Thời sự',
  'Thế giới',
  'Kinh doanh',
  'Pháp luật',
  'Công nghệ',
  'Khoa học',
  'Sức khỏe',
  'Giáo dục',
  'Thể thao',
  'Giải trí',
  'Đời sống',
  'Du lịch',
  'Xe',
  'Bất động sản',
];

const getCacheKey = (source: string, sort: string, topic: string | null, query: string) => {
  return `@NewsDaily:press_review:v1:${source}:${sort}:${topic || ''}:${query}`;
};

export default function PressReviewScreen({ navigation }: any) {
  const { fontSize, themeMode, bookmarkedIds, toggleBookmark } = useAppStore();
  const theme = getPageTheme('pressReview', themeMode);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshInFlightRef = useRef(false);
  const requestId = useRef(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('Tất cả');
  const [sortTab, setSortTab] = useState<'latest' | 'popular' | 'topic'>('latest');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    const layout = chipLayouts.current[selectedSource];
    if (layout) {
      scrollRef.current?.scrollTo({
        x: Math.max(0, layout.x - 80),
        animated: true,
      });
    }
  }, [selectedSource]);

  // Split Articles into Hero (1st) and Compact (rest)
  const { heroArticle, listArticles } = useMemo(() => {
    return {
      heroArticle: articles.length > 0 ? articles[0] : null,
      listArticles: articles.length > 1 ? articles.slice(1) : [],
    };
  }, [articles]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPressArticles = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        if (refreshInFlightRef.current) return;
        refreshInFlightRef.current = true;
      }

      const currentRequestId = ++requestId.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const cacheKey = getCacheKey(selectedSource, sortTab, selectedTopic, debouncedQuery);

      if (isRefresh) {
        setRefreshing(true);
        setPage(0);
      } else {
        // Hydrate from cache first
        try {
          const cachedDataRaw = await AsyncStorage.getItem(cacheKey);
          if (cachedDataRaw && currentRequestId === requestId.current) {
            const parsed = JSON.parse(cachedDataRaw);
            if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0) {
              setArticles(parsed.data);
              setLoading(false);
            } else {
              setArticles([]);
              setLoading(true);
            }
          } else {
            setArticles([]);
            setLoading(true);
          }
        } catch {
          setArticles([]);
          setLoading(true);
        }
      }
      setError(null);

      try {
        const queryParams: any = {
          origin: 'EXTERNAL',
          page: 0,
          size: 15,
        };

        if (debouncedQuery) {
          queryParams.keyword = debouncedQuery;
        }
        if (selectedSource !== 'Tất cả') {
          queryParams.sourceName = selectedSource;
        }
        if (sortTab === 'topic' && selectedTopic) {
          queryParams.keyword = selectedTopic;
        }

        const response = await apiClient.searchArticles(queryParams, {
          signal: controller.signal
        });
        if (currentRequestId !== requestId.current) return;
        const responseData = response.data;

        let newArticles: Article[] = [];
        if (!Array.isArray(responseData)) {
          newArticles = responseData.content || [];
          setPage(0);
          setTotalPages(responseData.totalPages || 0);
          setHasMore(responseData.hasNext);
        } else {
          newArticles = responseData;
          setPage(0);
          setTotalPages(1);
          setHasMore(false);
        }

        setArticles(newArticles);
        AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ savedAt: Date.now(), data: newArticles })
        ).catch(() => undefined);

      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') {
          return;
        }
        console.warn('[PressReviewScreen API Error]', err?.message || err);
        if (currentRequestId === requestId.current) {
          setError(err?.message || 'Không thể tải tin điểm báo. Vui lòng thử lại sau.');
        }
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
        if (isRefresh) {
          refreshInFlightRef.current = false;
        }
      }
    },
    [debouncedQuery, selectedSource, sortTab, selectedTopic]
  );

  useEffect(() => {
    fetchPressArticles();
  }, [fetchPressArticles]);

  useEffect(() => {
    const handleBackPress = () => {
      if (searchQuery !== '' || selectedSource !== 'Tất cả' || selectedTopic !== null || sortTab !== 'latest') {
        setSearchQuery('');
        setSelectedSource('Tất cả');
        setSelectedTopic(null);
        setSortTab('latest');
        return true; // prevent default behavior (going back to ExploreScreen)
      }
      return false; // let default behavior happen (go back to ExploreScreen)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
    };
  }, [searchQuery, selectedSource, selectedTopic, sortTab]);

  const handleRefresh = () => {
    if (refreshInFlightRef.current) return;
    fetchPressArticles(true);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || articles.length === 0 || page >= totalPages - 1) {
      return;
    }
    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const queryParams: any = {
        origin: 'EXTERNAL',
        page: nextPage,
        size: 15,
      };

      if (debouncedQuery) {
        queryParams.keyword = debouncedQuery;
      }
      if (selectedSource !== 'Tất cả') {
        queryParams.sourceName = selectedSource;
      }
      if (sortTab === 'topic' && selectedTopic) {
        queryParams.keyword = selectedTopic;
      }

      const response = await apiClient.searchArticles(queryParams);
      const responseData = response.data;
      const newItems = Array.isArray(responseData) ? responseData : responseData.content || [];

      if (newItems.length > 0) {
        setArticles((prev) => {
          const merged = [...prev];
          newItems.forEach((item: Article) => {
            if (!merged.some((m) => m.id === item.id)) {
              merged.push(item);
            }
          });
          return merged;
        });
        setPage(nextPage);
        setHasMore(Array.isArray(responseData) ? false : responseData.hasNext);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.log('Lỗi tải thêm tin điểm báo:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleArticlePress = useCallback((item: Article) => {
    if (item.originalUrl?.trim()) {
      navigation.navigate('ArticleWebView', {
        url: item.originalUrl,
        title: item.title,
        sourceName: item.sourceName,
      });
      return;
    }

    navigation.navigate('ArticleDetail', {
      articleId: item.id,
      articleType: item.type,
    });
  }, [navigation]);

  const handleBookmarkToggle = useCallback(async (item: Article) => {
    toggleBookmark(item.id);
    const isCurrentlyBookmarked = bookmarkedIds.includes(item.id);
    if (!isCurrentlyBookmarked) {
      await localDB.saveBookmarkedArticle(item);
    } else {
      await localDB.deleteBookmarkedArticle(item.id);
    }
  }, [bookmarkedIds, toggleBookmark]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Gần đây';
    const date = new Date(dateStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm} - ${d}/${m}/${y}`;
  };

  // Group search results by source
  const groupedArticles = () => {
    const groups: { [key: string]: Article[] } = {};
    articles.forEach((item) => {
      const src = item.sourceName || 'Nguồn khác';
      if (!groups[src]) groups[src] = [];
      groups[src].push(item);
    });
    return Object.keys(groups).map((source) => ({
      sourceName: source,
      data: groups[source],
    }));
  };

  const getSourceColors = useCallback((sourceName?: string) => {
    const s = (sourceName || '').toLowerCase();
    if (s.includes('vnexpress')) return { bg: '#FFE0DA', text: '#D95C50' }; // đỏ san hô
    if (s.includes('thanh niên') || s.includes('thanh nien')) return { bg: '#D5EEFA', text: '#165AA7' }; // xanh đậm
    if (s.includes('tuổi trẻ') || s.includes('tuoi tre')) return { bg: '#FFE1C7', text: '#E97C28' }; // đỏ cam
    if (s.includes('dân trí') || s.includes('dan tri')) return { bg: '#DDF4FF', text: '#278ABE' }; // xanh lam
    if (s.includes('vietnamnet')) return { bg: '#FFD6DB', text: '#A83547' }; // đỏ rượu
    return { bg: theme.primaryContainer, text: theme.primary };
  }, [theme.primary, theme.primaryContainer]);

  const renderItemCard = (item: Article) => {
    const isBookmarked = bookmarkedIds.includes(item.id);
    const itemBg = item.id % 2 === 0 ? theme.cardBackground : theme.cardBackgroundAlt;
    const srcColors = getSourceColors(item.sourceName);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, { backgroundColor: itemBg, borderColor: theme.border }]}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ backgroundColor: srcColors.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: srcColors.text }}>
                  {(item.sourceName || 'TIN NGOÀI').toUpperCase()}
                </Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: F_SANS }}>
                {item.categoryName || 'Tin tức'}
              </Text>
            </View>
            <Text
              style={[
                styles.cardTitle,
                { color: theme.textPrimary, fontSize: scaleFont(15, fontSize), lineHeight: scaleLineHeight(20, fontSize) },
              ]}
              numberOfLines={3}
            >
              {item.title}
            </Text>
            <Text style={[styles.cardTime, { color: theme.textMuted }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.cardThumb} />
          ) : null}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.footerActionBtn}
            onPress={() => handleArticlePress(item)}
          >
            <ExternalLink size={14} color={theme.tertiary} />
            <Text style={[styles.footerActionText, { color: theme.tertiary }]}>Mở tại nguồn ↗</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerActionBtn}
            onPress={() => handleBookmarkToggle(item)}
          >
            <Bookmark size={14} color={isBookmarked ? theme.primary : theme.textSecondary} fill={isBookmarked ? theme.primary : 'transparent'} />
            <Text style={[styles.footerActionText, { color: isBookmarked ? theme.primary : theme.textSecondary }]}>
              {isBookmarked ? 'Đã lưu' : 'Lưu link'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeaderElement = useMemo(() => {
    const isHeroBookmarked = heroArticle ? bookmarkedIds.includes(heroArticle.id) : false;
    const heroSrcColors = heroArticle ? getSourceColors(heroArticle.sourceName) : { bg: theme.primaryContainer, text: theme.primary };

    return (
      <View>
        {error && articles.length > 0 ? (
          <View style={[styles.inlineWarning, { backgroundColor: theme.primaryContainer, borderColor: theme.border }]}>
            <WifiOff color={theme.primary} size={15} />
            <Text style={[styles.inlineWarningText, { color: theme.textPrimary }]}>Chưa thể cập nhật. Đang hiển thị dữ liệu gần nhất.</Text>
          </View>
        ) : null}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Tổng hợp đường dẫn tin mới từ các nguồn báo khác.
        </Text>

        {/* Horizontal Sources Bar */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourcesScroll}
        >
          {SOURCES.map((src) => {
            const selected = selectedSource === src;
            return (
              <TouchableOpacity
                key={src}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  chipLayouts.current[src] = { x, width };
                }}
                style={[
                  styles.sourceChip,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  selected && { backgroundColor: theme.primary, borderColor: theme.primary },
                ]}
                onPress={() => setSelectedSource(src)}
              >
                <Text
                  style={[
                    styles.sourceChipText,
                    { color: selected ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {src}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sorting and Filter tabs */}
        <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
          {[
            { value: 'latest' as const, label: 'Mới nhất' },
            { value: 'popular' as const, label: 'Đọc nhiều' },
            { value: 'topic' as const, label: selectedTopic ? `# ${selectedTopic}` : 'Theo chủ đề' },
          ].map((tab) => {
            const selected = sortTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={styles.tab}
                onPress={() => {
                  if (tab.value === 'topic') {
                    setShowTopicPicker(!showTopicPicker);
                  } else {
                    setSortTab(tab.value);
                    setSelectedTopic(null);
                    setShowTopicPicker(false);
                  }
                }}
              >
                <View style={styles.tabRow}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: selected ? theme.primary : theme.textSecondary },
                      selected && styles.tabTextSelected,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {tab.value === 'topic' && (
                    <ChevronDown size={12} color={selected ? theme.primary : theme.textSecondary} style={{ marginLeft: 2 }} />
                  )}
                </View>
                {selected && <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Topic Picker Grid (Toggle) */}
        {showTopicPicker && (
          <View style={[styles.topicContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.topicHeader}>
              <Text style={[styles.topicTitle, { color: theme.textPrimary }]}>Chọn chủ đề tin ngoài</Text>
              <TouchableOpacity onPress={() => setShowTopicPicker(false)}>
                <X size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.topicGrid}>
              {CATEGORIES.map((topic) => {
                const active = selectedTopic === topic;
                return (
                  <TouchableOpacity
                    key={topic}
                    style={[
                      styles.topicChip,
                      { borderColor: theme.border },
                      active && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      setSelectedTopic(topic);
                      setSortTab('topic');
                      setShowTopicPicker(false);
                    }}
                  >
                    <Text style={[styles.topicChipText, { color: active ? '#FFFFFF' : theme.textPrimary }]}>
                      {topic}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Hero Article (only if not searching and list has items) */}
        {!debouncedQuery && heroArticle && (
          <TouchableOpacity
            style={[styles.heroCard, { backgroundColor: theme.secondaryContainer, borderColor: theme.border }]}
            onPress={() => handleArticlePress(heroArticle)}
            activeOpacity={0.8}
          >
            {heroArticle.coverImage ? (
              <Image source={{ uri: heroArticle.coverImage }} style={styles.heroImage} />
            ) : null}
            <View style={styles.heroContent}>
              <View style={styles.heroSourceBadgeRow}>
                <View style={[styles.heroSourceBadge, { backgroundColor: heroSrcColors.bg, borderColor: 'transparent' }]}>
                  <Text style={[styles.heroSourceText, { color: heroSrcColors.text }]}>
                    {heroArticle.sourceName}
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: F_SANS }}>
                  {heroArticle.categoryName || 'Tin tức'}
                </Text>
              </View>
              <Text
                style={[
                  styles.heroTitle,
                  { color: theme.textPrimary, fontSize: scaleFont(19, fontSize), lineHeight: scaleLineHeight(25, fontSize) },
                ]}
              >
                {heroArticle.title}
              </Text>
              <Text
                style={[
                  styles.heroSapo,
                  { color: theme.textSecondary, fontSize: scaleFont(13, fontSize), lineHeight: scaleLineHeight(18, fontSize) },
                ]}
                numberOfLines={3}
              >
                {heroArticle.sapo}
              </Text>

              <View style={[styles.cardFooter, { borderTopColor: theme.border, marginTop: 12, paddingHorizontal: 0, paddingBottom: 0 }]}>
                <TouchableOpacity
                  style={styles.footerActionBtn}
                  onPress={() => handleArticlePress(heroArticle)}
                >
                  <ExternalLink size={14} color={theme.tertiary} />
                  <Text style={[styles.footerActionText, { color: theme.tertiary }]}>Mở tại nguồn ↗</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerActionBtn}
                  onPress={() => handleBookmarkToggle(heroArticle)}
                >
                  <Bookmark size={14} color={isHeroBookmarked ? theme.primary : theme.textSecondary} fill={isHeroBookmarked ? theme.primary : 'transparent'} />
                  <Text style={[styles.footerActionText, { color: isHeroBookmarked ? theme.primary : theme.textSecondary }]}>
                    {isHeroBookmarked ? 'Đã lưu' : 'Lưu link'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [error, articles, heroArticle, theme, fontSize, bookmarkedIds, selectedSource, sortTab, selectedTopic, showTopicPicker, debouncedQuery, handleArticlePress, handleBookmarkToggle, getSourceColors]);

  const renderGroupedSearch = () => {
    const groups = groupedArticles();
    if (groups.length === 0) {
      return (
        <View style={styles.center}>
          <Search color={theme.textSecondary} size={32} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Không tìm thấy tin phù hợp</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Thử thay đổi từ khóa hoặc chọn nguồn khác.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 60 }}>
        {groups.map((group) => (
          <View key={group.sourceName} style={styles.groupContainer}>
            <View style={[styles.groupHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.groupTitle, { color: theme.textPrimary }]}>{group.sourceName}</Text>
              <Text style={[styles.groupCount, { color: theme.textSecondary }]}>
                {group.data.length} kết quả
              </Text>
            </View>
            {group.data.map((item) => renderItemCard(item))}
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.pageBackground }]}>
      {/* Search and Navigation Header */}
      <View style={[styles.topBar, { backgroundColor: theme.headerBackground, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' }]}>
        <TouchableOpacity
          onPress={() => {
            if (searchQuery !== '' || selectedSource !== 'Tất cả' || selectedTopic !== null || sortTab !== 'latest') {
              setSearchQuery('');
              setSelectedSource('Tất cả');
              setSelectedTopic(null);
              setSortTab('latest');
            } else {
              navigation.goBack();
            }
          }}
          style={[styles.headerButton, { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.1)' }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          <Search size={16} color={theme.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Tìm kiếm tin ngoài..."
            placeholderTextColor={theme.textSecondary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Main Content */}
      {debouncedQuery ? (
        renderGroupedSearch()
      ) : loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error && articles.length === 0 ? (
        <View style={styles.center}>
          <WifiOff color={theme.textSecondary} size={36} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Không thể tải tin điểm báo</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.primary }]}
            onPress={() => fetchPressArticles()}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.center}>
          <Compass color={theme.textSecondary} size={36} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Chưa có bài viết điểm báo</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Không tìm thấy bài viết nào phù hợp trong nguồn hoặc danh mục này.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listArticles} // Hero article is articles[0]
          keyExtractor={(item) => item.id.toString()}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={listHeaderElement}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={theme.primary} /> : null
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => renderItemCard(item)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: F_SANS,
    padding: 0,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: F_SANS,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sourcesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sourceChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceChipText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: F_SANS,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 10,
    marginHorizontal: 16,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: F_SANS,
  },
  tabTextSelected: {
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    left: 14,
    right: 14,
  },
  listContainer: {
    paddingBottom: 60,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  heroContent: {
    padding: 16,
  },
  heroSourceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroSourceBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  heroSourceText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: F_SANS,
  },
  heroTitle: {
    fontFamily: F_SERIF,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroSapo: {
    fontFamily: F_SANS,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardSourceText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: F_SANS,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: F_SERIF,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: F_SANS,
  },
  cardThumb: {
    width: 104,
    height: 78,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  footerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  footerActionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: F_SANS,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyText: {
    fontFamily: F_SANS,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  topicContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
    paddingBottom: 6,
  },
  topicTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: F_SANS,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  topicChipText: {
    fontSize: 12,
    fontFamily: F_SANS,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: F_SANS,
  },
  groupCount: {
    fontSize: 12,
    fontFamily: F_SANS,
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  inlineWarningText: {
    fontSize: 12,
    fontFamily: F_SANS,
    flex: 1,
  },
});
