export interface Category {
  id: number;
  name: string;
}

export type ArticleStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'HIDDEN';

export type ArticleType = 'FREE' | 'VIP';

export type VipPreviewAccessMode =
  | 'VIP'
  | 'FREE_QUOTA'
  | 'ALREADY_READ'
  | 'PAYWALL'
  | 'LOGIN_REQUIRED';

export interface Article {
  id: number;
  authorId: number;
  authorName: string;
  coverImage: string;
  coverImagePath?: string;
  categoryId: number;
  categoryName: string;
  title: string;
  sapo: string;
  content: string;
  previewContent?: string;
  paywallRequired?: boolean;
  accessMode?: VipPreviewAccessMode;
  remainingFreeReads?: number | null;
  alreadyRead?: boolean;
  willConsumeFreeRead?: boolean;
  type: ArticleType;
  status: ArticleStatus;
  viewCount: number;
  createdAt: string;
  rejectionReason?: string | null;
}

export interface StaffArticleInput {
  coverImage: string;
  categoryId: number;
  title: string;
  sapo: string;
  content: string;
  type: ArticleType;
}

export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: 'MEMBER' | 'VIP' | 'AUTHOR' | 'CENSOR' | 'ADMIN';
  status: 'ACTIVE' | 'LOCKED';
  createdAt: string;
}

export interface AuthorStatsSummary {
  totalArticles: number;
  totalViews: number;
  totalRevenue: number;
  totalFollowers: number;
  freeViewPrice: number;
  vipViewPrice: number;
}

export interface Comment {
  id: number;
  articleId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

export interface VipPackage {
  id: number;
  name: string;
  durationDays: number;
  price: number;
  discountPercent: number;
  description: string;
}

export interface Subscription {
  id: number;
  targetType: 'AUTHOR' | 'CATEGORY';
  targetId: number;
  targetName: string;
}

export type NewsNotificationType =
  | 'NEW_ARTICLE'
  | 'HOT_ARTICLE'
  | 'ARTICLE_APPROVED'
  | 'ARTICLE_REJECTED'
  | 'AUTHOR_ARTICLE_HOT'
  | 'ADMIN_REVIEW_REQUIRED';

export interface NewsNotification {
  id: number;
  articleId: number;
  articleImage?: string | null;
  categoryName: string;
  articleType: 'FREE' | 'VIP';
  type: NewsNotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface UserPreferences {
  selectedTopics: Category[];
  pushNotificationsEnabled: boolean;
}
