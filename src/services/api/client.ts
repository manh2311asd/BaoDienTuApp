import axios from 'axios';
import {
  Article,
  Comment,
  VipPackage,
  Category,
  Subscription,
  NewsNotification,
  UserPreferences,
  StaffArticleInput,
  AdminUser,
  AuthorStatsSummary,
} from '../../types/content';
import { useAppStore, UserSession } from '../../store/useAppStore';
import { clearStoredSession } from '../sessionStorage';

const DEFAULT_DEVELOPMENT_API_URL = 'http://172.18.61.23:8082';
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_DEVELOPMENT_API_URL;

export const resolveApiAssetUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  if (/^(https?:|file:|data:)/i.test(value)) {
    return value;
  }
  return `${BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

export class ApiClientError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

const mapStaffArticle = (item: any): Article => ({
  id: Number(item.id),
  authorId: Number(item.authorId),
  authorName: item.authorName || 'Tác giả',
  coverImage: resolveApiAssetUrl(item.coverImage),
  coverImagePath: item.coverImage || '',
  categoryId: Number(item.categoryId),
  categoryName: item.categoryName || '',
  title: item.title || '',
  sapo: item.sapo || '',
  content: item.content || '',
  type: item.type || 'FREE',
  status: item.status || 'DRAFT',
  rejectionReason: item.rejectionReason,
  viewCount: Number(item.viewCount || 0),
  createdAt: item.createdAt,
});

// Request interceptor to automatically add authorization header
api.interceptors.request.use(
  (config) => {
    const { user } = useAppStore.getState();
    if (user && user.jwtToken) {
      config.headers.Authorization = `Bearer ${user.jwtToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common authorization issues (P0.2)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      const { logout } = useAppStore.getState();
      logout();
      await clearStoredSession();
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export const apiClient = {
  // Authentication
  login: async (email: string, password_plain: string): Promise<ApiResponse<UserSession>> => {
    try {
      const res = await api.post('/api/auth/login', {
        email,
        password: password_plain,
      });
      const data = res.data;
      const userId = Number(data.id);
      if (!Number.isFinite(userId) || !data.jwtToken) {
        throw new Error('Phản hồi đăng nhập không hợp lệ');
      }
      const userSession: UserSession = {
        id: userId,
        name: data.name,
        email: data.email || email,
        role: data.role,
        jwtToken: data.jwtToken,
        vipExpiryDate: data.vipExpiryDate,
        freeArticlesLeft: Number(data.freeArticlesLeft ?? 0),
        avatar: resolveApiAssetUrl(data.avatar) || undefined,
      };
      return { data: userSession, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Đăng nhập thất bại');
    }
  },

  register: async (fullName: string, email: string, password_plain: string, confirmation_plain?: string): Promise<ApiResponse<void>> => {
    try {
      await api.post('/api/auth/register', {
        name: fullName,
        email,
        password: password_plain,
        confirmation: confirmation_plain || password_plain,
      });
      return { data: undefined, status: 200 };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Đăng ký thất bại');
    }
  },

  // Categories
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    try {
      const res = await api.get('/api/categories');
      return { data: res.data, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lấy danh mục thất bại');
    }
  },

  // Articles Search
  searchArticles: async (
    keyword?: string,
    categoryId?: number,
    authorName?: string,
    authorId?: number
  ): Promise<ApiResponse<Article[]>> => {
    try {
      const res = await api.get('/api/articles/search', {
        params: {
          keyword,
          categoryId,
          authorName,
          authorId,
        },
      });
      const mapped: Article[] = res.data.map((item: any) => ({
        id: item.id,
        authorId: item.authorId || 0,
        authorName: item.authorName || 'Ẩn danh',
        coverImage: resolveApiAssetUrl(item.coverImage),
        coverImagePath: item.coverImage,
        categoryId: item.categoryId || 0,
        categoryName: item.categoryName || '',
        title: item.title,
        sapo: item.sapo,
        content: '',
        type: item.type || 'FREE',
        status: 'PUBLISHED',
        viewCount: item.viewCount || 0,
        createdAt: item.createdAt,
      }));
      return { data: mapped, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Tìm kiếm bài viết thất bại');
    }
  },

  // Article Detail Read
  readArticle: async (articleId: number, deviceId: string): Promise<ApiResponse<any>> => {
    try {
      const res = await api.get(`/api/articles/${articleId}/read`, {
        headers: {
          'X-Anonymous-Reader-Key': deviceId,
        },
      });
      const data = res.data;
      
      // Update store user free articles if backend returned it
      if (data.meteredAccessApplied && data.remainingFreeReads !== undefined) {
        const { user, setUser } = useAppStore.getState();
        if (user) {
          setUser({
            ...user,
            freeArticlesLeft: data.remainingFreeReads,
          });
        }
      }

      const mapped = {
        id: data.id,
        title: data.title,
        sapo: data.sapo,
        content: data.content,
        coverImage: resolveApiAssetUrl(data.coverImage),
        coverImagePath: data.coverImage,
        authorName: data.authorName,
        authorId: data.authorId,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        type: data.type,
        viewCount: data.viewCount,
        createdAt: data.createdAt,
        vipAccessGranted: data.vipAccessGranted,
        meteredAccessApplied: data.meteredAccessApplied,
        remainingFreeReads: data.remainingFreeReads,
        accessMessage: data.accessMessage,
        status: 'PUBLISHED' as const,
      };

      return { data: mapped, status: res.status };
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Lỗi không xác định';
      throw new ApiClientError(msg, e.response?.status);
    }
  },

  // Article VIP Preview
  getArticlePreview: async (articleId: number): Promise<ApiResponse<any>> => {
    try {
      const res = await api.get(`/api/articles/${articleId}/preview`);
      const data = res.data;
      const mapped = {
        id: data.id,
        title: data.title,
        sapo: data.sapo,
        coverImage: resolveApiAssetUrl(data.coverImage),
        coverImagePath: data.coverImage,
        previewContent: data.previewContent,
        authorId: data.authorId,
        authorName: data.authorName,
        categoryId: data.categoryId,
        categoryName: data.categoryName,
        type: data.type,
        paywallRequired: data.paywallRequired,
        accessMode: data.accessMode,
        remainingFreeReads: data.remainingFreeReads,
        alreadyRead: Boolean(data.alreadyRead),
        willConsumeFreeRead: Boolean(data.willConsumeFreeRead),
      };
      return { data: mapped, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi tải bản xem trước');
    }
  },

  // AI Summary
  getAiSummary: async (articleId: number): Promise<ApiResponse<any>> => {
    try {
      const res = await api.get(`/api/articles/summary`, {
        params: { articleId },
      });
      return { data: res.data, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi tạo tóm tắt AI');
    }
  },

  // Comments
  getComments: async (articleId: number): Promise<ApiResponse<Comment[]>> => {
    try {
      const res = await api.get(`/api/articles/${articleId}/comments`);
      const mapped: Comment[] = res.data.map((c: any) => ({
        id: c.id,
        articleId: c.articleId,
        userId: c.userId,
        userName: c.userName || 'Độc giả',
        content: c.content,
        createdAt: c.createdAt,
      }));
      return { data: mapped, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi lấy bình luận');
    }
  },

  addComment: async (articleId: number, content: string): Promise<ApiResponse<Comment>> => {
    try {
      const res = await api.post(`/api/articles/${articleId}/comments`, { content });
      const c = res.data;
      const mapped: Comment = {
        id: c.id,
        articleId: c.articleId,
        userId: c.userId,
        userName: c.userName || 'Độc giả',
        content: c.content,
        createdAt: c.createdAt,
      };
      return { data: mapped, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi gửi bình luận');
    }
  },

  // VIP Packages & Transactions
  getVipPackages: async (): Promise<ApiResponse<VipPackage[]>> => {
    try {
      const res = await api.get('/api/vip-packages');
      const mapped: VipPackage[] = res.data.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        durationDays: pkg.durationDays,
        price: pkg.price,
        discountPercent: pkg.discountPercent || 0,
        description: pkg.description,
      }));
      return { data: mapped, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi tải gói VIP');
    }
  },

  createTransaction: async (packageId: number): Promise<ApiResponse<{ paymentUrl: string }>> => {
    try {
      const res = await api.post('/api/transactions/create', { packageId });
      return { data: res.data, status: res.status };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi khởi tạo giao dịch');
    }
  },

  // Subscriptions
  getMySubscriptions: async (): Promise<ApiResponse<Subscription[]>> => {
    try {
      const res = await api.get('/api/subscriptions/my');
      return {
        data: (res.data || []).map((item: any) => ({
          id: Number(item.id),
          targetType: item.targetType,
          targetId: Number(item.targetId),
          targetName: item.targetName,
        })),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Lỗi tải danh sách đang theo dõi'
      );
    }
  },

  subscribeTopic: async (
    targetType: 'AUTHOR' | 'CATEGORY',
    targetId: number
  ): Promise<ApiResponse<Subscription>> => {
    try {
      const res = await api.post('/api/subscriptions', { targetType, targetId });
      return {
        data: {
          id: Number(res.data.id),
          targetType: res.data.targetType,
          targetId: Number(res.data.targetId),
          targetName: res.data.targetName,
        },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi đăng ký theo dõi');
    }
  },

  unsubscribeTopic: async (targetType: 'AUTHOR' | 'CATEGORY', targetId: number): Promise<ApiResponse<void>> => {
    try {
      await api.delete(`/api/subscriptions/${targetType}/${targetId}`);
      return { data: undefined, status: 204 };
    } catch (e: any) {
      throw new Error(e.response?.data?.message || e.message || 'Lỗi hủy theo dõi');
    }
  },

  // Personal news preferences
  getUserPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    try {
      const res = await api.get('/api/me/preferences');
      return {
        data: {
          selectedTopics: (res.data.selectedTopics || []).map((item: any) => ({
            id: Number(item.id),
            name: item.name,
          })),
          pushNotificationsEnabled: Boolean(
            res.data.pushNotificationsEnabled
          ),
        },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể tải chủ đề quan tâm'
      );
    }
  },

  updateUserPreferences: async (
    categoryIds: number[],
    pushNotificationsEnabled: boolean
  ): Promise<ApiResponse<UserPreferences>> => {
    try {
      const res = await api.put('/api/me/preferences', {
        categoryIds,
        pushNotificationsEnabled,
      });
      return {
        data: {
          selectedTopics: (res.data.selectedTopics || []).map((item: any) => ({
            id: Number(item.id),
            name: item.name,
          })),
          pushNotificationsEnabled: Boolean(
            res.data.pushNotificationsEnabled
          ),
        },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể lưu chủ đề quan tâm'
      );
    }
  },

  // In-app notifications
  getNotifications: async (): Promise<ApiResponse<NewsNotification[]>> => {
    try {
      const res = await api.get('/api/me/notifications');
      return {
        data: (res.data || []).map((item: any) => ({
          id: Number(item.id),
          articleId: Number(item.articleId),
          articleImage: resolveApiAssetUrl(item.articleImage),
          categoryName: item.categoryName || 'Tin tức',
          articleType: item.articleType || 'FREE',
          type: item.type,
          title: item.title,
          message: item.message,
          read: Boolean(item.read),
          createdAt: item.createdAt,
        })),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể tải thông báo'
      );
    }
  },

  getUnreadNotificationCount: async (): Promise<ApiResponse<number>> => {
    try {
      const res = await api.get('/api/me/notifications/unread-count');
      return {
        data: Number(res.data.count || 0),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể tải số thông báo'
      );
    }
  },

  markNotificationRead: async (
    notificationId: number
  ): Promise<ApiResponse<void>> => {
    try {
      const res = await api.patch(
        `/api/me/notifications/${notificationId}/read`
      );
      return { data: undefined, status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể cập nhật thông báo'
      );
    }
  },

  markAllNotificationsRead: async (): Promise<ApiResponse<void>> => {
    try {
      const res = await api.patch('/api/me/notifications/read-all');
      return { data: undefined, status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể đánh dấu đã đọc'
      );
    }
  },

  updateMyAvatar: async (
    avatar: string
  ): Promise<ApiResponse<{ avatar: string }>> => {
    try {
      const res = await api.patch('/api/me/account/avatar', { avatar });
      return {
        data: { avatar: resolveApiAssetUrl(res.data.avatar) },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể cập nhật ảnh đại diện'
      );
    }
  },

  uploadArticleImage: async (
    uri: string,
    mimeType = 'image/jpeg',
    fileName = 'article-cover.jpg'
  ): Promise<ApiResponse<{ path: string }>> => {
    try {
      const formData = new FormData();
      formData.append(
        'file',
        {
          uri,
          type: mimeType,
          name: fileName,
        } as any
      );
      const res = await api.post('/api/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      return {
        data: { path: res.data.path },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải ảnh bìa'
      );
    }
  },

  // Author workspace
  getStaffArticles: async (keyword?: string): Promise<ApiResponse<Article[]>> => {
    try {
      const res = await api.get('/api/staff/articles', {
        params: { q: keyword?.trim() || undefined },
      });
      return {
        data: (res.data || []).map(mapStaffArticle),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải bài tác nghiệp'
      );
    }
  },

  getStaffArticle: async (articleId: number): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.get(`/api/staff/articles/${articleId}`);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải bản thảo'
      );
    }
  },

  createStaffArticle: async (
    input: StaffArticleInput
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.post('/api/staff/articles/create', input);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể gửi bài duyệt'
      );
    }
  },

  createStaffDraft: async (
    input: StaffArticleInput
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.post('/api/staff/articles/drafts', input);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể lưu bản nháp'
      );
    }
  },

  updateStaffArticle: async (
    articleId: number,
    input: StaffArticleInput
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.put(`/api/staff/articles/${articleId}`, input);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể cập nhật bài viết'
      );
    }
  },

  submitStaffArticle: async (
    articleId: number
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.post(`/api/staff/articles/${articleId}/submit`);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể gửi bài duyệt'
      );
    }
  },

  // Moderation and publication visibility
  getPendingArticles: async (): Promise<ApiResponse<Article[]>> => {
    try {
      const res = await api.get('/api/moderation/articles/pending');
      return {
        data: (res.data || []).map(mapStaffArticle),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải hàng đợi duyệt'
      );
    }
  },

  getModerationArticle: async (
    articleId: number
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.get(`/api/moderation/articles/${articleId}`);
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải bài chờ duyệt'
      );
    }
  },

  moderateArticle: async (
    articleId: number,
    approved: boolean,
    rejectionReason?: string
  ): Promise<ApiResponse<Article>> => {
    try {
      const res = await api.post(
        `/api/moderation/articles/${articleId}/decision`,
        { approved, rejectionReason }
      );
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể hoàn tất kiểm duyệt'
      );
    }
  },

  getVisibilityArticles: async (
    keyword?: string
  ): Promise<ApiResponse<Article[]>> => {
    try {
      const res = await api.get('/api/moderation/articles/visibility', {
        params: { q: keyword?.trim() || undefined },
      });
      return {
        data: (res.data || []).map(mapStaffArticle),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải bài đã xuất bản'
      );
    }
  },

  setArticleVisibility: async (
    articleId: number,
    visible: boolean
  ): Promise<ApiResponse<Article>> => {
    try {
      const action = visible ? 'show' : 'hide';
      const res = await api.post(
        `/api/moderation/articles/${articleId}/${action}`
      );
      return { data: mapStaffArticle(res.data), status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể đổi trạng thái bài'
      );
    }
  },

  getAuthorStats: async (
    authorId: number,
    days = 30
  ): Promise<ApiResponse<AuthorStatsSummary>> => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - Math.max(1, days - 1));
      const formatDate = (value: Date) =>
        value.toISOString().slice(0, 10).replace(/-/g, '');
      const res = await api.get('/api/stats/author', {
        params: {
          authorId,
          startDate: formatDate(start),
          endDate: formatDate(end),
          groupBy: 'day',
        },
      });
      return {
        data: {
          totalArticles: Number(res.data.totalArticles || 0),
          totalViews: Number(res.data.totalViews || 0),
          totalRevenue: Number(res.data.totalRevenue || 0),
          totalFollowers: Number(res.data.totalFollowers || 0),
          freeViewPrice: Number(res.data.freeViewPrice || 0),
          vipViewPrice: Number(res.data.vipViewPrice || 0),
        },
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message ||
          e.message ||
          'Không thể tải thống kê doanh thu'
      );
    }
  },

  // Admin users
  getAdminUsers: async (keyword?: string): Promise<ApiResponse<AdminUser[]>> => {
    try {
      const res = await api.get('/api/admin/users', {
        params: { q: keyword?.trim() || undefined },
      });
      return {
        data: (res.data || []).map((item: any) => ({
          id: Number(item.id),
          fullName: item.fullName,
          email: item.email,
          role: item.role,
          status: item.status || 'ACTIVE',
          createdAt: item.createdAt,
        })),
        status: res.status,
      };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể tải người dùng'
      );
    }
  },

  updateAdminUserRole: async (
    userId: number,
    role: AdminUser['role']
  ): Promise<ApiResponse<AdminUser>> => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/role`, { role });
      return { data: res.data as AdminUser, status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể đổi vai trò'
      );
    }
  },

  updateAdminUserStatus: async (
    userId: number,
    status: AdminUser['status']
  ): Promise<ApiResponse<AdminUser>> => {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/status`, {
        status,
      });
      return { data: res.data as AdminUser, status: res.status };
    } catch (e: any) {
      throw new Error(
        e.response?.data?.message || e.message || 'Không thể đổi trạng thái'
      );
    }
  },
};
