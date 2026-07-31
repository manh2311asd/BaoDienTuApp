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
  Clock3,
  Compass,
  Download,
  FileText,
  Trash2,
} from 'lucide-react-native';
import { Article } from '../../types/content';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';
import { scaleFont, scaleLineHeight } from '../../theme/typography';

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookmarkedIds, offlineIds]);

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

            if (removed && !downloaded) {
              toggleBookmark(article.id!);
            }
          },
        },
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
              <Download color={colors.textMuted} size={24} {...IC} />
            ) : (
              <FileText color={colors.textMuted} size={24} {...IC} />
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
                lineHeight: scaleLineHeight(20, fontSize),
              },
            ]}
            numberOfLines={fontSize === 'xlarge' ? 4 : 3}
          >
            {item.title}
          </Text>
          <Text style={[styles.articleMeta, { color: colors.textMuted }]}>
            {downloaded
              ? 'TRÊN THIẾT BỊ'
              : history
                ? 'ĐÃ ĐỌC GẦN ĐÂY'
                : (item.categoryName || 'TIN TỨC').toUpperCase()}
          </Text>
          <View style={styles.articleFooter}>
            <Text style={[styles.readLabel, { color: colors.primary }]}>
              {downloaded ? 'Đọc bản đã tải' : history ? 'Đọc lại' : 'Đọc bài'}
            </Text>
            {!history && (
              <TouchableOpacity
                accessibilityLabel={downloaded ? 'Xóa bài đã tải' : 'Bỏ lưu bài viết'}
                hitSlop={8}
                style={[styles.deleteButton, { borderColor: colors.border }]}
                onPress={() => removeArticle(item)}
              >
                <Trash2 color={colors.danger} size={16} {...IC} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
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
      ) : articles.length === 0 ? (
        <View style={styles.center}>
          {emptyCopy.icon}
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {emptyCopy.title}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
            {emptyCopy.description}
          </Text>
          <TouchableOpacity
            style={[styles.exploreButton, { backgroundColor: colors.text }]}
            onPress={() => navigation.navigate('HomeTab')}
          >
            <Compass color={colors.background} size={16} {...IC} />
            <Text style={[styles.exploreLabel, { color: colors.background }]}>
              Khám phá bài viết
            </Text>
          </TouchableOpacity>
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
    fontSize: 28,
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
    paddingBottom: 36,
  },
  articleCard: {
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
  },
  thumbnail: {
    width: 92,
    height: 104,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleCopy: {
    flex: 1,
    minHeight: 104,
    marginLeft: 12,
  },
  articleTitle: {
    fontFamily: F_SERIF,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  articleMeta: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
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
    paddingBottom: 7,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
  },
});
