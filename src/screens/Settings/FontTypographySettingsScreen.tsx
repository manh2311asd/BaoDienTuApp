import React, { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Type } from 'lucide-react-native';
import {
  ArticleFontFamily,
  ArticleLineHeight,
  FontSize,
  useAppStore,
} from '../../store/useAppStore';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { appTheme } from '../../theme/colors';
import {
  SettingsActions,
  SettingsGroup,
  SettingsScreenLayout,
} from '../../components/Settings/SettingsScreenLayout';
import {
  getArticleFontFamily,
  getArticleTextMetrics,
} from './readingSettingsUi';

type Props = NativeStackScreenProps<RootStackParamList, 'FontTypographySettings'>;
type Choice<T extends string> = { value: T; label: string; meta?: string };

const SIZE_OPTIONS: Choice<FontSize>[] = [
  { value: 'small', label: 'Nhỏ', meta: '90%' },
  { value: 'medium', label: 'Vừa', meta: '100%' },
  { value: 'large', label: 'Lớn', meta: '115%' },
  { value: 'xlarge', label: 'Rất lớn', meta: '130%' },
];
const FAMILY_OPTIONS: Choice<ArticleFontFamily>[] = [
  { value: 'app', label: 'Mặc định', meta: 'Theo kiểu chữ của ứng dụng' },
  { value: 'serif', label: 'Có chân', meta: 'Êm mắt với bài đọc dài' },
  { value: 'sans', label: 'Không chân', meta: 'Rõ và hiện đại' },
];
const LINE_OPTIONS: Choice<ArticleLineHeight>[] = [
  { value: 'compact', label: 'Gọn' },
  { value: 'default', label: 'Vừa' },
  { value: 'relaxed', label: 'Thoáng' },
];

function Segment<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  testID: string;
}) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  return (
    <View style={styles.segmentRow} testID={testID}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityLabel={`${option.label}${option.meta ? `, ${option.meta}` : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            activeOpacity={0.75}
            style={[
              styles.segment,
              { borderColor: shell.appBorder },
              selected && {
                backgroundColor: shell.appPrimaryContainer,
                borderColor: shell.appPrimary,
              },
            ]}
            onPress={() => onChange(option.value)}
            testID={`${testID}-${option.value}`}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                { color: selected ? shell.appPrimary : shell.appTextPrimary },
              ]}
            >
              {option.label}
            </Text>
            {!!option.meta && (
              <Text style={[styles.segmentMeta, { color: shell.appTextSecondary }]}>
                {option.meta}
              </Text>
            )}
            {selected && (
              <View style={[styles.selectedDot, { backgroundColor: shell.appPrimary }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function FontTypographySettingsScreen({ navigation }: Props) {
  const {
    articleFontFamily,
    articleFontSize,
    articleLineHeight,
    setArticleTypography,
    themeMode,
  } = useAppStore();
  const shell = appTheme[themeMode];
  const [draftSize, setDraftSize] = useState(articleFontSize);
  const [draftFamily, setDraftFamily] = useState(articleFontFamily);
  const [draftLineHeight, setDraftLineHeight] = useState(articleLineHeight);
  const previewMetrics = useMemo(
    () => getArticleTextMetrics(17, 27, draftSize, draftLineHeight),
    [draftLineHeight, draftSize]
  );
  const previewFamily = getArticleFontFamily(draftFamily);
  const hasChanges =
    draftSize !== articleFontSize ||
    draftFamily !== articleFontFamily ||
    draftLineHeight !== articleLineHeight;

  const restoreDefaults = () => {
    setDraftSize('medium');
    setDraftFamily('app');
    setDraftLineHeight('default');
  };

  return (
    <SettingsScreenLayout
      icon={<Type color={shell.appPrimary} size={21} strokeWidth={2} />}
      navigation={navigation}
      subtitle="Điều chỉnh riêng phần nội dung bài báo"
      testID="font-typography-settings-screen"
      title="Cỡ chữ và kiểu chữ"
    >
      <SettingsGroup eyebrow="XEM TRƯỚC" testID="font-preview-group">
        <View style={styles.preview}>
          <Text style={[styles.previewCategory, { color: shell.appPrimary }]}>ĐỜI SỐNG</Text>
          <Text
            style={[
              styles.previewTitle,
              { color: shell.appTextPrimary, fontFamily: previewFamily },
            ]}
          >
            Một khoảng lặng để đọc sâu hơn
          </Text>
          <Text
            style={[
              styles.previewBody,
              {
                color: shell.appTextSecondary,
                fontFamily: previewFamily,
                fontSize: previewMetrics.fontSize,
                lineHeight: previewMetrics.lineHeight,
              },
            ]}
            testID="article-typography-preview"
          >
            Mỗi bài viết sẽ dễ theo dõi hơn khi cỡ chữ và khoảng cách dòng phù hợp với thói quen đọc của bạn.
          </Text>
        </View>
      </SettingsGroup>

      <SettingsGroup eyebrow="CỠ CHỮ">
        <View style={styles.controlBlock}>
          <Segment
            onChange={setDraftSize}
            options={SIZE_OPTIONS}
            testID="article-font-size"
            value={draftSize}
          />
        </View>
      </SettingsGroup>

      <SettingsGroup eyebrow="KIỂU CHỮ">
        <View style={styles.choiceList}>
          {FAMILY_OPTIONS.map((option, index) => {
            const selected = draftFamily === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityLabel={`${option.label}, ${option.meta}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                activeOpacity={0.74}
                style={[
                  styles.familyRow,
                  index < FAMILY_OPTIONS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: shell.appDivider,
                  },
                ]}
                onPress={() => setDraftFamily(option.value)}
                testID={`article-font-family-${option.value}`}
              >
                <Text
                  style={[
                    styles.familySample,
                    {
                      color: selected ? shell.appPrimary : shell.appTextPrimary,
                      fontFamily: getArticleFontFamily(option.value),
                    },
                  ]}
                >
                  Aa
                </Text>
                <View style={styles.familyCopy}>
                  <Text style={[styles.familyLabel, { color: shell.appTextPrimary }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.familyMeta, { color: shell.appTextSecondary }]}>
                    {option.meta}
                  </Text>
                </View>
                {selected ? (
                  <View style={[styles.check, { backgroundColor: shell.appPrimary }]}>
                    <Check color={shell.appOnPrimary} size={15} strokeWidth={2.5} />
                  </View>
                ) : (
                  <View style={[styles.emptyCheck, { borderColor: shell.appBorder }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SettingsGroup>

      <SettingsGroup eyebrow="KHOẢNG CÁCH DÒNG">
        <View style={styles.controlBlock}>
          <Segment
            onChange={setDraftLineHeight}
            options={LINE_OPTIONS}
            testID="article-line-height"
            value={draftLineHeight}
          />
        </View>
      </SettingsGroup>

      <SettingsActions
        onPrimary={() => {
          setArticleTypography({
            fontSize: draftSize,
            fontFamily: draftFamily,
            lineHeight: draftLineHeight,
          });
          navigation.goBack();
        }}
        onSecondary={restoreDefaults}
        primaryDisabled={!hasChanges}
        primaryLabel="Áp dụng"
        secondaryLabel="Khôi phục mặc định"
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  preview: { paddingHorizontal: 16, paddingVertical: 15 },
  previewCategory: { fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  previewTitle: {
    marginTop: 7,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
  },
  previewBody: { marginTop: 9 },
  controlBlock: { padding: 8 },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segment: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  segmentLabel: { fontSize: 11.5, lineHeight: 15, fontWeight: '700' },
  segmentMeta: { marginTop: 2, fontSize: 9.5, lineHeight: 12 },
  selectedDot: { width: 4, height: 4, marginTop: 4, borderRadius: 2 },
  choiceList: { overflow: 'hidden' },
  familyRow: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  familySample: {
    width: 42,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: Platform.OS === 'android' ? '600' : '700',
  },
  familyCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  familyLabel: { fontSize: 13.5, lineHeight: 18, fontWeight: '700' },
  familyMeta: { marginTop: 1, fontSize: 10.5, lineHeight: 14 },
  check: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  emptyCheck: { width: 25, height: 25, borderWidth: 1, borderRadius: 13 },
});
