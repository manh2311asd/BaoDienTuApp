import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItemInfo,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Code2,
  Dumbbell,
  Eye,
  HeartPulse,
  Home,
  Newspaper,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react-native';
import { Article, Category } from '../../types/content';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../../components/Toast/ToastContext';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { mainShellTheme } from '../../theme/colors';

type ExploreSection = 'latest' | 'popular' | 'journalists';

interface AuthorSummary {
  id: number;
  name: string;
  articleCount: number;
  viewCount: number;
}

interface CachedValue<T> {
  savedAt: number;
  data: T;
}

interface ExploreRefreshTargets {
  articles: boolean;
  categories: boolean;
  pointNews: boolean;
  topicCounts: boolean;
}

interface TopicDefinition {
  id: number;
  name: string;
  kind: 'technology' | 'entertainment' | 'business' | 'health' | 'sport' | 'life';
  background: string;
  accent: string;
}

type ExploreRow =
  | { kind: 'article'; key: string; value: Article; featured: boolean }
  | { kind: 'author'; key: string; value: AuthorSummary };

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;

const ARTICLE_CACHE_KEY = '@BaoDienTu:explore_articles_v2';
const CATEGORY_CACHE_KEY = '@BaoDienTu:explore_categories_v2';
const POINT_NEWS_CACHE_KEY = '@BaoDienTu:explore_point_news_v2';
const TOPIC_COUNTS_CACHE_KEY = '@BaoDienTu:explore_topic_counts_v1';
const ARTICLE_TTL = 5 * 60 * 1000;
const CATEGORY_TTL = 45 * 60 * 1000;
const POINT_NEWS_TTL = 8 * 60 * 1000;
const TOPIC_COUNTS_TTL = 5 * 60 * 1000;
const ALL_EXPLORE_TARGETS: ExploreRefreshTargets = {
  articles: true,
  categories: true,
  pointNews: true,
  topicCounts: true,
};

let lastExploreFetchAt = 0;

const TOPIC_CONFIG: Omit<TopicDefinition, 'id'>[] = [
  { name: 'Công nghệ', kind: 'technology', background: mainShellTheme.light.appBlueContainer, accent: mainShellTheme.light.appBlueIcon },
  { name: 'Giải trí', kind: 'entertainment', background: mainShellTheme.light.appRoseContainer, accent: mainShellTheme.light.appPrimaryPressed },
  { name: 'Kinh doanh', kind: 'business', background: mainShellTheme.light.appYellowContainer, accent: mainShellTheme.light.appWarning },
  { name: 'Sức khỏe', kind: 'health', background: mainShellTheme.light.appSecondaryContainer, accent: mainShellTheme.light.appSuccess },
  { name: 'Thể thao', kind: 'sport', background: mainShellTheme.light.appSportContainer, accent: mainShellTheme.light.appSuccess },
  { name: 'Đời sống', kind: 'life', background: mainShellTheme.light.appLifeContainer, accent: mainShellTheme.light.appSecondary },
];

function getTopicContainer(kind: TopicDefinition['kind'], dark: boolean) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  if (kind === 'technology') return palette.appBlueContainer;
  if (kind === 'entertainment') return palette.appRoseContainer;
  if (kind === 'business') return palette.appYellowContainer;
  if (kind === 'health') return palette.appSecondaryContainer;
  if (kind === 'sport') return palette.appSportContainer;
  return palette.appLifeContainer;
}

function normalize(value = '') {
  return value.trim().toLocaleLowerCase('vi-VN');
}

function extractArticles(data: unknown): Article[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content?: Article[] }).content;
    return Array.isArray(content) ? content : [];
  }
  return [];
}

function extractTotalArticles(data: unknown) {
  if (
    data &&
    typeof data === 'object' &&
    'totalElements' in data &&
    typeof (data as { totalElements?: unknown }).totalElements === 'number'
  ) {
    return (data as { totalElements: number }).totalElements;
  }
  return extractArticles(data).length;
}

function isLastPage(data: unknown) {
  return Boolean(
    data && typeof data === 'object' && 'last' in data && (data as { last?: boolean }).last
  );
}

async function readCache<T>(key: string): Promise<CachedValue<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CachedValue<T>) : null;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // Cache must never block the news feed.
  }
}

async function fetchTopicCounts(categories: Category[]) {
  const matchedTopics = TOPIC_CONFIG.map((topic) => {
    const category = categories.find(
      (item) => normalize(item.name) === normalize(topic.name)
    );
    return category ? { categoryId: category.id } : null;
  }).filter((item): item is { categoryId: number } => Boolean(item));

  const results = await Promise.allSettled(
    matchedTopics.map(async ({ categoryId }) => {
      const response = await apiClient.searchArticles({
        categoryId,
        origin: 'INTERNAL',
        page: 0,
        size: 1,
      });
      return [String(categoryId), extractTotalArticles(response.data)] as const;
    })
  );

  return results.reduce<Record<string, number>>((counts, result) => {
    if (result.status === 'fulfilled') {
      const [categoryId, count] = result.value;
      counts[categoryId] = count;
    }
    return counts;
  }, {});
}

function TopicGlyph({ kind, color }: Pick<TopicDefinition, 'kind'> & { color: string }) {
  const props = { color, size: 17, ...IC };
  if (kind === 'technology') return <Code2 {...props} />;
  if (kind === 'entertainment') return <Sparkles {...props} />;
  if (kind === 'business') return <BriefcaseBusiness {...props} />;
  if (kind === 'health') return <HeartPulse {...props} />;
  if (kind === 'sport') return <Dumbbell {...props} />;
  return <Home {...props} />;
}

const TopicCard = memo(function TopicCard({
  topic,
  count,
  selected,
  onPress,
  dark,
}: {
  topic: TopicDefinition;
  count: number | null;
  selected: boolean;
  onPress: (topic: TopicDefinition) => void;
  dark: boolean;
}) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  const background = dark ? getTopicContainer(topic.kind, true) : topic.background;
  const textColor = palette.appTextPrimary;
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Mở chủ đề ${topic.name}`}
      style={[
        styles.topicCard,
        {
          backgroundColor: background,
          borderColor: selected ? palette.appPrimary : palette.appBorder,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
      onPress={() => onPress(topic)}
    >
      <View style={[styles.topicIcon, { backgroundColor: palette.appSurface }]}>
        <TopicGlyph kind={topic.kind} color={dark ? palette.appHeaderAccent : topic.accent} />
      </View>
      <View style={styles.topicCopy}>
        <Text style={[styles.topicName, { color: textColor }]} numberOfLines={2}>
          {topic.name}
        </Text>
        <Text
          style={[styles.topicCount, { color: palette.appTextSecondary }]}
          numberOfLines={1}
        >
          {count === null
            ? 'Đang cập nhật'
            : count > 0
              ? `${count} bài`
              : 'Chưa có bài'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const PointNewsShortcut = memo(function PointNewsShortcut({
  count,
  dark,
  onOpenAll,
}: {
  count: number;
  dark: boolean;
  onOpenAll: () => void;
}) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  return (
    <View
      style={[
        styles.pointNewsCard,
        {
          backgroundColor: palette.appBlueContainer,
          borderColor: palette.appBorder,
        },
      ]}
      testID="point-news-card"
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Xem tất cả Điểm báo"
        activeOpacity={0.76}
        style={styles.pointNewsHeader}
        onPress={onOpenAll}
        testID="open-all-point-news"
      >
        <View style={[styles.pointNewsIcon, { backgroundColor: palette.appSurface }]}>
          <Newspaper color={palette.appBlueIcon} size={17} {...IC} />
        </View>
        <View style={styles.pointNewsCopy}>
          <Text style={[styles.pointNewsTitle, { color: palette.appTextPrimary }]}>Điểm báo</Text>
          <Text
            style={[styles.pointNewsSubtitle, { color: palette.appTextSecondary }]}
            numberOfLines={1}
          >
            {count > 0
              ? `${count} nguồn tin được chọn lọc`
              : 'Tin nổi bật từ các nguồn uy tín'}
          </Text>
        </View>
        <Text style={[styles.pointNewsAction, { color: palette.appPrimary }]}>Xem tất cả</Text>
        <ChevronRight color={palette.appPrimary} size={16} {...IC} />
      </TouchableOpacity>

    </View>
  );
});

const SectionHeader = memo(function SectionHeader({
  eyebrow,
  title,
  dark,
}: {
  eyebrow: string;
  title: string;
  dark: boolean;
}) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  return (
    <View style={styles.sectionHeadingRow}>
      <View>
        <Text style={[styles.sectionEyebrow, { color: palette.appPrimary }]}>{eyebrow}</Text>
        <Text style={[styles.sectionTitle, { color: palette.appTextPrimary }]}>{title}</Text>
      </View>
    </View>
  );
});

const ExploreArticleCard = memo(function ExploreArticleCard({
  article,
  featured,
  showImages,
  fontSize,
  dark,
  onPress,
}: {
  article: Article;
  featured: boolean;
  showImages: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  dark: boolean;
  onPress: (article: Article) => void;
}) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  const text = palette.appTextPrimary;
  const muted = palette.appTextSecondary;
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      style={[
        styles.articleCard,
        featured && styles.featuredArticleCard,
        {
          backgroundColor: palette.appSurface,
          borderColor: palette.appBorder,
        },
      ]}
      onPress={() => onPress(article)}
    >
      <View style={styles.articleCopy}>
        <View style={styles.articleMetaTop}>
          <Text style={[styles.category, { color: palette.appPrimary }]}>
            {(article.categoryName || article.sourceName || 'Tin tức').toUpperCase()}
          </Text>
          {article.type === 'VIP' && (
            <View style={[styles.vipBadge, { backgroundColor: palette.appYellowContainer }]}>
              <Star color={palette.appWarning} fill={palette.appWarning} size={9} {...IC} />
              <Text style={[styles.vipText, { color: palette.appWarning }]}>VIP</Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={fontSize === 'xlarge' ? 4 : 3}
          style={[
            styles.articleTitle,
            {
              color: text,
              fontSize: scaleFont(featured ? 18 : 17, fontSize),
              lineHeight: scaleLineHeight(featured ? 23 : 22, fontSize),
            },
          ]}
        >
          {article.title}
        </Text>
        <View style={styles.articleFooter}>
          <Text style={[styles.author, { color: muted }]} numberOfLines={1}>
            {article.origin === 'EXTERNAL'
              ? article.sourceName || 'Nguồn ngoài'
              : article.authorName}
          </Text>
          <Eye color={muted} size={12} {...IC} />
          <Text style={[styles.viewCount, { color: muted }]}>{article.viewCount}</Text>
        </View>
      </View>
      {showImages && article.coverImage ? (
        <Image
          source={{ uri: article.coverImage }}
          style={[styles.thumbnail, featured && styles.featuredThumbnail]}
        />
      ) : (
        <View
          style={[
            styles.thumbnail,
            featured && styles.featuredThumbnail,
            { backgroundColor: palette.appSurfaceMuted },
          ]}
        />
      )}
    </TouchableOpacity>
  );
});

const AuthorCard = memo(function AuthorCard({
  author,
  followed,
  loading,
  dark,
  onOpen,
  onToggle,
}: {
  author: AuthorSummary;
  followed: boolean;
  loading: boolean;
  dark: boolean;
  onOpen: (author: AuthorSummary) => void;
  onToggle: (author: AuthorSummary) => void;
}) {
  const palette = mainShellTheme[dark ? 'dark' : 'light'];
  const text = palette.appTextPrimary;
  const muted = palette.appTextSecondary;
  return (
    <View
      style={[
        styles.authorCard,
        {
          backgroundColor: palette.appSurface,
          borderColor: palette.appBorder,
        },
      ]}
    >
      <TouchableOpacity style={styles.authorIdentity} onPress={() => onOpen(author)}>
        <View style={[styles.authorAvatar, { backgroundColor: palette.appBlueContainer }]}>
          <Text style={[styles.authorInitial, { color: palette.appSecondary }]}>
            {author.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.authorCopy}>
          <Text style={[styles.authorName, { color: text }]} numberOfLines={1}>
            {author.name}
          </Text>
          <Text style={[styles.authorStats, { color: muted }]}>
            {author.articleCount} bài · {author.viewCount} lượt đọc
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={followed ? `Bỏ theo dõi ${author.name}` : `Theo dõi ${author.name}`}
        hitSlop={{ top: 7, bottom: 7 }}
        style={[
          styles.followButton,
          {
            backgroundColor: followed ? 'transparent' : palette.appPrimary,
            borderColor: followed ? palette.appBorder : 'transparent',
          },
        ]}
        onPress={() => onToggle(author)}
      >
        {loading ? (
          <ActivityIndicator size="small" color={followed ? text : palette.appOnPrimary} />
        ) : followed ? (
          <Check color={text} size={14} {...IC} />
        ) : (
          <Bell color={palette.appOnPrimary} size={14} {...IC} />
        )}
        <Text style={[styles.followText, { color: followed ? text : palette.appOnPrimary }]}>
          {followed ? 'Đang theo dõi' : 'Theo dõi'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});

export default function ExploreScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const {
    addSubscription,
    fontSize,
    removeSubscription,
    showImages,
    subscriptions,
    themeMode,
    user,
  } = useAppStore();
  const { showToast } = useToast();
  const dark = themeMode === 'dark';
  const aliveRef = useRef(true);
  const categoriesRef = useRef<Category[]>([]);
  const topicRequestId = useRef(0);
  const [section, setSection] = useState<ExploreSection>('latest');
  const [articles, setArticles] = useState<Article[]>([]);
  const [topicArticles, setTopicArticles] = useState<Article[]>([]);
  const [pointNews, setPointNews] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topicCounts, setTopicCounts] = useState<Map<number, number>>(new Map());
  const [activeTopic, setActiveTopic] = useState<Pick<TopicDefinition, 'id' | 'name'> | null>(null);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showPointNews, setShowPointNews] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [topicPage, setTopicPage] = useState(0);
  const [topicHasMore, setTopicHasMore] = useState(false);
  const [topicLoading, setTopicLoading] = useState(false);
  const [followLoadingId, setFollowLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const requestedSection = route?.params?.initialSection as
      | 'latest'
      | 'journalists'
      | undefined;
    if (!requestedSection) return;
    topicRequestId.current += 1;
    setShowPointNews(false);
    setActiveTopic(null);
    setTopicArticles([]);
    setTopicLoading(false);
    setQuery('');
    setSection(requestedSection);
    navigation.setParams({ initialSection: undefined });
  }, [navigation, route?.params?.initialSection]);

  const refreshData = useCallback(async (
    manual = false,
    targets: ExploreRefreshTargets = ALL_EXPLORE_TARGETS
  ) => {
    if (
      !targets.articles &&
      !targets.categories &&
      !targets.pointNews &&
      !targets.topicCounts
    ) return;
    manual ? setRefreshing(true) : setBackgroundFetching(true);

    const tasks: Promise<unknown>[] = [];
    let categoryTask: Promise<Category[]> | null = null;
    if (targets.categories) {
      categoryTask = apiClient.getCategories().then((response) => {
        const next = Array.isArray(response.data) ? response.data : [];
        if (aliveRef.current) {
          categoriesRef.current = next;
          setCategories(next);
        }
        writeCache(CATEGORY_CACHE_KEY, next);
        return next;
      });
      tasks.push(categoryTask);
    }

    if (targets.topicCounts) {
      const categorySource = categoryTask || Promise.resolve(categoriesRef.current);
      tasks.push(categorySource.then(async (source) => {
        if (source.length === 0) return;
        const counts = await fetchTopicCounts(source);
        if (!aliveRef.current) return;
        setTopicCounts(
          new Map(Object.entries(counts).map(([id, count]) => [Number(id), count]))
        );
        writeCache(TOPIC_COUNTS_CACHE_KEY, counts);
      }));
    }

    if (targets.articles) {
      tasks.push(apiClient
        .searchArticles({ origin: 'INTERNAL', page: 0, size: 20 })
        .then((response) => {
          if (!aliveRef.current) return;
          const next = extractArticles(response.data);
          setArticles(next);
          setPage(0);
          setHasMore(next.length >= 20 && !isLastPage(response.data));
          lastExploreFetchAt = Date.now();
          writeCache(ARTICLE_CACHE_KEY, next);
        })
        .finally(() => aliveRef.current && setInitialLoading(false)));
    }

    if (targets.pointNews) {
      tasks.push(apiClient
        .searchArticles({ origin: 'EXTERNAL', page: 0, size: 3 })
        .then((response) => {
        if (!aliveRef.current) return;
        const next = extractArticles(response.data).slice(0, 3);
        setPointNews(next);
        writeCache(POINT_NEWS_CACHE_KEY, next);
        }));
    }

    const results = await Promise.allSettled(tasks);
    if (!aliveRef.current) return;
    if (results.every((result) => result.status === 'rejected')) {
      showToast('Đang hiển thị nội dung gần nhất. Kéo xuống để thử lại.');
      setInitialLoading(false);
    }
    setRefreshing(false);
    setBackgroundFetching(false);
  }, [showToast]);

  useEffect(() => {
    aliveRef.current = true;
    const hydrate = async () => {
      const [articleCache, categoryCache, pointCache, topicCountCache] = await Promise.all([
        readCache<Article[]>(ARTICLE_CACHE_KEY),
        readCache<Category[]>(CATEGORY_CACHE_KEY),
        readCache<Article[]>(POINT_NEWS_CACHE_KEY),
        readCache<Record<string, number>>(TOPIC_COUNTS_CACHE_KEY),
      ]);
      if (!aliveRef.current) return;

      if (articleCache?.data.length) {
        setArticles(articleCache.data);
        setInitialLoading(false);
        lastExploreFetchAt = articleCache.savedAt;
      }
      if (categoryCache?.data.length) {
        categoriesRef.current = categoryCache.data;
        setCategories(categoryCache.data);
      }
      if (pointCache?.data.length) setPointNews(pointCache.data.slice(0, 3));
      if (topicCountCache?.data) {
        setTopicCounts(
          new Map(
            Object.entries(topicCountCache.data).map(([id, count]) => [Number(id), count])
          )
        );
      }

      const now = Date.now();
      const articleStale = !articleCache || now - articleCache.savedAt > ARTICLE_TTL;
      const categoryStale = !categoryCache || now - categoryCache.savedAt > CATEGORY_TTL;
      const pointStale = !pointCache || now - pointCache.savedAt > POINT_NEWS_TTL;
      const topicCountsStale =
        !topicCountCache || now - topicCountCache.savedAt > TOPIC_COUNTS_TTL;
      refreshData(false, {
        articles: articleStale || now - lastExploreFetchAt > ARTICLE_TTL,
        categories: categoryStale,
        pointNews: pointStale,
        topicCounts: topicCountsStale,
      });
    };
    hydrate();
    return () => {
      aliveRef.current = false;
    };
  }, [refreshData]);

  const normalizedQuery = normalize(query);
  const baseArticles = activeTopic
    ? topicArticles
    : showPointNews
      ? pointNews
      : articles;
  const visibleArticles = useMemo(() => {
    const filtered = baseArticles.filter((article) =>
      !normalizedQuery
        ? true
        : [article.title, article.authorName, article.categoryName, article.sourceName].some(
            (value) => normalize(value).includes(normalizedQuery)
          )
    );
    return [...filtered].sort((left, right) =>
      section === 'popular'
        ? right.viewCount - left.viewCount
        : new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  }, [baseArticles, normalizedQuery, section]);

  const authors = useMemo(() => {
    const grouped = new Map<number, AuthorSummary>();
    articles.forEach((article) => {
      if (!article.authorId) return;
      const current = grouped.get(article.authorId);
      grouped.set(article.authorId, {
        id: article.authorId,
        name: article.authorName || `Tác giả #${article.authorId}`,
        articleCount: (current?.articleCount || 0) + 1,
        viewCount: (current?.viewCount || 0) + article.viewCount,
      });
    });
    return [...grouped.values()]
      .filter((author) => !normalizedQuery || normalize(author.name).includes(normalizedQuery))
      .sort((left, right) => right.articleCount - left.articleCount || right.viewCount - left.viewCount);
  }, [articles, normalizedQuery]);

  const topics = useMemo<TopicDefinition[]>(() => {
    return TOPIC_CONFIG.map((topic, index) => {
      const apiCategory = categories.find((item) => normalize(item.name) === normalize(topic.name));
      return { ...topic, id: apiCategory?.id ?? -(index + 1) };
    });
  }, [categories]);

  const isFollowing = useCallback(
    (authorId: number) =>
      subscriptions.some(
        (item) => item.targetType === 'AUTHOR' && item.targetId === authorId
      ),
    [subscriptions]
  );

  const toggleFollow = useCallback(async (author: AuthorSummary) => {
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
      showToast(error instanceof Error ? error.message : 'Không thể cập nhật theo dõi lúc này');
    } finally {
      setFollowLoadingId(null);
    }
  }, [addSubscription, isFollowing, navigation, removeSubscription, showToast, user]);

  const openArticle = useCallback((article: Article) => {
    if (article.origin === 'EXTERNAL' && article.originalUrl) {
      navigation.navigate('ArticleWebView', { url: article.originalUrl, title: article.title });
      return;
    }
    navigation.navigate('ArticleDetail', { articleId: article.id, articleType: article.type });
  }, [navigation]);

  const openAuthor = useCallback((author: AuthorSummary) => {
    navigation.navigate('AuthorDetail', { authorId: author.id, authorName: author.name });
  }, [navigation]);

  const loadTopic = useCallback(async (
    topic: Pick<TopicDefinition, 'id' | 'name'>,
    manual = false
  ) => {
    if (topic.id <= 0) {
      showToast('Danh mục đang được cập nhật. Vui lòng thử lại sau ít giây.');
      return;
    }

    const currentRequestId = ++topicRequestId.current;
    if (manual) setRefreshing(true);
    else setTopicLoading(true);

    try {
      const response = await apiClient.searchArticles({
        categoryId: topic.id,
        origin: 'INTERNAL',
        page: 0,
        size: 20,
      });
      if (!aliveRef.current || currentRequestId !== topicRequestId.current) return;
      const next = extractArticles(response.data);
      setTopicArticles(next);
      setTopicPage(0);
      setTopicHasMore(next.length >= 20 && !isLastPage(response.data));
    } catch (error) {
      if (currentRequestId === topicRequestId.current) {
        showToast(
          error instanceof Error
            ? error.message
            : `Không thể tải bài thuộc chủ đề ${topic.name}`
        );
      }
    } finally {
      if (currentRequestId === topicRequestId.current) {
        setRefreshing(false);
        setTopicLoading(false);
      }
    }
  }, [showToast]);

  const chooseTopic = useCallback((topic: TopicDefinition) => {
    if (topic.id <= 0) {
      loadTopic(topic);
      return;
    }
    setShowPointNews(false);
    setSection('latest');
    setQuery('');
    setActiveTopic({ id: topic.id, name: topic.name });
    setTopicArticles([]);
    loadTopic(topic);
  }, [loadTopic]);

  const updateSearchQuery = useCallback((value: string) => {
    topicRequestId.current += 1;
    setTopicLoading(false);
    setActiveTopic(null);
    setTopicArticles([]);
    setQuery(value);
  }, []);

  const chooseSection = useCallback((next: ExploreSection) => {
    setShowPointNews(false);
    setSection(next);
  }, []);

  const openPointNews = useCallback(() => {
    navigation.navigate('PressReview');
  }, [navigation]);

  const refreshCurrentFeed = useCallback(() => {
    if (activeTopic) {
      loadTopic(activeTopic, true);
      return;
    }
    refreshData(true);
  }, [activeTopic, loadTopic, refreshData]);

  const rows = useMemo<ExploreRow[]>(() => {
    if (section === 'journalists' && !showPointNews) {
      return authors.map((author) => ({ kind: 'author', key: `author-${author.id}`, value: author }));
    }
    return visibleArticles.map((article, index) => ({
      kind: 'article',
      key: `article-${article.origin || 'internal'}-${article.id}`,
      value: article,
      featured: index === 0,
    }));
  }, [authors, section, showPointNews, visibleArticles]);

  const loadMoreArticles = useCallback(async () => {
    const canLoadMore = activeTopic ? topicHasMore : hasMore;
    if (showPointNews || section === 'journalists' || loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    try {
      const nextPage = activeTopic ? topicPage + 1 : page + 1;
      const response = await apiClient.searchArticles({
        categoryId: activeTopic?.id,
        origin: 'INTERNAL',
        page: nextPage,
        size: 20,
      });
      const incoming = extractArticles(response.data);
      const currentArticles = activeTopic ? topicArticles : articles;
      const known = new Set(currentArticles.map((article) => article.id));
      const merged = [
        ...currentArticles,
        ...incoming.filter((article) => !known.has(article.id)),
      ];
      if (activeTopic) {
        setTopicArticles(merged);
        setTopicPage(nextPage);
        setTopicHasMore(incoming.length >= 20 && !isLastPage(response.data));
      } else {
        setArticles(merged);
        setPage(nextPage);
        setHasMore(incoming.length >= 20 && !isLastPage(response.data));
        writeCache(ARTICLE_CACHE_KEY, merged);
      }
    } catch {
      if (activeTopic) setTopicHasMore(false);
      else setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [
    activeTopic,
    articles,
    hasMore,
    loadingMore,
    page,
    section,
    showPointNews,
    topicArticles,
    topicHasMore,
    topicPage,
  ]);

  const renderRow = useCallback(({ item }: ListRenderItemInfo<ExploreRow>) => {
    if (item.kind === 'author') {
      return (
        <AuthorCard
          author={item.value}
          followed={isFollowing(item.value.id)}
          loading={followLoadingId === item.value.id}
          dark={dark}
          onOpen={openAuthor}
          onToggle={toggleFollow}
        />
      );
    }
    return (
      <ExploreArticleCard
        article={item.value}
        featured={item.featured}
        showImages={showImages}
        fontSize={fontSize}
        dark={dark}
        onPress={openArticle}
      />
    );
  }, [dark, followLoadingId, fontSize, isFollowing, openArticle, openAuthor, showImages, toggleFollow]);

  const shell = mainShellTheme[themeMode];
  const canvas = shell.appBackground;
  const text = shell.appTextPrimary;
  const muted = shell.appTextSecondary;
  const border = shell.appBorder;
  const header = shell.appHeader;
  const feedLoading = topicLoading || (initialLoading && articles.length === 0);

  const listHeader = useMemo(() => (
    <View>
      <View style={[styles.masthead, { backgroundColor: header }]}>
        <View style={styles.mastheadTitleRow}>
          <View>
            <Text style={[styles.eyebrow, { color: shell.appHeaderAccent }]}>NEWSDAILY EDIT</Text>
            <Text style={[styles.heading, { color: shell.appHeaderText }]}>Khám phá</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Mở Điểm báo"
            accessibilityRole="button"
            activeOpacity={0.72}
            style={[
              styles.mastheadAction,
              { borderColor: shell.appBorder, backgroundColor: shell.appSurface },
            ]}
            onPress={openPointNews}
            testID="open-point-news-header"
          >
            {backgroundFetching && !refreshing ? (
              <ActivityIndicator color={shell.appPrimary} size="small" />
            ) : (
              <Newspaper color={shell.appControlIcon} size={21} {...IC} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerContent}>
        <PointNewsShortcut
          count={pointNews.length}
          dark={dark}
          onOpenAll={openPointNews}
        />

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: shell.appSurface,
              borderColor: searchFocused ? shell.appPrimary : border,
            },
          ]}
        >
          <Search color={shell.appPrimary} size={18} {...IC} />
          <TextInput
            value={query}
            onChangeText={updateSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={[styles.searchInput, { color: text }]}
            placeholder="Tìm bài viết, chủ đề hoặc tác giả"
            placeholderTextColor={shell.appSearchPlaceholder}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              accessibilityLabel="Xóa từ khóa"
              hitSlop={8}
              onPress={() => updateSearchQuery('')}
              style={styles.clearButton}
            >
              <X color={muted} size={17} {...IC} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.tabs, { borderBottomColor: border }]}>
          {[
            { value: 'latest' as const, label: 'Mới nhất' },
            { value: 'popular' as const, label: 'Xem nhiều' },
            { value: 'journalists' as const, label: 'Tác giả' },
          ].map((item) => {
            const selected = section === item.value && !showPointNews;
            return (
              <TouchableOpacity
                key={item.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.tab}
                onPress={() => chooseSection(item.value)}
              >
                <Text style={[styles.tabText, { color: selected ? text : muted }, selected && styles.tabTextSelected]}>
                  {item.label}
                </Text>
                <View style={[styles.tabUnderline, { backgroundColor: selected ? shell.appPrimary : 'transparent' }]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <SectionHeader eyebrow="DÀNH CHO BẠN" title="Chủ đề nổi bật" dark={dark} />
        <View style={styles.topicGrid}>
          {topics.slice(0, 6).map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              count={topic.id > 0 ? topicCounts.get(topic.id) ?? null : null}
              selected={activeTopic?.id === topic.id}
              onPress={chooseTopic}
              dark={dark}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.allTopicsButton} onPress={() => navigation.navigate('HomeTab')}>
          <Text style={[styles.allTopicsText, { color: shell.appPrimary }]}>Xem tất cả chủ đề</Text>
          <ChevronRight color={shell.appPrimary} size={16} {...IC} />
        </TouchableOpacity>

        <View style={styles.feedHeading}>
          <Text style={[styles.sectionTitle, { color: text }]}>
            {showPointNews
              ? 'Điểm báo chọn lọc'
              : section === 'journalists'
                ? 'Cây bút nổi bật'
                : activeTopic
                  ? section === 'popular'
                    ? `${activeTopic.name} · Xem nhiều`
                    : activeTopic.name
                  : section === 'popular'
                    ? 'Được đọc nhiều'
                    : 'Mới nhất'}
          </Text>
          {feedLoading && <ActivityIndicator color={shell.appPrimary} size="small" />}
        </View>
      </View>
    </View>
  ), [activeTopic, backgroundFetching, border, chooseSection, chooseTopic, dark, feedLoading, header, muted, navigation, openPointNews, pointNews.length, query, refreshing, searchFocused, section, shell, showPointNews, text, topicCounts, topics, updateSearchQuery]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: canvas }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: 78 + insets.bottom },
          rows.length === 0 && styles.emptyList,
        ]}
        refreshing={refreshing}
        onRefresh={refreshCurrentFeed}
        onEndReached={loadMoreArticles}
        onEndReachedThreshold={0.4}
        initialNumToRender={5}
        maxToRenderPerBatch={7}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={shell.appPrimary} style={styles.footerLoader} /> : null}
        ListEmptyComponent={!feedLoading ? (
          <View style={styles.emptyState}>
            <Search color={muted} size={28} {...IC} />
            <Text style={[styles.emptyTitle, { color: text }]}>
              {activeTopic ? `Chưa có bài ${activeTopic.name}` : 'Chưa tìm thấy kết quả'}
            </Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              {activeTopic
                ? 'Danh mục này hiện chưa có bài đã xuất bản.'
                : 'Thử một từ khóa khác hoặc chọn lại mục Mới nhất.'}
            </Text>
          </View>
        ) : (
          <View style={styles.skeletonList}>
            {[0, 1].map((item) => <View key={item} style={[styles.skeletonRow, { backgroundColor: shell.appSurfaceMuted }]} />)}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingBottom: 42 },
  emptyList: { flexGrow: 1 },
  masthead: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  mastheadTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mastheadAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 9 },
  eyebrow: { color: mainShellTheme.light.appHeaderAccent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  heading: { marginTop: 2, color: mainShellTheme.light.appHeaderText, fontFamily: F_SERIF, fontSize: 31, fontWeight: '700', letterSpacing: -0.5 },
  headerContent: { paddingHorizontal: 16 },
  searchBox: { height: 48, marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 9 },
  searchInput: { flex: 1, marginLeft: 9, paddingVertical: 0, fontSize: 14 },
  clearButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  tabs: { height: 48, marginTop: 6, flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  tabText: { paddingBottom: 9, fontSize: 13, fontWeight: '600' },
  tabTextSelected: { fontWeight: '800' },
  tabUnderline: { width: '62%', height: 2, borderRadius: 1 },
  pointNewsCard: { marginTop: 7, overflow: 'hidden', borderWidth: 1, borderRadius: 10 },
  pointNewsHeader: { minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  pointNewsIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pointNewsCopy: { flex: 1, marginLeft: 10, marginRight: 6 },
  pointNewsTitle: { fontFamily: F_SERIF, fontSize: 15, fontWeight: '700' },
  pointNewsSubtitle: { marginTop: 2, fontSize: 11 },
  pointNewsAction: { fontSize: 10, fontWeight: '800' },
  sectionHeadingRow: { marginTop: 18, marginBottom: 8 },
  sectionEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  sectionTitle: { marginTop: 3, fontFamily: F_SERIF, fontSize: 21, fontWeight: '700', letterSpacing: -0.25 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  topicCard: { width: '48.5%', maxWidth: '48.5%', minHeight: 64, marginBottom: 8, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 9 },
  topicIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  topicCopy: { flex: 1, minWidth: 0, marginLeft: 7 },
  topicName: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  topicCount: { marginTop: 1, fontSize: 9.5 },
  allTopicsButton: { alignSelf: 'flex-end', minHeight: 36, flexDirection: 'row', alignItems: 'center' },
  allTopicsText: { fontSize: 12, fontWeight: '800' },
  feedHeading: { minHeight: 54, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  articleCard: { minHeight: 100, marginHorizontal: 16, marginBottom: 10, padding: 12, flexDirection: 'row', borderWidth: 1, borderRadius: 10 },
  featuredArticleCard: { minHeight: 100 },
  articleCopy: { flex: 1, paddingRight: 12 },
  articleMetaTop: { minHeight: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  category: { fontSize: 9, fontWeight: '800', letterSpacing: 0.55 },
  vipBadge: { marginLeft: 7, paddingHorizontal: 5, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', borderRadius: 4 },
  vipText: { marginLeft: 3, fontSize: 8, fontWeight: '800' },
  articleTitle: { fontFamily: F_SERIF, fontWeight: '700' },
  articleFooter: { marginTop: 7, flexDirection: 'row', alignItems: 'center' },
  author: { flex: 1, marginRight: 8, fontSize: 11 },
  viewCount: { marginLeft: 4, fontSize: 11 },
  thumbnail: { width: 92, height: 72, borderRadius: 8 },
  featuredThumbnail: { width: 92, height: 72 },
  authorCard: { minHeight: 82, marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  authorIdentity: { flex: 1, minWidth: 0, paddingVertical: 11, flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  authorInitial: { fontFamily: F_SERIF, fontSize: 19, fontWeight: '700' },
  authorCopy: { flex: 1, marginLeft: 10 },
  authorName: { fontFamily: F_SERIF, fontSize: 16, fontWeight: '700' },
  authorStats: { marginTop: 3, fontSize: 10.5 },
  followButton: { minWidth: 82, height: 34, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7 },
  followText: { marginLeft: 4, fontSize: 9.5, fontWeight: '800' },
  emptyState: { paddingHorizontal: 30, paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { marginTop: 10, fontFamily: F_SERIF, fontSize: 18, fontWeight: '700' },
  emptyText: { maxWidth: 280, marginTop: 5, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  skeletonList: { paddingHorizontal: 16 },
  skeletonRow: { height: 100, marginBottom: 10, borderRadius: 10, opacity: 0.7 },
  footerLoader: { marginVertical: 14 },
});
