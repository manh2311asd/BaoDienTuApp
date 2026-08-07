import React, { useEffect, useState } from 'react';
import {
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Database, Image as ImageIcon, Moon, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontSize, useAppStore } from '../../store/useAppStore';
import { FONT_SIZE_OPTIONS } from '../../theme/typography';

interface ReadingPreferencesSheetProps {
  visible: boolean;
  onClose: () => void;
  onClearCache?: () => void;
  clearingCache?: boolean;
}

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;

export default function ReadingPreferencesSheet({
  visible,
  onClose,
  onClearCache,
  clearingCache = false,
}: ReadingPreferencesSheetProps) {
  const {
    fontSize,
    getColors,
    setFontSize,
    setShowImages,
    setThemeSetting,
    showImages,
    themeSetting,
  } = useAppStore();
  const colors = getColors();
  const insets = useSafeAreaInsets();
  const [draftFontSize, setDraftFontSize] = useState<FontSize>(fontSize);
  const selectedFontIndex = FONT_SIZE_OPTIONS.findIndex(
    (item) => item.value === draftFontSize
  );

  useEffect(() => {
    if (visible) {
      setDraftFontSize(fontSize);
    }
  }, [fontSize, visible]);

  const applyFontSize = () => {
    const nextFontSize = draftFontSize;
    const changed = nextFontSize !== fontSize;
    onClose();

    if (changed) {
      InteractionManager.runAfterInteractions(() => {
        setFontSize(nextFontSize);
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(20, insets.bottom + 10),
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>
                TRẢI NGHIỆM ĐỌC
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                Chọn cỡ chữ
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Đóng cài đặt đọc"
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <X color={colors.text} size={20} {...IC} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.fontSection}>
              <View style={styles.fontScaleHeader}>
                <Text style={[styles.smallA, { color: colors.textMuted }]}>Aa</Text>
                <Text style={[styles.largeA, { color: colors.text }]}>Aa</Text>
              </View>

              <View style={styles.scaleRow}>
                {FONT_SIZE_OPTIONS.map((option, index) => {
                  const selected = option.value === draftFontSize;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={styles.scaleOption}
                      onPress={() => setDraftFontSize(option.value)}
                    >
                      <View style={styles.scaleTrackRow}>
                        {index > 0 && (
                          <View
                            style={[
                              styles.scaleLine,
                              {
                                backgroundColor:
                                  selectedFontIndex >= index
                                    ? colors.primary
                                    : colors.border,
                              },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.scaleDot,
                            {
                              backgroundColor: selected
                                ? colors.primary
                                : colors.card,
                              borderColor: selected
                                ? colors.primary
                                : colors.border,
                            },
                            selected && styles.scaleDotSelected,
                          ]}
                        />
                        {index < FONT_SIZE_OPTIONS.length - 1 && (
                          <View
                            style={[
                              styles.scaleLine,
                              {
                                backgroundColor:
                                  selectedFontIndex > index
                                    ? colors.primary
                                    : colors.border,
                              },
                            ]}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.scaleLabel,
                          {
                            color: selected ? colors.text : colors.textMuted,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[styles.scalePercent, { color: colors.textMuted }]}
                      >
                        {option.percent}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>



              <TouchableOpacity
                activeOpacity={0.82}
                style={[
                  styles.applyButton,
                  { backgroundColor: colors.text },
                ]}
                onPress={applyFontSize}
              >
                <Text
                  style={[
                    styles.applyButtonText,
                    { color: colors.background },
                  ]}
                >
                  {draftFontSize === fontSize
                    ? 'Giữ cỡ chữ này'
                    : 'Áp dụng cỡ chữ'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <ImageIcon color={colors.text} size={19} {...IC} />
                <View>
                  <Text style={[styles.settingText, { color: colors.text }]}>
                    Ảnh bài viết
                  </Text>
                  <Text style={[styles.settingHint, { color: colors.textMuted }]}>
                    Tắt để tiết kiệm dữ liệu
                  </Text>
                </View>
              </View>
              <Switch
                value={showImages}
                onValueChange={setShowImages}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <View style={[styles.themeSection, { borderTopColor: colors.border }]}>
              <View style={styles.settingLabel}>
                <Moon color={colors.text} size={19} {...IC} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Giao diện
                </Text>
              </View>
              <View
                style={[
                  styles.segmented,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {[
                  { value: 'light' as const, label: 'Sáng' },
                  { value: 'dark' as const, label: 'Tối' },
                  { value: 'system' as const, label: 'Hệ thống' },
                ].map((option) => {
                  const selected = themeSetting === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.segment,
                        selected && { backgroundColor: colors.card },
                      ]}
                      onPress={() => setThemeSetting(option.value)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          { color: selected ? colors.text : colors.textMuted },
                          selected && styles.segmentTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {onClearCache && (
              <TouchableOpacity
                disabled={clearingCache}
                style={[styles.clearRow, { borderTopColor: colors.border }]}
                onPress={onClearCache}
              >
                <Database color={colors.text} size={19} {...IC} />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  {clearingCache ? 'Đang dọn...' : 'Dọn dữ liệu tạm'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,17,17,0.38)',
  },
  sheet: {
    maxHeight: '91%',
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 3,
    fontFamily: F_SERIF,
    fontSize: 23,
    fontWeight: '700',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  fontSection: {
    padding: 18,
  },
  fontScaleHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  smallA: {
    fontFamily: F_SERIF,
    fontSize: 22,
  },
  largeA: {
    fontFamily: F_SERIF,
    fontSize: 34,
    fontWeight: '700',
  },
  scaleRow: {
    marginTop: 8,
    flexDirection: 'row',
  },
  scaleOption: {
    flex: 1,
    alignItems: 'center',
  },
  scaleTrackRow: {
    width: '100%',
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleLine: {
    flex: 1,
    height: 2,
  },
  scaleDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },
  scaleDotSelected: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 4,
  },
  scaleLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  scalePercent: {
    marginTop: 2,
    fontSize: 9,
  },
  preview: {
    marginTop: 18,
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
  },
  previewLabel: {
    marginBottom: 7,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  previewTitle: {
    fontFamily: F_SERIF,
    fontWeight: '700',
  },
  previewBody: {
    marginTop: 7,
  },
  applyButton: {
    height: 44,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  applyButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingRow: {
    minHeight: 66,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  settingHint: {
    marginLeft: 10,
    marginTop: 2,
    fontSize: 11,
  },
  themeSection: {
    padding: 18,
    borderTopWidth: 1,
  },
  segmented: {
    marginTop: 14,
    padding: 3,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  segmentText: {
    fontSize: 12,
  },
  segmentTextSelected: {
    fontWeight: '700',
  },
  clearRow: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
