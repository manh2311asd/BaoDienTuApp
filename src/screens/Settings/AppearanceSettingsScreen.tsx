import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Check, Moon, Palette, Smartphone, Sun } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ThemeSetting, useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';
import {
  SettingsActions,
  SettingsGroup,
  SettingsScreenLayout,
} from '../../components/Settings/SettingsScreenLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'AppearanceSettings'>;

const OPTIONS: Array<{
  value: ThemeSetting;
  title: string;
  description: string;
}> = [
  { value: 'light', title: 'Sáng', description: 'Nền giấy dịu, dễ đọc ban ngày' },
  { value: 'dark', title: 'Tối', description: 'Giảm độ chói khi đọc ban đêm' },
  { value: 'system', title: 'Theo hệ thống', description: 'Tự đổi cùng cài đặt thiết bị' },
];

export default function AppearanceSettingsScreen({ navigation }: Props) {
  const themeSetting = useAppStore((state) => state.themeSetting);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeSetting = useAppStore((state) => state.setThemeSetting);
  const shell = appTheme[themeMode];
  const [draft, setDraft] = useState<ThemeSetting>(themeSetting);

  const optionIcon = (value: ThemeSetting, color: string) => {
    if (value === 'light') return <Sun color={color} size={20} strokeWidth={2} />;
    if (value === 'dark') return <Moon color={color} size={20} strokeWidth={2} />;
    return <Smartphone color={color} size={20} strokeWidth={2} />;
  };

  return (
    <SettingsScreenLayout
      icon={<Palette color={shell.appPrimary} size={21} strokeWidth={2} />}
      navigation={navigation}
      subtitle="Chọn sắc độ phù hợp với môi trường đọc"
      testID="appearance-settings-screen"
      title="Giao diện"
    >
      <SettingsGroup eyebrow="CHẾ ĐỘ HIỂN THỊ" testID="appearance-options">
        <View style={styles.options}>
          {OPTIONS.map((option) => {
            const selected = draft === option.value;
            const preview =
              option.value === 'dark' ? appTheme.dark : appTheme.light;
            return (
              <TouchableOpacity
                key={option.value}
                accessibilityLabel={`${option.title}. ${option.description}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                activeOpacity={0.75}
                style={[
                  styles.option,
                  { borderColor: selected ? shell.appPrimary : shell.appBorder },
                  selected && { backgroundColor: shell.appPrimaryContainer },
                ]}
                onPress={() => setDraft(option.value)}
                testID={`appearance-option-${option.value}`}
              >
                <View style={styles.optionTop}>
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: selected ? shell.appSurface : shell.appSurfaceMuted },
                    ]}
                  >
                    {optionIcon(option.value, selected ? shell.appPrimary : shell.appTextSecondary)}
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: shell.appTextPrimary }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.optionDescription, { color: shell.appTextSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {selected && (
                    <View style={[styles.check, { backgroundColor: shell.appPrimary }]}>
                      <Check color={shell.appOnPrimary} size={15} strokeWidth={2.5} />
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.preview,
                    {
                      backgroundColor: preview.appBackground,
                      borderColor: preview.appBorder,
                    },
                  ]}
                >
                  <View style={[styles.previewLineWide, { backgroundColor: preview.appTextPrimary }]} />
                  <View style={[styles.previewLine, { backgroundColor: preview.appTextSecondary }]} />
                  <View style={[styles.previewChip, { backgroundColor: preview.appPrimary }]} />
                </View>
                <Text
                  style={[
                    styles.status,
                    { color: selected ? shell.appPrimary : shell.appTextMuted },
                  ]}
                >
                  {selected
                    ? draft === themeSetting
                      ? 'ĐANG DÙNG'
                      : 'SẼ ÁP DỤNG'
                    : 'CHẠM ĐỂ CHỌN'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SettingsGroup>

      <View style={[styles.note, { backgroundColor: shell.appSurfaceMuted }]}>
        <Text style={[styles.noteText, { color: shell.appTextSecondary }]}>
          Lựa chọn chỉ được lưu khi bạn nhấn Áp dụng. Ứng dụng đổi màu trực tiếp, không tải lại màn hình.
        </Text>
      </View>

      <SettingsActions
        onPrimary={() => {
          setThemeSetting(draft);
          navigation.goBack();
        }}
        onSecondary={() => setDraft('light')}
        primaryDisabled={draft === themeSetting}
        primaryLabel="Áp dụng"
        secondaryLabel="Khôi phục mặc định"
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  options: { padding: 8, gap: 8 },
  option: { minHeight: 150, padding: 11, borderWidth: 1, borderRadius: 9 },
  optionTop: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  optionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  optionCopy: { flex: 1, minWidth: 0, marginLeft: 10, paddingRight: 8 },
  optionTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  optionDescription: { marginTop: 1, fontSize: 10.5, lineHeight: 14 },
  check: {
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  preview: {
    height: 48,
    marginTop: 9,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 7,
  },
  previewLineWide: { width: '58%', height: 5, borderRadius: 3 },
  previewLine: { width: '76%', height: 4, marginTop: 6, borderRadius: 2, opacity: 0.5 },
  previewChip: {
    position: 'absolute',
    right: 10,
    top: 11,
    width: 27,
    height: 24,
    borderRadius: 6,
  },
  status: { marginTop: 7, fontSize: 9, fontWeight: '800', letterSpacing: 0.55 },
  note: { marginTop: 14, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 8 },
  noteText: { fontSize: 11, lineHeight: 16 },
});
