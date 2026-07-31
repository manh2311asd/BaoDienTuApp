import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiClient, resolveApiAssetUrl } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import {
  ArticleStatus,
  ArticleType,
  Category,
  StaffArticleInput,
} from '../../types/content';
import { useToast } from '../../components/Toast/ToastContext';
import StaffHeader from './StaffHeader';
import {
  STAFF_COLORS,
  STATUS_META,
  stripArticleHtml,
  toArticleHtml,
} from './staffUi';

const LOCAL_COMPOSER_KEY = '@BaoDienTu:author_composer';
const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface ComposerState {
  coverImage: string;
  categoryId: number | null;
  title: string;
  sapo: string;
  content: string;
  type: ArticleType;
}

const EMPTY_COMPOSER: ComposerState = {
  coverImage: '',
  categoryId: null,
  title: '',
  sapo: '',
  content: '',
  type: 'FREE',
};

export default function ArticleEditorScreen({ route, navigation }: any) {
  const sourceArticleId = route.params?.articleId as number | undefined;
  const colors = useAppStore((state) => state.getColors());
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [articleId, setArticleId] = useState<number | undefined>(sourceArticleId);
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>('DRAFT');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [categoryResult, articleResult] = await Promise.all([
          apiClient.getCategories(),
          sourceArticleId
            ? apiClient.getStaffArticle(sourceArticleId)
            : Promise.resolve(null),
        ]);
        if (!active) {
          return;
        }
        setCategories(categoryResult.data);
        if (articleResult) {
          const article = articleResult.data;
          setComposer({
            coverImage: article.coverImagePath || article.coverImage,
            categoryId: article.categoryId,
            title: article.title,
            sapo: article.sapo,
            content: stripArticleHtml(article.content),
            type: article.type,
          });
          setArticleStatus(article.status);
          setRejectionReason(article.rejectionReason || null);
        } else {
          const localDraft = await AsyncStorage.getItem(LOCAL_COMPOSER_KEY);
          if (localDraft && active) {
            setComposer({ ...EMPTY_COMPOSER, ...JSON.parse(localDraft) });
          }
        }
      } catch (loadError: any) {
        setError(loadError.message || 'Không thể mở trình soạn bài');
      } finally {
        if (active) {
          setLoading(false);
          setHydrated(true);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [sourceArticleId]);

  useEffect(() => {
    if (!hydrated || articleId) {
      return;
    }
    const timer = setTimeout(() => {
      AsyncStorage.setItem(LOCAL_COMPOSER_KEY, JSON.stringify(composer));
    }, 500);
    return () => clearTimeout(timer);
  }, [articleId, composer, hydrated]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === composer.categoryId),
    [categories, composer.categoryId]
  );

  const updateField = <K extends keyof ComposerState>(
    field: K,
    value: ComposerState[K]
  ) => {
    setComposer((current) => ({ ...current, [field]: value }));
    setError('');
  };

  const buildInput = (): StaffArticleInput | null => {
    if (
      !composer.coverImage.trim() ||
      !composer.categoryId ||
      !composer.title.trim() ||
      !composer.sapo.trim() ||
      !composer.content.trim()
    ) {
      setError(
        'Hãy nhập đủ ảnh bìa, chuyên mục, tiêu đề, sapo và nội dung trước khi lưu.'
      );
      return null;
    }
    return {
      coverImage: composer.coverImage.trim(),
      categoryId: composer.categoryId,
      title: composer.title.trim(),
      sapo: composer.sapo.trim(),
      content: toArticleHtml(composer.content),
      type: composer.type,
    };
  };

  const pickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Hãy cho phép ứng dụng truy cập thư viện để chọn ảnh bìa.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    const asset = result.assets[0];
    setUploadingImage(true);
    setError('');
    try {
      const response = await apiClient.uploadArticleImage(
        asset.uri,
        asset.mimeType || 'image/jpeg',
        asset.fileName || `article-cover-${Date.now()}.jpg`
      );
      updateField('coverImage', response.data.path);
      showToast('Đã tải ảnh bìa');
    } catch (uploadError: any) {
      setError(uploadError.message || 'Không thể tải ảnh bìa');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveDraft = async () => {
    const input = buildInput();
    if (!input) {
      return;
    }
    setSaving(true);
    try {
      const response = articleId
        ? await apiClient.updateStaffArticle(articleId, input)
        : await apiClient.createStaffDraft(input);
      setArticleId(response.data.id);
      setArticleStatus(response.data.status);
      await AsyncStorage.removeItem(LOCAL_COMPOSER_KEY);
      showToast(
        response.data.status === 'REJECTED'
          ? 'Đã lưu chỉnh sửa. Nhấn Gửi duyệt khi hoàn tất.'
          : 'Đã lưu bản nháp'
      );
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu bản nháp');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    const input = buildInput();
    if (!input) {
      return;
    }
    setSubmitting(true);
    try {
      if (!articleId) {
        await apiClient.createStaffArticle(input);
      } else {
        await apiClient.updateStaffArticle(articleId, input);
        await apiClient.submitStaffArticle(articleId);
      }
      await AsyncStorage.removeItem(LOCAL_COMPOSER_KEY);
      showToast('Bài viết đã được gửi tới bàn kiểm duyệt');
      navigation.goBack();
    } catch (submitError: any) {
      setError(submitError.message || 'Không thể gửi bài duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const statusMeta = STATUS_META[articleStatus];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StaffHeader
        title={articleId ? 'Chỉnh sửa bài' : 'Bài viết mới'}
        eyebrow="THE DAILY STUDIO"
        onBack={() => navigation.goBack()}
        actionLabel={preview ? 'SOẠN' : 'XEM TRƯỚC'}
        onAction={() => setPreview((value) => !value)}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusMeta.backgroundColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusMeta.label}
            </Text>
          </View>
          <Text style={[styles.headingTitle, { color: colors.text }]}>
            {preview ? 'Bản xem trước' : 'Nội dung bài viết'}
          </Text>
          <Text style={[styles.headingHint, { color: colors.textMuted }]}>
            {preview
              ? 'Đây là cách tiêu đề và nội dung sẽ xuất hiện với độc giả.'
              : 'Bản soạn mới được lưu trên máy sau mỗi thay đổi.'}
          </Text>
        </View>

        {!!rejectionReason && !preview && (
          <View
            style={[
              styles.rejectionBox,
              { backgroundColor: STAFF_COLORS.redBg },
            ]}
          >
            <Text style={[styles.rejectionLabel, { color: STAFF_COLORS.redText }]}>
              GÓP Ý TỪ BÀN BIÊN TẬP
            </Text>
            <Text style={[styles.rejectionText, { color: STAFF_COLORS.redText }]}>
              {rejectionReason}
            </Text>
          </View>
        )}

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: STAFF_COLORS.redBg }]}>
            <Text style={{ color: STAFF_COLORS.redText }}>{error}</Text>
          </View>
        )}

        {preview ? (
          <View style={styles.preview}>
            {!!composer.coverImage && (
              <Image
                source={{ uri: resolveApiAssetUrl(composer.coverImage) }}
                style={styles.previewImage}
              />
            )}
            <Text style={[styles.previewCategory, { color: colors.primary }]}>
              {selectedCategory?.name || 'Chưa chọn chuyên mục'} · {composer.type}
            </Text>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {composer.title || 'Tiêu đề bài viết'}
            </Text>
            <Text style={[styles.previewSapo, { color: colors.textMuted }]}>
              {composer.sapo || 'Phần giới thiệu ngắn của bài viết.'}
            </Text>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            {composer.content
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <Text
                  key={`${index}-${paragraph.slice(0, 12)}`}
                  style={[styles.previewParagraph, { color: colors.text }]}
                >
                  {paragraph}
                </Text>
              ))}
          </View>
        ) : (
          <View style={styles.form}>
            <FieldLabel label="ẢNH BÌA" colors={colors} />
            <TouchableOpacity
              disabled={uploadingImage}
              style={[
                styles.imagePickerButton,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
              onPress={pickCoverImage}
            >
              {uploadingImage ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Text style={[styles.imagePickerTitle, { color: colors.text }]}>
                    Chọn ảnh từ điện thoại
                  </Text>
                  <Text
                    style={[styles.imagePickerHint, { color: colors.textMuted }]}
                  >
                    JPEG, PNG hoặc WebP · tối đa 5 MB
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.orLabel, { color: colors.textMuted }]}>
              HOẶC DÁN URL ẢNH
            </Text>
            <TextInput
              value={composer.coverImage}
              onChangeText={(value) => updateField('coverImage', value)}
              placeholder="Dán đường dẫn ảnh https://..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />
            {!!composer.coverImage && (
              <Image
                source={{ uri: resolveApiAssetUrl(composer.coverImage) }}
                style={styles.coverPreview}
              />
            )}

            <FieldLabel label="CHUYÊN MỤC" colors={colors} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((category) => {
                const active = composer.categoryId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      {
                        backgroundColor: active ? colors.text : colors.card,
                        borderColor: active ? colors.text : colors.border,
                      },
                    ]}
                    onPress={() => updateField('categoryId', category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        { color: active ? colors.background : colors.textMuted },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FieldLabel label="QUYỀN ĐỌC" colors={colors} />
            <View style={[styles.typeSwitch, { borderColor: colors.border }]}>
              {(['FREE', 'VIP'] as ArticleType[]).map((type) => {
                const active = composer.type === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      active && { backgroundColor: colors.text },
                    ]}
                    onPress={() => updateField('type', type)}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        { color: active ? colors.background : colors.textMuted },
                      ]}
                    >
                      {type === 'FREE' ? 'Miễn phí' : 'Thành viên VIP'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FieldLabel label="TIÊU ĐỀ" colors={colors} />
            <TextInput
              value={composer.title}
              onChangeText={(value) => updateField('title', value)}
              placeholder="Tiêu đề rõ ràng, giàu thông tin"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={255}
              style={[
                styles.titleInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />
            <Text style={[styles.counter, { color: colors.textMuted }]}>
              {composer.title.length}/255
            </Text>

            <FieldLabel label="SAPO" colors={colors} />
            <TextInput
              value={composer.sapo}
              onChangeText={(value) => updateField('sapo', value)}
              placeholder="Tóm tắt điều quan trọng nhất trong 2–3 câu"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.sapoInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />

            <FieldLabel label="NỘI DUNG" colors={colors} />
            <TextInput
              value={composer.content}
              onChangeText={(value) => updateField('content', value)}
              placeholder="Viết nội dung bài. Cách một dòng để tạo đoạn mới."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={[
                styles.contentInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}
            />
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          disabled={saving || submitting}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={saveDraft}
        >
          {saving ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Text style={[styles.secondaryText, { color: colors.text }]}>
              Lưu bản nháp
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={saving || submitting}
          style={[styles.primaryButton, { backgroundColor: colors.text }]}
          onPress={submitForReview}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} size="small" />
          ) : (
            <Text style={[styles.primaryText, { color: colors.background }]}>
              Gửi duyệt
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ label, colors }: any) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 116 },
  heading: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  headingTitle: {
    marginTop: 10,
    fontFamily: F_SERIF,
    fontSize: 25,
    fontWeight: '700',
  },
  headingHint: { marginTop: 6, fontSize: 12, lineHeight: 18 },
  form: { paddingHorizontal: 20 },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  input: {
    height: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 13,
  },
  titleInput: {
    minHeight: 92,
    padding: 14,
    borderWidth: 1,
    borderRadius: 6,
    fontFamily: F_SERIF,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  sapoInput: {
    minHeight: 112,
    padding: 14,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  contentInput: {
    minHeight: 320,
    padding: 14,
    borderWidth: 1,
    borderRadius: 6,
    fontSize: 16,
    lineHeight: 26,
  },
  coverPreview: { height: 180, marginTop: 10, borderRadius: 6 },
  imagePickerButton: {
    minHeight: 72,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  imagePickerTitle: { fontSize: 13, fontWeight: '800' },
  imagePickerHint: { marginTop: 4, fontSize: 10 },
  orLabel: {
    marginVertical: 10,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  categoryList: { paddingRight: 20 },
  categoryButton: {
    height: 36,
    marginRight: 8,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  typeSwitch: { height: 44, padding: 3, flexDirection: 'row', borderWidth: 1, borderRadius: 6 },
  typeButton: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  typeText: { fontSize: 11, fontWeight: '700' },
  counter: { marginTop: 5, textAlign: 'right', fontSize: 9 },
  errorBox: { marginHorizontal: 20, marginBottom: 6, padding: 12, borderRadius: 6 },
  rejectionBox: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderRadius: 6 },
  rejectionLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  rejectionText: { marginTop: 7, fontSize: 13, lineHeight: 20 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 6,
  },
  primaryButton: {
    flex: 1.25,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  secondaryText: { fontSize: 12, fontWeight: '800' },
  primaryText: { fontSize: 12, fontWeight: '800' },
  preview: { paddingHorizontal: 20 },
  previewImage: { width: '100%', height: 220, borderRadius: 6 },
  previewCategory: { marginTop: 18, fontSize: 10, fontWeight: '800' },
  previewTitle: {
    marginTop: 8,
    fontFamily: F_SERIF,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
  previewSapo: {
    marginTop: 14,
    fontFamily: F_SERIF,
    fontSize: 17,
    lineHeight: 25,
    fontStyle: 'italic',
  },
  rule: { height: 1, marginVertical: 20 },
  previewParagraph: { marginBottom: 18, fontSize: 17, lineHeight: 28 },
});
