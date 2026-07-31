import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { Article } from '../../types/content';
import { useToast } from '../../components/Toast/ToastContext';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import StaffHeader from './StaffHeader';
import { formatStaffDate, STAFF_COLORS } from './staffUi';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

export default function ModerationReviewScreen({ route, navigation }: any) {
  const articleId = Number(route.params.articleId);
  const colors = useAppStore((state) => state.getColors());
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showToast } = useToast();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    apiClient
      .getModerationArticle(articleId)
      .then((response) => setArticle(response.data))
      .catch((loadError: any) =>
        setError(loadError.message || 'Không thể tải bài chờ duyệt')
      )
      .finally(() => setLoading(false));
  }, [articleId]);

  const decide = async (approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      setError('Hãy nhập lý do để tác giả biết cần sửa phần nào.');
      return;
    }
    setDeciding(true);
    try {
      await apiClient.moderateArticle(
        articleId,
        approved,
        approved ? undefined : rejectionReason.trim()
      );
      setShowApprove(false);
      setShowReject(false);
      showToast(
        approved
          ? 'Bài viết đã được duyệt và xuất bản'
          : 'Đã gửi góp ý cho tác giả'
      );
      navigation.goBack();
    } catch (decisionError: any) {
      setError(decisionError.message || 'Không thể hoàn tất kiểm duyệt');
      setShowApprove(false);
    } finally {
      setDeciding(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <StaffHeader
          title="Kiểm duyệt bài"
          eyebrow="THE DAILY DESK"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error || 'Bài viết không còn trong hàng đợi'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StaffHeader
        title="Kiểm duyệt bài"
        eyebrow="THE DAILY DESK"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: STAFF_COLORS.redBg }]}>
            <Text style={{ color: STAFF_COLORS.redText }}>{error}</Text>
          </View>
        )}

        <View style={styles.metaBlock}>
          <Text style={[styles.category, { color: colors.primary }]}>
            {article.categoryName} · {article.type}
          </Text>
          <Text style={[styles.date, { color: colors.textMuted }]}>
            Gửi ngày {formatStaffDate(article.createdAt)}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {article.title}
          </Text>
          <Text style={[styles.author, { color: colors.textMuted }]}>
            Tác giả {article.authorName}
          </Text>
        </View>

        {!!article.coverImage && (
          <Image source={{ uri: article.coverImage }} style={styles.cover} />
        )}

        <View style={styles.articleBody}>
          <Text style={[styles.sapo, { color: colors.textMuted }]}>
            {article.sapo}
          </Text>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <RenderHtml
            contentWidth={width - 40}
            source={{ html: article.content }}
            baseStyle={{
              color: colors.text,
              fontSize: 17,
              lineHeight: 28,
            }}
            tagsStyles={{
              p: {
                color: colors.text,
                fontSize: 17,
                lineHeight: 28,
                marginBottom: 18,
              },
              img: { marginVertical: 12 },
            }}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 14),
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.rejectButton, { borderColor: colors.danger }]}
          onPress={() => {
            setError('');
            setShowReject(true);
          }}
        >
          <Text style={[styles.rejectText, { color: colors.danger }]}>
            Yêu cầu sửa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approveButton, { backgroundColor: colors.text }]}
          onPress={() => setShowApprove(true)}
        >
          <Text style={[styles.approveText, { color: colors.background }]}>
            Duyệt và xuất bản
          </Text>
        </TouchableOpacity>
      </View>

      <AppActionSheet
        visible={showApprove}
        eyebrow="XUẤT BẢN"
        title="Duyệt bài viết này?"
        description="Bài viết sẽ xuất hiện với độc giả và gửi thông báo theo chủ đề đã chọn."
        primaryLabel="Duyệt và xuất bản"
        secondaryLabel="Đọc lại"
        loading={deciding}
        onPrimary={() => decide(true)}
        onClose={() => setShowApprove(false)}
      />

      <Modal
        visible={showReject}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowReject(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowReject(false)}
          />
          <View
            style={[
              styles.rejectSheet,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sheetEyebrow, { color: colors.danger }]}>
              GÓP Ý BIÊN TẬP
            </Text>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Tác giả cần sửa điều gì?
            </Text>
            <Text style={[styles.sheetHint, { color: colors.textMuted }]}>
              Viết cụ thể để tác giả có thể chỉnh sửa và gửi lại nhanh.
            </Text>
            <TextInput
              value={rejectionReason}
              onChangeText={(value) => {
                setRejectionReason(value);
                setError('');
              }}
              multiline
              textAlignVertical="top"
              placeholder="Ví dụ: Cần bổ sung nguồn ở đoạn hai và rút gọn tiêu đề..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.reasonInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
            {!rejectionReason.trim() && !!error && (
              <Text style={[styles.inlineError, { color: colors.danger }]}>
                {error}
              </Text>
            )}
            <View style={styles.sheetActions}>
              <TouchableOpacity
                disabled={deciding}
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowReject(false)}
              >
                <Text style={[styles.cancelText, { color: colors.text }]}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={deciding}
                style={[styles.sendBackButton, { backgroundColor: colors.danger }]}
                onPress={() => decide(false)}
              >
                {deciding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.sendBackText}>Gửi lại tác giả</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { paddingBottom: 110 },
  metaBlock: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },
  category: { fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  date: { marginTop: 5, fontSize: 10 },
  title: {
    marginTop: 14,
    fontFamily: F_SERIF,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  author: { marginTop: 12, fontSize: 12, fontWeight: '600' },
  cover: { width: '100%', height: 250 },
  articleBody: { paddingHorizontal: 20, paddingTop: 22 },
  sapo: {
    fontFamily: F_SERIF,
    fontSize: 17,
    lineHeight: 25,
    fontStyle: 'italic',
  },
  rule: { height: 1, marginVertical: 22 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  rejectButton: {
    flex: 1,
    height: 48,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  approveButton: {
    flex: 1.35,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  rejectText: { fontSize: 12, fontWeight: '800' },
  approveText: { fontSize: 12, fontWeight: '800' },
  errorBox: { margin: 20, marginBottom: 0, padding: 12, borderRadius: 6 },
  errorText: { textAlign: 'center', fontSize: 13, lineHeight: 20 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,17,17,0.38)' },
  rejectSheet: {
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  sheetTitle: { marginTop: 7, fontFamily: F_SERIF, fontSize: 23, fontWeight: '700' },
  sheetHint: { marginTop: 6, fontSize: 12, lineHeight: 18 },
  reasonInput: {
    minHeight: 130,
    marginTop: 16,
    padding: 13,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineError: { marginTop: 7, fontSize: 11 },
  sheetActions: { marginTop: 16, flexDirection: 'row' },
  cancelButton: {
    flex: 1,
    height: 48,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  sendBackButton: { flex: 1.25, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  cancelText: { fontSize: 12, fontWeight: '800' },
  sendBackText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
