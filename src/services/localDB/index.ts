import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
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
  USER_OFFLINE_ARTICLES_PREFIX: '@BaoDienTu:offline_article:v2:',
  USER_OFFLINE_INDEX_PREFIX: '@BaoDienTu:offline_index:v2:',
  USER_BOOKMARK_ARTICLE_PREFIX: '@BaoDienTu:bookmark_article:v2:',
  USER_BOOKMARK_INDEX_PREFIX: '@BaoDienTu:bookmark_index:v2:',
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

const getCurrentUserStorageScope = () => {
  const userId = useAppStore.getState().user?.id;
  const owner = userId ? `user:${userId}` : 'guest';
  return `${normalizeStorageScope(resolveHistoryEnvironment())}:${owner}`;
};

const buildUserStorageKey = (prefix: string, suffix = '') => {
  const scope = getCurrentUserStorageScope();
  return `${prefix}${scope}${suffix}`;
};

const getCurrentOfflineIndexKey = () =>
  buildUserStorageKey(STORAGE_KEYS.USER_OFFLINE_INDEX_PREFIX);
const getCurrentOfflineArticleKey = (articleId: number) =>
  buildUserStorageKey(STORAGE_KEYS.USER_OFFLINE_ARTICLES_PREFIX, `:${articleId}`);
const getCurrentBookmarkIndexKey = () =>
  buildUserStorageKey(STORAGE_KEYS.USER_BOOKMARK_INDEX_PREFIX);
const getCurrentBookmarkArticleKey = (articleId: number) =>
  buildUserStorageKey(STORAGE_KEYS.USER_BOOKMARK_ARTICLE_PREFIX, `:${articleId}`);

const readNumberIndex = async (key: string | null): Promise<number[]> => {
  if (!key) return [];
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return [];
  const parsed = JSON.parse(stored);
  return Array.isArray(parsed)
    ? parsed.map(Number).filter(Number.isFinite)
    : [];
};

const writeNumberIndex = async (key: string | null, ids: number[]) => {
  if (!key) return false;
  await AsyncStorage.setItem(key, JSON.stringify(ids));
  return true;
};

const TRANSIENT_CACHE_KEYS = new Set([
  '@BaoDienTu:explore_articles_v2',
  '@BaoDienTu:explore_categories_v2',
  '@BaoDienTu:explore_point_news_v2',
  '@BaoDienTu:explore_point_news_v3',
  '@BaoDienTu:explore_topic_counts_v1',
]);

const TRANSIENT_CACHE_PREFIXES = [
  '@BaoDienTu:weather_cache:',
  '@BaoDienTu:utility:',
  '@NewsDaily:press_review:',
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

const OFFLINE_MEDIA_DIRECTORY = 'newsdaily-offline-media-v2';
const REMOTE_IMAGE_PATTERN = /^https?:\/\//i;
const HTML_IMAGE_SOURCE_PATTERN = /<img\b[^>]*\bsrc=(['"])(.*?)\1/gi;
const MAX_OFFLINE_INLINE_IMAGES = 20;
const isOfflineFileSystemAvailable = () => Boolean(Paths?.document);

const getOfflineMediaRoot = () =>
  new Directory(Paths.document, OFFLINE_MEDIA_DIRECTORY);

const getOfflineArticleMediaDirectory = (articleId: number) =>
  new Directory(
    getOfflineMediaRoot(),
    getCurrentUserStorageScope() || 'guest',
    String(articleId)
  );

const normalizeHtmlImageUrl = (value: string) =>
  value.replace(/&amp;/gi, '&').trim();

const getImageExtension = (url: string) => {
  const path = url.split('?')[0].toLowerCase();
  const extension = path.match(/\.(png|jpe?g|webp|gif)$/)?.[0];
  return extension === '.jpeg' ? '.jpg' : extension || '.jpg';
};

const removeOfflineArticleMedia = (articleId: number) => {
  if (!isOfflineFileSystemAvailable()) {
    return;
  }
  try {
    const directory = getOfflineArticleMediaDirectory(articleId);
    if (directory.exists) {
      directory.delete();
    }
  } catch (error) {
    console.warn('Không thể xóa ảnh offline của bài viết:', error);
  }
};

const cacheOfflineArticleImages = async (article: Article): Promise<Article> => {
  if (!isOfflineFileSystemAvailable()) {
    return article;
  }

  const rawInlineUrls = Array.from(
    article.content.matchAll(HTML_IMAGE_SOURCE_PATTERN),
    (match) => match[2]
  )
    .filter((url) => REMOTE_IMAGE_PATTERN.test(normalizeHtmlImageUrl(url)))
    .filter((url, index, urls) => urls.indexOf(url) === index)
    .slice(0, MAX_OFFLINE_INLINE_IMAGES);
  const hasRemoteCover = REMOTE_IMAGE_PATTERN.test(article.coverImage || '');

  if (!hasRemoteCover && rawInlineUrls.length === 0) {
    return article;
  }

  try {
    const directory = getOfflineArticleMediaDirectory(article.id);
    if (directory.exists) {
      directory.delete();
    }
    directory.create({ intermediates: true, idempotent: true });

    let offlineCoverImage = article.coverImage;
    if (hasRemoteCover) {
      try {
        const coverUrl = normalizeHtmlImageUrl(article.coverImage);
        const coverFile = new File(
          directory,
          `cover${getImageExtension(coverUrl)}`
        );
        const downloadedCover = await File.downloadFileAsync(
          coverUrl,
          coverFile,
          { idempotent: true }
        );
        offlineCoverImage = downloadedCover.uri;
      } catch (error) {
        console.warn('Không thể tải ảnh bìa để đọc offline:', error);
      }
    }

    let offlineContent = article.content;
    for (let index = 0; index < rawInlineUrls.length; index += 1) {
      const rawUrl = rawInlineUrls[index];
      const remoteUrl = normalizeHtmlImageUrl(rawUrl);
      try {
        const imageFile = new File(
          directory,
          `inline-${index + 1}${getImageExtension(remoteUrl)}`
        );
        const downloadedImage = await File.downloadFileAsync(
          remoteUrl,
          imageFile,
          { idempotent: true }
        );
        offlineContent = offlineContent.split(rawUrl).join(downloadedImage.uri);
      } catch (error) {
        console.warn(`Không thể tải ảnh minh họa offline thứ ${index + 1}:`, error);
      }
    }

    return {
      ...article,
      coverImage: offlineCoverImage,
      content: offlineContent,
    };
  } catch (error) {
    console.warn('Không thể chuẩn bị thư mục ảnh offline:', error);
    return article;
  }
};

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
      const ids = await readNumberIndex(getCurrentOfflineIndexKey());
      
      const articles: Partial<Article>[] = [];
      for (const id of ids) {
        const articleKey = getCurrentOfflineArticleKey(id);
        if (!articleKey) continue;
        const artStr = await AsyncStorage.getItem(articleKey);
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
      const articleKey = getCurrentOfflineArticleKey(article.id);
      const indexKey = getCurrentOfflineIndexKey();
      if (!articleKey || !indexKey) return false;
      const offlineArticle = await cacheOfflineArticleImages(article);

      // 1. Save full article content
      await AsyncStorage.setItem(
        articleKey,
        JSON.stringify(offlineArticle)
      );

      // 2. Update offline index list
      const ids = await readNumberIndex(indexKey);
      if (!ids.includes(article.id)) {
        ids.push(article.id);
        await writeNumberIndex(indexKey, ids);
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
      const articleKey = getCurrentOfflineArticleKey(articleId);
      if (!articleKey) return null;
      const artStr = await AsyncStorage.getItem(articleKey);
      return artStr ? JSON.parse(artStr) : null;
    } catch (e) {
      console.error('Lỗi khi tải chi tiết bài viết offline:', e);
      return null;
    }
  },

  // Remove a downloaded article
  deleteArticleOffline: async (articleId: number): Promise<boolean> => {
    try {
      const articleKey = getCurrentOfflineArticleKey(articleId);
      const indexKey = getCurrentOfflineIndexKey();
      if (!articleKey || !indexKey) return false;
      // 1. Delete article file/record
      await AsyncStorage.removeItem(articleKey);
      removeOfflineArticleMedia(articleId);

      // 2. Update offline index list
      const ids = (await readNumberIndex(indexKey)).filter((id) => id !== articleId);
      await writeNumberIndex(indexKey, ids);

      // 3. Update global store
      useAppStore.getState().setOfflineIds(ids);
      return true;
    } catch (e) {
      console.error('Lỗi khi xóa bài viết offline:', e);
      return false;
    }
  },

  deleteAllOfflineArticles: async (): Promise<boolean> => {
    try {
      const indexKey = getCurrentOfflineIndexKey();
      if (!indexKey) return false;
      const scope = getCurrentUserStorageScope();
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(
        (key) =>
          key === indexKey ||
          (scope != null &&
            key.startsWith(`${STORAGE_KEYS.USER_OFFLINE_ARTICLES_PREFIX}${scope}:`))
      );
      if (offlineKeys.length > 0) {
        await AsyncStorage.multiRemove(offlineKeys);
      }
      try {
        if (!isOfflineFileSystemAvailable()) {
          useAppStore.getState().setOfflineIds([]);
          return true;
        }
        const userMediaDirectory = new Directory(
          getOfflineMediaRoot(),
          getCurrentUserStorageScope()
        );
        if (userMediaDirectory.exists) {
          userMediaDirectory.delete();
        }
      } catch (error) {
        console.warn('Không thể xóa thư mục ảnh offline:', error);
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
      const articleKey = getCurrentOfflineArticleKey(articleId);
      if (!articleKey) return false;
      const artStr = await AsyncStorage.getItem(articleKey);
      return artStr !== null;
    } catch (e) {
      return false;
    }
  },

  saveBookmarkedArticle: async (article: Article): Promise<boolean> => {
    try {
      const articleKey = getCurrentBookmarkArticleKey(article.id);
      const indexKey = getCurrentBookmarkIndexKey();
      if (!articleKey || !indexKey) return false;
      await AsyncStorage.setItem(articleKey, JSON.stringify(article));
      const ids = await readNumberIndex(indexKey);
      if (!ids.includes(article.id)) {
        ids.push(article.id);
        await writeNumberIndex(indexKey, ids);
      }
      return true;
    } catch (e) {
      console.error('Lỗi khi lưu bookmark:', e);
      return false;
    }
  },

  deleteBookmarkedArticle: async (articleId: number): Promise<boolean> => {
    try {
      const articleKey = getCurrentBookmarkArticleKey(articleId);
      const indexKey = getCurrentBookmarkIndexKey();
      if (!articleKey || !indexKey) return false;
      await AsyncStorage.removeItem(articleKey);
      const ids = (await readNumberIndex(indexKey)).filter((id) => id !== articleId);
      await writeNumberIndex(indexKey, ids);
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
      const keys = ids
        .map(getCurrentBookmarkArticleKey)
        .filter((key): key is string => Boolean(key));
      const records = await AsyncStorage.multiGet(keys);
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
      
      const cachedUser = await loadStoredSession();
      if (cachedUser) {
        useAppStore.getState().setUser(cachedUser);
      }
      await localDB.syncCurrentUserLibrary();
    } catch (e) {
      console.error('Lỗi khi đồng bộ dữ liệu ban đầu:', e);
    }
  },

  saveUserSession: async (user: UserSession): Promise<void> => {
    try {
      await saveStoredSession(user);
      await localDB.syncCurrentUserLibrary();
    } catch (e) {
      console.error('Lỗi khi lưu phiên đăng nhập:', e);
    }
  },

  clearUserSession: async (): Promise<void> => {
    try {
      await clearStoredSession();
      useAppStore.getState().setBookmarkedIds([]);
      useAppStore.getState().setOfflineIds([]);
    } catch (e) {
      console.error('Lỗi khi xóa phiên đăng nhập:', e);
    }
  },

  syncCurrentUserLibrary: async (): Promise<void> => {
    try {
      const [bookmarkedIds, offlineIds] = await Promise.all([
        readNumberIndex(getCurrentBookmarkIndexKey()),
        readNumberIndex(getCurrentOfflineIndexKey()),
      ]);
      useAppStore.getState().setBookmarkedIds(bookmarkedIds);
      useAppStore.getState().setOfflineIds(offlineIds);
    } catch (error) {
      console.error('Lỗi khi đồng bộ thư viện theo tài khoản:', error);
      useAppStore.getState().setBookmarkedIds([]);
      useAppStore.getState().setOfflineIds([]);
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
        key.startsWith(STORAGE_KEYS.USER_OFFLINE_INDEX_PREFIX) ||
        key.startsWith(STORAGE_KEYS.USER_OFFLINE_ARTICLES_PREFIX) ||
        isTransientCacheKey(key)
    );
    const records = await AsyncStorage.multiGet(managedKeys);
    let offlineBytes = 0;
    let cacheBytes = 0;
    records.forEach(([key, value]) => {
      if (!value) return;
      const bytes = utf8ByteLength(value);
      if (
        key.startsWith(STORAGE_KEYS.USER_OFFLINE_INDEX_PREFIX) ||
        key.startsWith(STORAGE_KEYS.USER_OFFLINE_ARTICLES_PREFIX)
      ) {
        offlineBytes += bytes;
      } else if (isTransientCacheKey(key)) {
        cacheBytes += bytes;
      }
    });

    let imageBytes = 0;
    try {
      if (!isOfflineFileSystemAvailable()) {
        return {
          offlineBytes,
          imageBytes,
          cacheBytes,
          totalBytes: offlineBytes + cacheBytes,
        };
      }
      const mediaRoot = getOfflineMediaRoot();
      imageBytes = mediaRoot.exists ? mediaRoot.size || 0 : 0;
    } catch {
      imageBytes = 0;
    }
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
