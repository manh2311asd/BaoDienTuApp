import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Article } from '../../types/content';
import { useAppStore, UserSession } from '../../store/useAppStore';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from '../sessionStorage';

const STORAGE_KEYS = {
  OFFLINE_ARTICLES_PREFIX: '@BaoDienTu:offline_article:',
  OFFLINE_INDEX: '@BaoDienTu:offline_index',
  BOOKMARK_ARTICLE_PREFIX: '@BaoDienTu:bookmark_article:',
  RECENT_ARTICLES: '@BaoDienTu:recent_articles',
  DEVICE_ID: '@BaoDienTu:device_id',
};

export const localDB = {
  // --- OFFLINE READING SYNC LOGIC ---

  // Get list of downloaded article summaries
  getOfflineArticles: async (): Promise<Partial<Article>[]> => {
    try {
      const indexStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INDEX);
      if (!indexStr) return [];
      const ids: number[] = JSON.parse(indexStr);
      
      const articles: Partial<Article>[] = [];
      for (const id of ids) {
        const artStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX + id);
        if (artStr) {
          const fullArt: Article = JSON.parse(artStr);
          // Return lightweight metadata for list view
          articles.push({
            id: fullArt.id,
            title: fullArt.title,
            sapo: fullArt.sapo,
            coverImage: fullArt.coverImage,
            authorName: fullArt.authorName,
            categoryName: fullArt.categoryName,
            type: fullArt.type,
            createdAt: fullArt.createdAt,
          });
        }
      }
      return articles;
    } catch (e) {
      console.error('Lỗi khi đọc danh sách bài viết offline:', e);
      return [];
    }
  },

  // Save/Download an article detail for offline reading
  saveArticleOffline: async (article: Article): Promise<boolean> => {
    try {
      // 1. Save full article content
      await AsyncStorage.setItem(
        STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX + article.id,
        JSON.stringify(article)
      );

      // 2. Update offline index list
      const indexStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INDEX);
      let ids: number[] = indexStr ? JSON.parse(indexStr) : [];
      if (!ids.includes(article.id)) {
        ids.push(article.id);
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_INDEX, JSON.stringify(ids));
      }

      // 3. Update global Zustand store
      useAppStore.getState().setOfflineIds(ids);
      return true;
    } catch (e) {
      console.error('Lỗi khi lưu bài viết offline:', e);
      return false;
    }
  },

  // Read full offline article detail
  getOfflineArticleDetail: async (articleId: number): Promise<Article | null> => {
    try {
      const artStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX + articleId);
      return artStr ? JSON.parse(artStr) : null;
    } catch (e) {
      console.error('Lỗi khi tải chi tiết bài viết offline:', e);
      return null;
    }
  },

  // Remove a downloaded article
  deleteArticleOffline: async (articleId: number): Promise<boolean> => {
    try {
      // 1. Delete article file/record
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX + articleId);

      // 2. Update offline index list
      const indexStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INDEX);
      if (indexStr) {
        let ids: number[] = JSON.parse(indexStr);
        ids = ids.filter((id) => id !== articleId);
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_INDEX, JSON.stringify(ids));
        
        // 3. Update global store
        useAppStore.getState().setOfflineIds(ids);
      }
      return true;
    } catch (e) {
      console.error('Lỗi khi xóa bài viết offline:', e);
      return false;
    }
  },

  // Check if article is downloaded
  isArticleOffline: async (articleId: number): Promise<boolean> => {
    try {
      const artStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX + articleId);
      return artStr !== null;
    } catch (e) {
      return false;
    }
  },

  saveBookmarkedArticle: async (article: Article): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BOOKMARK_ARTICLE_PREFIX + article.id,
        JSON.stringify(article)
      );
      return true;
    } catch (e) {
      console.error('Lỗi khi lưu bookmark:', e);
      return false;
    }
  },

  deleteBookmarkedArticle: async (articleId: number): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem(
        STORAGE_KEYS.BOOKMARK_ARTICLE_PREFIX + articleId
      );
      return true;
    } catch (e) {
      console.error('Lỗi khi xóa bookmark:', e);
      return false;
    }
  },

  getBookmarkedArticles: async (
    ids: number[]
  ): Promise<Partial<Article>[]> => {
    try {
      const records = await AsyncStorage.multiGet(
        ids.map((id) => STORAGE_KEYS.BOOKMARK_ARTICLE_PREFIX + id)
      );
      return records
        .map(([, value]) => (value ? (JSON.parse(value) as Article) : null))
        .filter((article): article is Article => article !== null);
    } catch (e) {
      console.error('Lỗi khi đọc bookmark:', e);
      return [];
    }
  },

  saveRecentArticle: async (article: Article): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_ARTICLES);
      const recent: Article[] = stored ? JSON.parse(stored) : [];
      const snapshot: Article = {
        ...article,
        // Reading history only needs a lightweight snapshot.
        content: '',
        previewContent: undefined,
      };
      const updated = [
        snapshot,
        ...recent.filter((item) => item.id !== article.id),
      ].slice(0, 10);
      await AsyncStorage.setItem(
        STORAGE_KEYS.RECENT_ARTICLES,
        JSON.stringify(updated)
      );
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử đọc:', e);
    }
  },

  getRecentArticles: async (): Promise<Article[]> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_ARTICLES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Lỗi khi đọc lịch sử đọc:', e);
      return [];
    }
  },

  saveReadingProgress: async (articleId: number, progress: number): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem('@BaoDienTu:reading_progress');
      const data = stored ? JSON.parse(stored) : {};
      data[articleId] = progress;
      await AsyncStorage.setItem('@BaoDienTu:reading_progress', JSON.stringify(data));
    } catch (e) {
      console.error('Lỗi lưu tiến trình đọc:', e);
    }
  },

  getReadingProgress: async (): Promise<{ [id: number]: number }> => {
    try {
      const stored = await AsyncStorage.getItem('@BaoDienTu:reading_progress');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  },

  // Initialize offline list from AsyncStorage to Zustand on App start
  syncInitialLocalData: async () => {
    try {
      const indexStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_INDEX);
      if (indexStr) {
        const ids: number[] = JSON.parse(indexStr);
        useAppStore.getState().setOfflineIds(ids);
      }
      
      const cachedUser = await loadStoredSession();
      if (cachedUser) {
        useAppStore.getState().setUser(cachedUser);
      }
    } catch (e) {
      console.error('Lỗi khi đồng bộ dữ liệu ban đầu:', e);
    }
  },

  saveUserSession: async (user: UserSession): Promise<void> => {
    try {
      await saveStoredSession(user);
    } catch (e) {
      console.error('Lỗi khi lưu phiên đăng nhập:', e);
    }
  },

  clearUserSession: async (): Promise<void> => {
    try {
      await clearStoredSession();
    } catch (e) {
      console.error('Lỗi khi xóa phiên đăng nhập:', e);
    }
  },

  getDeviceId: async (): Promise<string> => {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existing) {
      return existing;
    }

    const deviceId = `mobile-${Crypto.randomUUID()}`;
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    return deviceId;
  },

  clearTransientCache: async (): Promise<void> => {
    const keys = await AsyncStorage.getAllKeys();
    const weatherKeys = keys.filter((key) =>
      key.startsWith('@BaoDienTu:weather_cache:')
    );
    if (weatherKeys.length > 0) {
      await AsyncStorage.multiRemove(weatherKeys);
    }
  },
};
