import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bookmark, FileText, Trash2 } from 'lucide-react-native';
import { Article } from '../../types/content';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';

const IC = { strokeWidth: 2 } as const;

export default function SavedArticlesScreen({ navigation }: any) {
  const { bookmarkedIds, getColors, toggleBookmark } = useAppStore();
  const colors = getColors();
  const [articles, setArticles] = useState<Partial<Article>[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    const savedArticles = await localDB.getBookmarkedArticles(bookmarkedIds);
    setArticles(savedArticles);
    setLoading(false);
  }, [bookmarkedIds]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const removeArticle = async (articleId: number) => {
    const removed = await localDB.deleteBookmarkedArticle(articleId);
    if (removed) {
      toggleBookmark(articleId);
    }
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Bookmark color={colors.text} size={26} {...IC} />
        <Text style={[styles.heading, { color: colors.text }]}>Bài viết đã lưu</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          {articles.length} bài viết trong thư viện cá nhân
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : articles.length === 0 ? (
        <View style={styles.center}>
          <Bookmark color={colors.textMuted} size={44} {...IC} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Chưa có bài viết đã lưu
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Mở một bài viết và nhấn biểu tượng dấu trang để lưu vào đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.image} />
              ) : (
                <View
                  style={[styles.image, { backgroundColor: colors.border }]}
                />
              )}
              <View style={styles.content}>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={3}
                >
                  {item.title}
                </Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {item.categoryName || 'Tin tức'}
                </Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.readButton, { backgroundColor: colors.text }]}
                    onPress={() =>
                      navigation.navigate('ArticleDetail', {
                        articleId: item.id,
                        articleType: item.type,
                      })
                    }
                  >
                    <FileText color={colors.background} size={14} {...IC} />
                    <Text
                      style={[
                        styles.readButtonText,
                        { color: colors.background },
                      ]}
                    >
                      Đọc bài
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Bỏ lưu bài viết"
                    style={[styles.deleteButton, { borderColor: colors.border }]}
                    onPress={() => removeArticle(item.id!)}
                  >
                    <Trash2 color={colors.danger} size={16} {...IC} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
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
    paddingTop: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
  },
  heading: {
    marginTop: 12,
    fontFamily: 'serif',
    fontSize: 25,
    fontWeight: '700',
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 6,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  meta: {
    marginTop: 5,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  readButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    width: 34,
    height: 34,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
  },
});
