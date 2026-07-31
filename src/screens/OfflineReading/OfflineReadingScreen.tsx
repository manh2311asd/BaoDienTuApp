import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { localDB } from '../../services/localDB';
import { Article } from '../../types/content';
import { DownloadCloud, Trash2, FileText } from 'lucide-react-native';
import { Platform } from 'react-native';

const F_SANS = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });
const F_MED  = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' });
const F_SRF  = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

const OfflineReadingScreen = ({ navigation }: any) => {
  const { getColors, offlineIds } = useAppStore();
  const colors = getColors();

  const [offlineArticles, setOfflineArticles] = useState<Partial<Article>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOfflineArticles();
  }, [offlineIds]); // Reload when offlineIds array in state changes

  const loadOfflineArticles = async () => {
    setIsLoading(true);
    try {
      const data = await localDB.getOfflineArticles();
      setOfflineArticles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number, title: string) => {
    Alert.alert(
      'Xóa Bản Offline',
      `Bạn có muốn xóa bài viết "${title}" khỏi thư viện đọc offline không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            await localDB.deleteArticleOffline(id);
            // State updates automatically via useEffect on offlineIds
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Partial<Article> }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View
          style={[
            styles.thumbnail,
            styles.thumbnailPlaceholder,
            { backgroundColor: colors.border },
          ]}
        >
          <FileText color={colors.textMuted} size={28} {...IC} />
        </View>
        
        <View style={styles.infoCol}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.categoryName} • Offline
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.readBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('ArticleDetail', { articleId: item.id, isOffline: true })}
            >
              <FileText color="#FFFFFF" size={14} {...IC} />
              <Text style={styles.readBtnText}>Đọc Offline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: colors.danger }]}
              onPress={() => handleDelete(item.id!, item.title!)}
            >
              <Trash2 color={colors.danger} size={16} {...IC} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <DownloadCloud color={colors.text} size={28} {...IC} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Thư viện ngoại tuyến</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {offlineArticles.length} bài viết đã lưu trên thiết bị của bạn.
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : offlineArticles.length === 0 ? (
        <View style={styles.center}>
          <DownloadCloud color={colors.textMuted} size={48} style={{ marginBottom: 12 }} {...IC} />
          <Text style={[styles.emptyText, { color: colors.text }]}>Không có bài viết offline nào</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Nhấn biểu tượng tải xuống trong bất kỳ bài viết nào để lưu đọc không cần mạng.
          </Text>
        </View>
      ) : (
        <FlatList
          data={offlineArticles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id!.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default OfflineReadingScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontFamily: F_SRF,    // A4: serif for article titles
    fontWeight: '700',
    lineHeight: 22,       // 14×1.6=22.4→22
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,     // A3 FIX: pill(14)→crisp(6)
  },
  readBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: F_MED,
    marginLeft: 4,
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,     // A3 FIX: pill(14)→crisp(6)
    borderWidth: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 21,      // 13×1.6=20.8→21
    fontFamily: F_SANS,
  },
});
