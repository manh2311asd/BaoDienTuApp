import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  Article,
  ArticleStatus,
  AuthorStatsSummary,
} from '../../types/content';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import StaffHeader from './StaffHeader';
import {
  formatStaffDate,
  formatStaffMoney,
  STAFF_COLORS,
  STATUS_META,
} from './staffUi';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const AUTHOR_FILTERS: Array<{ value: 'ALL' | ArticleStatus; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'PUBLISHED', label: 'Đã đăng' },
  { value: 'REJECTED', label: 'Cần sửa' },
];

export default function StaffWorkspaceScreen({ navigation }: any) {
  const user = useAppStore((state) => state.user);
  const colors = useAppStore((state) => state.getColors());
  const [articles, setArticles] = useState<Article[]>([]);
  const [pending, setPending] = useState<Article[]>([]);
  const [visibility, setVisibility] = useState<Article[]>([]);
  const [authorStats, setAuthorStats] = useState<AuthorStatsSummary | null>(null);
  const [filter, setFilter] = useState<'ALL' | ArticleStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [visibilityTarget, setVisibilityTarget] = useState<Article | null>(null);
  const [changingVisibility, setChangingVisibility] = useState(false);

  const isAuthor = user?.role === 'AUTHOR';
  const isAdmin = user?.role === 'ADMIN';
  const isCensor = user?.role === 'CENSOR';

  const loadWorkspace = useCallback(async (silent = false) => {
    if (!user) {
      return;
    }
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      if (user.role === 'AUTHOR') {
        const [articlesResult, statsResult] = await Promise.allSettled([
          apiClient.getStaffArticles(),
          apiClient.getAuthorStats(user.id),
        ]);
        if (articlesResult.status === 'rejected') {
          throw articlesResult.reason;
        }
        setArticles(articlesResult.value.data);
        setAuthorStats(
          statsResult.status === 'fulfilled' ? statsResult.value.data : null
        );
      } else if (user.role === 'ADMIN') {
        const [allResult, pendingResult, visibilityResult] =
          await Promise.allSettled([
            apiClient.getStaffArticles(),
            apiClient.getPendingArticles(),
            apiClient.getVisibilityArticles(),
          ]);
        if (allResult.status === 'fulfilled') {
          setArticles(allResult.value.data);
        }
        if (pendingResult.status === 'fulfilled') {
          setPending(pendingResult.value.data);
        }
        if (visibilityResult.status === 'fulfilled') {
          setVisibility(visibilityResult.value.data);
        }
        if (
          allResult.status === 'rejected' &&
          pendingResult.status === 'rejected' &&
          visibilityResult.status === 'rejected'
        ) {
          throw allResult.reason;
        }
      } else if (user.role === 'CENSOR') {
        const response = await apiClient.getPendingArticles();
        setPending(response.data);
      }
    } catch (loadError: any) {
      setError(loadError.message || 'Không thể tải không gian tác nghiệp');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadWorkspace();
    }, [loadWorkspace])
  );

  const authorArticles = useMemo(
    () =>
      filter === 'ALL'
        ? articles
        : articles.filter((article) => article.status === filter),
    [articles, filter]
  );

  const totalViews = articles
    .filter((article) => article.status === 'PUBLISHED')
    .reduce((sum, article) => sum + article.viewCount, 0);

  const openAuthorArticle = (article: Article) => {
    if (article.status === 'DRAFT' || article.status === 'REJECTED') {
      navigation.navigate('ArticleEditor', { articleId: article.id });
      return;
    }
    if (article.status === 'PUBLISHED') {
      navigation.navigate('ArticleDetail', {
        articleId: article.id,
        articleType: article.type,
      });
    }
  };

  const confirmVisibilityChange = async () => {
    if (!visibilityTarget) {
      return;
    }
    setChangingVisibility(true);
    try {
      const makeVisible = visibilityTarget.status === 'HIDDEN';
      await apiClient.setArticleVisibility(visibilityTarget.id, makeVisible);
      setVisibilityTarget(null);
      await loadWorkspace(true);
    } catch (changeError: any) {
      setError(changeError.message || 'Không thể đổi trạng thái bài');
    } finally {
      setChangingVisibility(false);
    }
  };

  if (!isAuthor && !isAdmin && !isCensor) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          Tài khoản chưa có quyền tác nghiệp
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.link, { color: colors.primary }]}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderArticleRow = (
    article: Article,
    onPress: () => void,
    action?: React.ReactNode
  ) => {
    const status = STATUS_META[article.status];
    return (
      <TouchableOpacity
        key={article.id}
        activeOpacity={0.78}
        style={[styles.articleRow, { borderBottomColor: colors.border }]}
        onPress={onPress}
      >
        {article.coverImage ? (
          <Image source={{ uri: article.coverImage }} style={styles.thumbnail} />
        ) : (
          <View
            style={[styles.thumbnail, { backgroundColor: colors.background }]}
          />
        )}
        <View style={styles.articleCopy}>
          <View style={styles.articleMeta}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.backgroundColor },
              ]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {formatStaffDate(article.createdAt)}
            </Text>
          </View>
          <Text
            style={[styles.articleTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {article.title}
          </Text>
          <Text style={[styles.articleHint, { color: colors.textMuted }]}>
            {article.categoryName} · {article.viewCount} lượt đọc
          </Text>
          {!!article.rejectionReason && (
            <Text
              style={[styles.rejection, { color: colors.danger }]}
              numberOfLines={2}
            >
              {article.rejectionReason}
            </Text>
          )}
        </View>
        {action}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StaffHeader
        title={
          isAuthor
            ? 'Không gian tác giả'
            : isAdmin
              ? 'Trung tâm quản trị'
              : 'Bàn kiểm duyệt'
        }
        eyebrow={isAuthor ? 'NEWSDAILY STUDIO' : 'NEWSDAILY DESK'}
        onBack={() => navigation.goBack()}
        actionLabel={isAuthor ? 'VIẾT BÀI' : undefined}
        onAction={() => navigation.navigate('ArticleEditor')}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadWorkspace(true);
              }}
              tintColor={colors.text}
            />
          }
        >
          {!!error && (
            <View
              style={[
                styles.notice,
                { backgroundColor: STAFF_COLORS.redBg },
              ]}
            >
              <Text style={{ color: STAFF_COLORS.redText }}>{error}</Text>
            </View>
          )}

          {isAuthor && (
            <>
              <View style={styles.intro}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>
                  BÀN LÀM VIỆC
                </Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  Chào {user?.name}
                </Text>
                <Text style={[styles.heroCopy, { color: colors.textMuted }]}>
                  Soạn bài, theo dõi kiểm duyệt và xem hiệu quả nội dung của bạn.
                </Text>
              </View>

              <View
                style={[styles.metrics, { borderColor: colors.border }]}
              >
                <Metric
                  value={articles.filter((item) => item.status === 'DRAFT').length}
                  label="Bản nháp"
                  colors={colors}
                />
                <Metric
                  value={articles.filter((item) => item.status === 'PENDING').length}
                  label="Chờ duyệt"
                  colors={colors}
                  bordered
                />
                <Metric value={totalViews} label="Lượt đọc" colors={colors} bordered />
              </View>

              <View
                style={[
                  styles.revenueCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.revenueHeader}>
                  <View>
                    <Text style={[styles.eyebrow, { color: colors.primary }]}>
                      HIỆU QUẢ 30 NGÀY
                    </Text>
                    <Text style={[styles.revenueLabel, { color: colors.textMuted }]}>
                      Doanh thu ước tính
                    </Text>
                  </View>
                  <Text style={[styles.revenueValue, { color: colors.text }]}>
                    {formatStaffMoney(authorStats?.totalRevenue || 0)}
                  </Text>
                </View>
                <View
                  style={[styles.revenueDivider, { backgroundColor: colors.border }]}
                />
                <View style={styles.revenueMeta}>
                  <Text style={[styles.revenueMetaText, { color: colors.textMuted }]}>
                    {authorStats?.totalViews || 0} lượt đọc ·{' '}
                    {authorStats?.totalArticles || 0} bài xuất bản
                  </Text>
                  <Text style={[styles.revenueRate, { color: colors.textMuted }]}>
                    Thường {formatStaffMoney(authorStats?.freeViewPrice || 0)}/lượt · VIP{' '}
                    {formatStaffMoney(authorStats?.vipViewPrice || 0)}/lượt
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryCta, { backgroundColor: colors.text }]}
                onPress={() => navigation.navigate('ArticleEditor')}
              >
                <Text style={[styles.primaryCtaText, { color: colors.background }]}>
                  Viết bài mới
                </Text>
                <Text style={[styles.primaryCtaArrow, { color: colors.background }]}>
                  →
                </Text>
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {AUTHOR_FILTERS.map((item) => {
                  const active = filter === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.filterButton,
                        {
                          backgroundColor: active ? colors.text : colors.card,
                          borderColor: active ? colors.text : colors.border,
                        },
                      ]}
                      onPress={() => setFilter(item.value)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          { color: active ? colors.background : colors.textMuted },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <SectionTitle
                title="Bài của tôi"
                count={authorArticles.length}
                colors={colors}
              />
              <View style={[styles.list, { borderTopColor: colors.border }]}>
                {authorArticles.length > 0 ? (
                  authorArticles.map((article) =>
                    renderArticleRow(article, () => openAuthorArticle(article))
                  )
                ) : (
                  <EmptyState
                    title="Chưa có bài trong mục này"
                    description="Bản nháp và bài gửi duyệt sẽ xuất hiện tại đây."
                    colors={colors}
                  />
                )}
              </View>
            </>
          )}

          {(isAdmin || isCensor) && (
            <>
              <View style={styles.intro}>
                <Text style={[styles.eyebrow, { color: colors.primary }]}>
                  VIỆC CẦN XỬ LÝ
                </Text>
                <Text style={[styles.heroTitle, { color: colors.text }]}>
                  {pending.length} bài đang chờ duyệt
                </Text>
                <Text style={[styles.heroCopy, { color: colors.textMuted }]}>
                  Đọc toàn bộ nội dung trước khi xuất bản hoặc gửi lại tác giả.
                </Text>
              </View>

              {isAdmin && (
                <View style={[styles.adminActions, { borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.adminAction}
                    onPress={() => navigation.navigate('AdminUsers')}
                  >
                    <Text style={[styles.actionEyebrow, { color: colors.primary }]}>
                      TÀI KHOẢN
                    </Text>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>
                      Quản lý người dùng
                    </Text>
                    <Text style={[styles.actionHint, { color: colors.textMuted }]}>
                      Cấp quyền tác giả, kiểm duyệt và khóa tài khoản.
                    </Text>
                  </TouchableOpacity>
                  <View
                    style={[styles.adminActionDivider, { backgroundColor: colors.border }]}
                  />
                  <View style={styles.adminAction}>
                    <Text style={[styles.actionEyebrow, { color: colors.warning }]}>
                      KHO BÀI
                    </Text>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>
                      {visibility.length} bài công khai hoặc đang ẩn
                    </Text>
                    <Text style={[styles.actionHint, { color: colors.textMuted }]}>
                      Theo dõi trạng thái xuất bản ngay bên dưới.
                    </Text>
                  </View>
                </View>
              )}

              <SectionTitle title="Hàng đợi duyệt" count={pending.length} colors={colors} />
              <View style={[styles.list, { borderTopColor: colors.border }]}>
                {pending.length > 0 ? (
                  pending.map((article) =>
                    renderArticleRow(article, () =>
                      navigation.navigate('ModerationReview', {
                        articleId: article.id,
                      })
                    )
                  )
                ) : (
                  <EmptyState
                    title="Hàng đợi đã trống"
                    description="Bài mới của tác giả sẽ xuất hiện tại đây."
                    colors={colors}
                  />
                )}
              </View>

              {isAdmin && (
                <>
                  <SectionTitle
                    title="Quản lý xuất bản"
                    count={visibility.length}
                    colors={colors}
                  />
                  <View style={[styles.list, { borderTopColor: colors.border }]}>
                    {visibility.slice(0, 12).map((article) =>
                      renderArticleRow(
                        article,
                        () =>
                          navigation.navigate('ArticleDetail', {
                            articleId: article.id,
                            articleType: article.type,
                          }),
                        <TouchableOpacity
                          style={[
                            styles.visibilityButton,
                            { borderColor: colors.border },
                          ]}
                          onPress={() => setVisibilityTarget(article)}
                        >
                          <Text
                            style={[
                              styles.visibilityButtonText,
                              {
                                color:
                                  article.status === 'HIDDEN'
                                    ? colors.success
                                    : colors.danger,
                              },
                            ]}
                          >
                            {article.status === 'HIDDEN' ? 'HIỆN' : 'ẨN'}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <AppActionSheet
        visible={Boolean(visibilityTarget)}
        eyebrow="QUẢN LÝ XUẤT BẢN"
        title={
          visibilityTarget?.status === 'HIDDEN'
            ? 'Hiển thị lại bài viết?'
            : 'Ẩn bài viết khỏi độc giả?'
        }
        description={
          visibilityTarget?.status === 'HIDDEN'
            ? 'Bài viết sẽ xuất hiện trở lại trên ứng dụng.'
            : 'Bài viết sẽ được gỡ khỏi các luồng tin nhưng không bị xóa.'
        }
        primaryLabel={
          visibilityTarget?.status === 'HIDDEN' ? 'Hiển thị lại' : 'Ẩn bài'
        }
        secondaryLabel="Hủy"
        tone={visibilityTarget?.status === 'HIDDEN' ? 'default' : 'danger'}
        loading={changingVisibility}
        onPrimary={confirmVisibilityChange}
        onClose={() => setVisibilityTarget(null)}
      />
    </View>
  );
}

function Metric({ value, label, colors, bordered = false }: any) {
  return (
    <View
      style={[
        styles.metric,
        bordered && { borderLeftWidth: 1, borderLeftColor: colors.border },
      ]}
    >
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, count, colors }: any) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{count}</Text>
    </View>
  );
}

function EmptyState({ title, description, colors }: any) {
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyCopy, { color: colors.textMuted }]}>
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  intro: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  eyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: {
    marginTop: 7,
    fontFamily: F_SERIF,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  heroCopy: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  metrics: {
    marginHorizontal: 20,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  metric: { flex: 1, paddingVertical: 16, paddingHorizontal: 12 },
  metricValue: { fontFamily: F_SERIF, fontSize: 22, fontWeight: '700' },
  metricLabel: { marginTop: 3, fontSize: 10, fontWeight: '600' },
  revenueCard: {
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  revenueLabel: { marginTop: 5, fontSize: 11, fontWeight: '600' },
  revenueValue: {
    fontFamily: F_SERIF,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '700',
  },
  revenueDivider: { height: 1, marginVertical: 13 },
  revenueMeta: { gap: 4 },
  revenueMetaText: { fontSize: 11, fontWeight: '700' },
  revenueRate: { fontSize: 10, lineHeight: 15 },
  primaryCta: {
    height: 48,
    marginHorizontal: 20,
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 6,
  },
  primaryCtaText: { fontSize: 13, fontWeight: '800' },
  primaryCtaArrow: { fontSize: 20 },
  filters: { paddingHorizontal: 20, paddingVertical: 20 },
  filterButton: {
    height: 36,
    marginRight: 8,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  filterText: { fontSize: 11, fontWeight: '700' },
  sectionTitleRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 11,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontFamily: F_SERIF, fontSize: 20, fontWeight: '700' },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  list: { borderTopWidth: 1 },
  articleRow: {
    minHeight: 118,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
  },
  thumbnail: { width: 82, height: 82, marginRight: 13, borderRadius: 6 },
  articleCopy: { flex: 1 },
  articleMeta: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.55 },
  date: { marginLeft: 8, fontSize: 9 },
  articleTitle: {
    marginTop: 7,
    fontFamily: F_SERIF,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  articleHint: { marginTop: 5, fontSize: 9 },
  rejection: { marginTop: 5, fontSize: 10, lineHeight: 14 },
  notice: { margin: 20, padding: 12, borderRadius: 6 },
  link: { marginTop: 14, fontWeight: '700' },
  empty: { paddingHorizontal: 20, paddingVertical: 34 },
  emptyTitle: { fontFamily: F_SERIF, fontSize: 17, fontWeight: '700' },
  emptyCopy: { marginTop: 6, fontSize: 12, lineHeight: 18 },
  adminActions: {
    marginHorizontal: 20,
    marginBottom: 22,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  adminAction: { paddingVertical: 16 },
  adminActionDivider: { height: 1 },
  actionEyebrow: { fontSize: 8, fontWeight: '800', letterSpacing: 0.9 },
  actionTitle: { marginTop: 5, fontFamily: F_SERIF, fontSize: 17, fontWeight: '700' },
  actionHint: { marginTop: 4, fontSize: 11, lineHeight: 17 },
  visibilityButton: {
    minWidth: 48,
    height: 34,
    marginLeft: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
  },
  visibilityButtonText: { fontSize: 9, fontWeight: '800' },
});
