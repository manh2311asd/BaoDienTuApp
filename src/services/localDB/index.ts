import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Article } from '../../types/content';
import { useAppStore, UserSession } from '../../store/useAppStore';
import {
  clearStoredSession,
  loadStoredSession,
  saveStoredSession,
} from '../sessionStorage';
import { BASE_URL } from '../api/client';

const STORAGE_KEYS = {
  OFFLINE_ARTICLES_PREFIX: '@BaoDienTu:offline_article:',
  OFFLINE_INDEX: '@BaoDienTu:offline_index',
  BOOKMARK_ARTICLE_PREFIX: '@BaoDienTu:bookmark_article:',
  LEGACY_RECENT_ARTICLES: '@BaoDienTu:recent_articles',
  RECENT_ARTICLES_PREFIX: '@BaoDienTu:recent_articles:v2:',
  DEVICE_ID: '@BaoDienTu:device_id',
};

const normalizeStorageScope = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'default';

export const resolveHistoryEnvironment = (
  configuredEnvironment = process.env.EXPO_PUBLIC_DATA_ENV,
  apiBaseUrl = BASE_URL
) => {
  if (configuredEnvironment?.trim()) {
    return normalizeStorageScope(configuredEnvironment);
  }

  const hostname = apiBaseUrl
    .replace(/^https?:\/\//i, '')
    .split('/')[0]
    .split(':')[0]
    .toLowerCase();
  const localAddress =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.0.2.2' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  return localAddress ? 'local' : `remote_${normalizeStorageScope(hostname)}`;
};

export const buildRecentArticlesStorageKey = (
  userId: number,
  environment = resolveHistoryEnvironment()
) => `${STORAGE_KEYS.RECENT_ARTICLES_PREFIX}${normalizeStorageScope(environment)}:user:${userId}`;

const getCurrentRecentArticlesStorageKey = () => {
  const userId = useAppStore.getState().user?.id;
  return userId ? buildRecentArticlesStorageKey(userId) : null;
};

const TRANSIENT_CACHE_KEYS = new Set([
  '@BaoDienTu:explore_articles_v2',
  '@BaoDienTu:explore_categories_v2',
  '@BaoDienTu:explore_point_news_v2',
  '@BaoDienTu:explore_topic_counts_v1',
]);

const TRANSIENT_CACHE_PREFIXES = [
  '@BaoDienTu:weather_cache:',
  '@BaoDienTu:utility:',
];

const utf8ByteLength = (value: string): number => {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    if (codePoint <= 0x7f) length += 1;
    else if (codePoint <= 0x7ff) length += 2;
    else if (codePoint <= 0xffff) length += 3;
    else length += 4;
  }
  return length;
};

const isTransientCacheKey = (key: string) =>
  TRANSIENT_CACHE_KEYS.has(key) ||
  TRANSIENT_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));

export interface StorageUsage {
  offlineBytes: number;
  imageBytes: number;
  cacheBytes: number;
  totalBytes: number;
}

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

  deleteAllOfflineArticles: async (): Promise<boolean> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(
        (key) =>
          key === STORAGE_KEYS.OFFLINE_INDEX ||
          key.startsWith(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX)
      );
      if (offlineKeys.length > 0) {
        await AsyncStorage.multiRemove(offlineKeys);
      }
      useAppStore.getState().setOfflineIds([]);
      return true;
    } catch (e) {
      console.error('Lỗi khi xóa tất cả bài viết offline:', e);
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
      const storageKey = getCurrentRecentArticlesStorageKey();
      if (!storageKey) return;

      const stored = await AsyncStorage.getItem(storageKey);
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
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Lỗi khi lưu lịch sử đọc:', e);
    }
  },

  getRecentArticles: async (): Promise<Article[]> => {
    try {
      const storageKey = getCurrentRecentArticlesStorageKey();
      if (!storageKey) return [];

      const stored = await AsyncStorage.getItem(storageKey);
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
      // The legacy key mixed guests, accounts and backend environments.
      // Never migrate it into a real account because its owner/source is unknown.
      await AsyncStorage.removeItem(STORAGE_KEYS.LEGACY_RECENT_ARTICLES);

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

  getStorageUsage: async (): Promise<StorageUsage> => {
    const keys = await AsyncStorage.getAllKeys();
    const managedKeys = keys.filter(
      (key) =>
        key === STORAGE_KEYS.OFFLINE_INDEX ||
        key.startsWith(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX) ||
        isTransientCacheKey(key)
    );
    const records = await AsyncStorage.multiGet(managedKeys);
    let offlineBytes = 0;
    let cacheBytes = 0;
    records.forEach(([key, value]) => {
      if (!value) return;
      const bytes = utf8ByteLength(value);
      if (
        key === STORAGE_KEYS.OFFLINE_INDEX ||
        key.startsWith(STORAGE_KEYS.OFFLINE_ARTICLES_PREFIX)
      ) {
        offlineBytes += bytes;
      } else if (isTransientCacheKey(key)) {
        cacheBytes += bytes;
      }
    });

    // Images are currently remote URLs inside article records; no image binary
    // is persisted separately, so this remains a measured zero rather than an estimate.
    const imageBytes = 0;
    return {
      offlineBytes,
      imageBytes,
      cacheBytes,
      totalBytes: offlineBytes + imageBytes + cacheBytes,
    };
  },

  clearTransientCache: async (): Promise<number> => {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(isTransientCacheKey);
    if (cacheKeys.length === 0) return 0;

    const records = await AsyncStorage.multiGet(cacheKeys);
    const removedBytes = records.reduce(
      (total, [, value]) => total + (value ? utf8ByteLength(value) : 0),
      0
    );
    await AsyncStorage.multiRemove(cacheKeys);
    return removedBytes;
  },
};
