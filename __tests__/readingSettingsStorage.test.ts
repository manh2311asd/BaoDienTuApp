import AsyncStorage from '@react-native-async-storage/async-storage';
import { localDB } from '../src/services/localDB';
import { useAppStore } from '../src/store/useAppStore';
import type { Article } from '../src/types/content';

const article: Article = {
  id: 901,
  authorId: 8,
  authorName: 'Tác giả kiểm thử',
  coverImage: '',
  categoryId: 4,
  categoryName: 'Đời sống',
  title: 'Bài đọc offline',
  sapo: 'Tóm tắt',
  content: '<p>Nội dung bài viết</p>',
  type: 'FREE',
  status: 'PUBLISHED',
  viewCount: 0,
  createdAt: '2026-08-06T00:00:00.000Z',
};

describe('reading download and cache storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppStore.setState({ offlineIds: [] });
  });

  it('measures real offline and transient cache records', async () => {
    await localDB.saveArticleOffline(article);
    await AsyncStorage.setItem('@BaoDienTu:explore_articles_v2', '{"data":[1,2]}');

    const usage = await localDB.getStorageUsage();
    expect(usage.offlineBytes).toBeGreaterThan(0);
    expect(usage.cacheBytes).toBeGreaterThan(0);
    expect(usage.imageBytes).toBe(0);
    expect(usage.totalBytes).toBe(usage.offlineBytes + usage.cacheBytes);
  });

  it('clears only transient cache and preserves account, preferences, bookmarks and offline articles', async () => {
    await localDB.saveArticleOffline(article);
    await AsyncStorage.multiSet([
      ['@BaoDienTu:explore_articles_v2', 'cache'],
      ['@BaoDienTu:weather_cache:hanoi', 'weather'],
      ['@BaoDienTu:app_store', 'preferences'],
      ['@BaoDienTu:session_profile', 'account'],
      ['@BaoDienTu:bookmark_article:901', 'bookmark'],
    ]);

    await localDB.clearTransientCache();

    expect(await AsyncStorage.getItem('@BaoDienTu:explore_articles_v2')).toBeNull();
    expect(await AsyncStorage.getItem('@BaoDienTu:weather_cache:hanoi')).toBeNull();
    expect(await AsyncStorage.getItem('@BaoDienTu:app_store')).toBe('preferences');
    expect(await AsyncStorage.getItem('@BaoDienTu:session_profile')).toBe('account');
    expect(await AsyncStorage.getItem('@BaoDienTu:bookmark_article:901')).toBe('bookmark');
    expect(await localDB.isArticleOffline(article.id)).toBe(true);
  });

  it('deletes all downloads without removing bookmarks or settings', async () => {
    await localDB.saveArticleOffline(article);
    await AsyncStorage.multiSet([
      ['@BaoDienTu:app_store', 'preferences'],
      ['@BaoDienTu:bookmark_article:901', 'bookmark'],
    ]);

    await expect(localDB.deleteAllOfflineArticles()).resolves.toBe(true);
    expect(await localDB.isArticleOffline(article.id)).toBe(false);
    expect(useAppStore.getState().offlineIds).toEqual([]);
    const persistedPreferences = await AsyncStorage.getItem('@BaoDienTu:app_store');
    expect(persistedPreferences).not.toBeNull();
    expect(JSON.parse(persistedPreferences || '{}')).toHaveProperty('state.themeSetting');
    expect(await AsyncStorage.getItem('@BaoDienTu:bookmark_article:901')).toBe('bookmark');
  });
});
