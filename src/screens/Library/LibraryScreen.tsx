import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  Clock3,
  Compass,
  Download,
  FileText,
  MoreHorizontal,
} from 'lucide-react-native';
import { Article } from '../../types/content';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';
import { apiClient } from '../../services/api/client';

type LibrarySection = 'saved' | 'downloaded' | 'history';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2.2 } as const;

export default function LibraryScreen({ navigation, route }: any) {
  const {
    bookmarkedIds,
    fontSize,
    getColors,
    offlineIds,
    showImages,
    toggleBookmark,
  } = useAppStore();
  const colors = getColors();
  const [section, setSection] = useState<LibrarySection>('saved');
  const [savedArticles, setSavedArticles] = useState<Partial<Article>[]>([]);
  const [downloadedArticles, setDownloadedArticles] = useState<Partial<Article>[]>([]);
  const [historyArticles, setHistoryArticles] = useState<Partial<Article>[]>([]);
  const [suggestions, setSuggestions] = useState<Partial<Article>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLibrary = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [saved, downloaded, history] = await Promise.all([
        localDB.getBookmarkedArticles(bookmarkedIds),
        offlineIds.length > 0
          ? localDB.getOfflineArticles()
          : Promise.resolve([]),
        localDB.getRecentArticles(),
      ]);
      setSavedArticles(saved);
      setDownloadedArticles(downloaded);
      setHistoryArticles(history);

      const currentListLength =
        section === 'saved'
          ? saved.length
          : section === 'downloaded'
            ? downloaded.length
            : history.length;

      if (currentListLength <= 2) {
        const response = await apiClient.searchArticles();
        if (response.data) {
          const currentIds = (section === 'saved' ? saved : section === 'downloaded' ? downloaded : history).map(x => x.id);
          const filtered = response.data.filter(x => !currentIds.includes(x.id)).slice(0, 3);
          setSuggestions(filtered);
        }
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookmarkedIds, offlineIds, section]);

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.initialSection) {
        setSection(route.params.initialSection);
      }
      loadLibrary();
    }, [loadLibrary, route?.params?.initialSection])
  );

  const articles = useMemo(
    () =>
      section === 'saved'
        ? savedArticles
        : section === 'downloaded'
          ? downloadedArticles
          : historyArticles,
    [downloadedArticles, historyArticles, savedArticles, section]
  );

  const openArticle = (article: Partial<Article>) => {
    if (!article.id) {
      return;
    }
    navigation.navigate('ArticleDetail', {
      articleId: article.id,
      isOffline: section === 'downloaded',
      articleType: article.type,
    });
  };

  const removeArticle = (article: Partial<Article>) => {
    if (!article.id) {
      return;
    }

    const downloaded = section === 'downloaded';
    Alert.alert(
      downloaded ? 'Xóa bài đã tải?' : 'Bỏ bài đã lưu?',
      downloaded
        ? 'Bài viết sẽ bị xóa khỏi thiết bị và không thể đọc khi mất mạng.'
        : 'Bạn có thể lưu lại bài viết này bất cứ lúc nào.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: downloaded ? 'Xóa khỏi thiết bị' : 'Bỏ lưu',
          style: 'destructive',
          onPress: async () => {
            const removed = downloaded
              ? await localDB.deleteArticleOffline(article.id!)
              : await localDB.deleteBookmarkedArticle(article.id!);

            if (removed) {
              if (!downloaded) {
                toggleBookmark(article.id!);
              }
              loadLibrary();
            }
          },
        },
      ]
    );
  };

  const getReadingTime = (article: Partial<Article>) => {
    const text = (article.title || '') + ' ' + (article.sapo || '') + ' ' + (article.content || '');
    const words = text.trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 200));
    return `${mins} phút đọc`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Gần đây';
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const showArticleMenu = (article: Partial<Article>) => {
    const downloaded = section === 'downloaded';
    Alert.alert(
      'Tùy chọn bài viết',
      article.title || '',
      [
        {
          text: downloaded ? 'Xóa bản tải' : 'Bỏ lưu bài viết',
          style: 'destructive',
          onPress: () => removeArticle(article),
        },
        {
          text: 'Đọc bài viết',
          onPress: () => openArticle(article),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  const renderArticle = ({ item }: { item: Partial<Article> }) => {
    const downloaded = section === 'downloaded';
    const history = section === 'history';
    const displayImage = !downloaded && showImages && Boolean(item.coverImage);

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        style={[
          styles.articleCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        onPress={() => openArticle(item)}
      >
        {displayImage ? (
          <Image source={{ uri: item.coverImage }} style={styles.thumbnail} />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: colors.background },
            ]}
          >
            {downloaded ? (
              <Download color={colors.textMuted} size={22} {...IC} />
            ) : (
              <FileText color={colors.textMuted} size={22} {...IC} />
            )}
          </View>
        )}

        <View style={styles.articleCopy}>
          <Text
            style={[
              styles.articleTitle,
              {
                color: colors.text,
                fontSize: scaleFont(15, fontSize),
                lineHeight: scaleLineHeight(21, fontSize),
              },
            ]}
            numberOfLines={fontSize === 'xlarge' ? 4 : 3}
          >
            {item.title}
          </Text>
          <Text style={[styles.articleMeta, { color: colors.textMuted }]}>
            {downloaded
              ? `Trên thiết bị · ${getReadingTime(item)}`
              : history
                ? `Đã đọc · ${getReadingTime(item)}`
                : `${item.categoryName || 'Tin tức'} · ${formatDate(item.createdAt)} · ${getReadingTime(item)}`}
          </Text>
          <View style={styles.articleFooter}>
            <View style={styles.readAction}>
              <Text style={[styles.readLabel, { color: colors.primary }]}>
                {downloaded ? 'Đọc bản đã tải' : history ? 'Đọc lại' : 'Đọc bài'}
              </Text>
              <ChevronRight color={colors.primary} size={13} strokeWidth={2.5} />
            </View>
            {!history && (
              <TouchableOpacity
                accessibilityLabel={downloaded ? 'Xóa bài đã tải' : 'Bỏ lưu bài viết'}
                hitSlop={12}
                style={styles.moreButton}
                onPress={() => showArticleMenu(item)}
              >
                <MoreHorizontal color={colors.textMuted} size={18} {...IC} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };


  const renderSuggestions = () => {
    if (articles.length > 2 || suggestions.length === 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <View style={styles.suggestionsHeader}>
          <Text style={[styles.suggestionsTitle, { color: colors.text }]}>
            Gợi ý để lưu
          </Text>
          <Text style={[styles.suggestionsSubtitle, { color: colors.textMuted }]}>
            Những bài viết phổ biến có thể bạn quan tâm
          </Text>
        </View>
        {suggestions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.suggestionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() =>
              navigation.navigate('ArticleDetail', {
                articleId: item.id,
                articleType: item.type,
              })
            }
          >
            <View style={styles.suggestionContent}>
              <Text
                style={[styles.suggestionTitleText, { color: colors.text }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text style={[styles.suggestionMeta, { color: colors.textMuted }]}>
                {item.categoryName || 'Tin tức'} · {getReadingTime(item)}
              </Text>
            </View>
            {showImages && item.coverImage && (
              <Image source={{ uri: item.coverImage }} style={styles.suggestionThumb} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const emptyCopy = section === 'saved'
    ? {
        icon: <Bookmark color={colors.textMuted} size={42} {...IC} />,
        title: 'Chưa có bài viết đã lưu',
        description: 'Đánh dấu những bài bạn muốn quay lại đọc sau.',
      }
    : section === 'downloaded'
      ? {
        icon: <Download color={colors.textMuted} size={42} {...IC} />,
        title: 'Chưa có bài viết đã tải',
        description: 'Tải bài về thiết bị để đọc ngay cả khi không có mạng.',
        }
      : {
          icon: <Clock3 color={colors.textMuted} size={42} {...IC} />,
          title: 'Chưa có lịch sử đọc',
          description: 'Những bài bạn vừa mở sẽ xuất hiện tại đây.',
        };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.eyebrowRow}>
          <BookOpen color={colors.textMuted} size={16} {...IC} />
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>
            BỘ SƯU TẬP CỦA BẠN
          </Text>
        </View>
        <Text style={[styles.heading, { color: colors.text }]}>Thư viện</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Lưu để xem lại hoặc tải xuống để đọc không cần mạng.
        </Text>

        <View
          style={[
            styles.segmentedControl,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.segment,
              section === 'saved' && { backgroundColor: colors.text },
            ]}
            onPress={() => setSection('saved')}
          >
            <Bookmark
              color={section === 'saved' ? colors.background : colors.textMuted}
              size={16}
              {...IC}
            />
            <Text
              style={[
                styles.segmentLabel,
                {
                  color:
                    section === 'saved' ? colors.background : colors.textMuted,
                },
              ]}
            >
              Đã lưu
            </Text>
            <Text
              style={[
                styles.segmentCount,
                {
                  color:
                    section === 'saved' ? colors.background : colors.textMuted,
                },
              ]}
            >
              {savedArticles.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              section === 'downloaded' && { backgroundColor: colors.text },
            ]}
            onPress={() => setSection('downloaded')}
          >
            <Download
              color={
                section === 'downloaded' ? colors.background : colors.textMuted
              }
              size={16}
              {...IC}
            />
            <Text
              style={[
                styles.segmentLabel,
                {
                  color:
                    section === 'downloaded'
                      ? colors.background
                      : colors.textMuted,
                },
              ]}
            >
              Đã tải
            </Text>
            <Text
              style={[
                styles.segmentCount,
                {
                  color:
                    section === 'downloaded'
                      ? colors.background
                      : colors.textMuted,
                },
              ]}
            >
              {downloadedArticles.length}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              section === 'history' && { backgroundColor: colors.text },
            ]}
            onPress={() => setSection('history')}
          >
            <Clock3
              color={section === 'history' ? colors.background : colors.textMuted}
              size={16}
              {...IC}
            />
            <Text
              style={[
                styles.segmentLabel,
                {
                  color:
                    section === 'history'
                      ? colors.background
                      : colors.textMuted,
                },
              ]}
            >
              Lịch sử
            </Text>
            <Text
              style={[
                styles.segmentCount,
                {
                  color:
                    section === 'history'
                      ? colors.background
                      : colors.textMuted,
                },
              ]}
            >
              {historyArticles.length}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => loadLibrary(true)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={[styles.center, { paddingBottom: 16 }]}>
              {emptyCopy.icon}
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {emptyCopy.title}
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
                {emptyCopy.description}
              </Text>
            </View>
          )}
          ListFooterComponent={renderSuggestions}
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    marginLeft: 7,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heading: {
    marginTop: 8,
    fontFamily: F_SERIF,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
  },
  segmentedControl: {
    marginTop: 18,
    padding: 3,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  segmentLabel: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentCount: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: F_SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  emptyDescription: {
    maxWidth: 280,
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  exploreButton: {
    minHeight: 42,
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  exploreLabel: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  articleCard: {
    marginBottom: 12,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
  },
  thumbnail: {
    width: 100,
    height: 110,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleCopy: {
    flex: 1,
    minHeight: 110,
    marginLeft: 14,
  },
  articleTitle: {
    fontFamily: F_SERIF,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  articleMeta: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
  },
  articleFooter: {
    flex: 1,
    minHeight: 34,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  readLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  readAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
  },
  suggestionsContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
  },
  suggestionsHeader: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  suggestionsTitle: {
    fontFamily: F_SERIF,
    fontSize: 18,
    fontWeight: '700',
  },
  suggestionsSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  suggestionContent: {
    flex: 1,
    marginRight: 10,
  },
  suggestionTitleText: {
    fontFamily: F_SERIF,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  suggestionMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  suggestionThumb: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
});
