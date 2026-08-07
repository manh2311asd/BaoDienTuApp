import AsyncStorage from '@react-native-async-storage/async-storage';
import { Article } from '../src/types/content';
import {
  buildRecentArticlesStorageKey,
  localDB,
  resolveHistoryEnvironment,
} from '../src/services/localDB';
import { useAppStore, UserSession } from '../src/store/useAppStore';

const testUser: UserSession = {
  id: 77,
  name: 'Người đọc kiểm thử',
  email: 'reader@example.com',
  role: 'MEMBER',
  jwtToken: 'test-token',
  freeArticlesLeft: 3,
};

const article: Article = {
  id: 501,
  authorId: 12,
  authorName: 'Tác giả kiểm thử',
  coverImage: 'https://example.com/cover.jpg',
  categoryId: 3,
  categoryName: 'Thời sự',
  title: 'Bài viết dùng để kiểm thử',
  sapo: 'Nội dung tóm tắt',
  content: '<p>Nội dung đầy đủ</p>',
  type: 'FREE',
  status: 'PUBLISHED',
  viewCount: 10,
  createdAt: '2026-07-30T00:00:00.000Z',
};

describe('localDB', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppStore.setState({ bookmarkedIds: [], offlineIds: [], user: testUser });
  });

  it('lưu, đọc và xóa bài viết ngoại tuyến', async () => {
    await expect(localDB.saveArticleOffline(article)).resolves.toBe(true);
    await expect(localDB.isArticleOffline(article.id)).resolves.toBe(true);
    await expect(localDB.getOfflineArticleDetail(article.id)).resolves.toEqual(
      article
    );

    const summaries = await localDB.getOfflineArticles();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: article.id,
      title: article.title,
      categoryName: article.categoryName,
    });
    expect(useAppStore.getState().offlineIds).toEqual([article.id]);

    await expect(localDB.deleteArticleOffline(article.id)).resolves.toBe(true);
    await expect(localDB.isArticleOffline(article.id)).resolves.toBe(false);
    expect(useAppStore.getState().offlineIds).toEqual([]);
  });

  it('lưu và xóa bản chụp bài viết đã đánh dấu', async () => {
    await expect(localDB.saveBookmarkedArticle(article)).resolves.toBe(true);
    await expect(
      localDB.getBookmarkedArticles([article.id])
    ).resolves.toEqual([article]);

    await expect(localDB.deleteBookmarkedArticle(article.id)).resolves.toBe(
      true
    );
    await expect(
      localDB.getBookmarkedArticles([article.id])
    ).resolves.toEqual([]);
  });

  it('giữ nguyên mã thiết bị giữa các lần đọc', async () => {
    const firstId = await localDB.getDeviceId();
    const secondId = await localDB.getDeviceId();

    expect(firstId).toMatch(/^mobile-/);
    expect(secondId).toBe(firstId);
  });

  it('lưu bài vừa đọc dưới dạng bản chụp gọn nhẹ', async () => {
    await localDB.saveRecentArticle(article);

    const recent = await localDB.getRecentArticles();
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({
      id: article.id,
      title: article.title,
      content: '',
    });
  });

  it('đưa bài vừa mở lại lên đầu thay vì tạo bản trùng', async () => {
    const secondArticle = {
      ...article,
      id: 502,
      title: 'Bài viết thứ hai',
    };
    await localDB.saveRecentArticle(article);
    await localDB.saveRecentArticle(secondArticle);
    await localDB.saveRecentArticle(article);

    const recent = await localDB.getRecentArticles();
    expect(recent.map((item) => item.id)).toEqual([501, 502]);
  });

  it('chỉ giữ tối đa 10 bài trong lịch sử gần đây', async () => {
    for (let index = 0; index < 12; index += 1) {
      await localDB.saveRecentArticle({
        ...article,
        id: 600 + index,
        title: `Bài ${index}`,
      });
    }

    const recent = await localDB.getRecentArticles();
    expect(recent).toHaveLength(10);
    expect(recent[0].id).toBe(611);
    expect(recent[9].id).toBe(602);
  });

  it('không ghi hoặc hiển thị lịch sử khi chưa đăng nhập', async () => {
    useAppStore.setState({ user: null });
    await AsyncStorage.setItem(
      '@BaoDienTu:recent_articles',
      JSON.stringify([article])
    );

    await localDB.saveRecentArticle(article);

    await expect(localDB.getRecentArticles()).resolves.toEqual([]);
    expect(
      await AsyncStorage.getItem(buildRecentArticlesStorageKey(testUser.id))
    ).toBeNull();
  });

  it('tách lịch sử giữa các tài khoản', async () => {
    await localDB.saveRecentArticle(article);
    useAppStore.setState({ user: { ...testUser, id: 78 } });

    await expect(localDB.getRecentArticles()).resolves.toEqual([]);

    useAppStore.setState({ user: testUser });
    await expect(localDB.getRecentArticles()).resolves.toEqual([
      expect.objectContaining({ id: article.id }),
    ]);
  });

  it('tách khóa local và Azure kể cả khi cùng tài khoản', () => {
    const localKey = buildRecentArticlesStorageKey(testUser.id, 'local');
    const azureKey = buildRecentArticlesStorageKey(testUser.id, 'azure');

    expect(localKey).not.toBe(azureKey);
    expect(resolveHistoryEnvironment('local', 'http://192.168.1.10:8082')).toBe(
      'local'
    );
    expect(resolveHistoryEnvironment('azure', 'http://192.168.1.10:8082')).toBe(
      'azure'
    );
  });

  it('loại bỏ lịch sử kiểu cũ không rõ tài khoản và nguồn dữ liệu', async () => {
    await AsyncStorage.setItem(
      '@BaoDienTu:recent_articles',
      JSON.stringify([article])
    );

    await localDB.syncInitialLocalData();

    expect(await AsyncStorage.getItem('@BaoDienTu:recent_articles')).toBeNull();
  });
});
