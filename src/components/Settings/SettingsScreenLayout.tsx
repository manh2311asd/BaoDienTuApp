import React, { ReactNode } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;

interface SettingsScreenLayoutProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  navigation: { goBack: () => void };
  testID: string;
}

export function SettingsScreenLayout({
  title,
  subtitle,
  icon,
  children,
  footer,
  navigation,
  testID,
}: SettingsScreenLayoutProps) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: shell.appBackground }]}
      testID={testID}
    >
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={shell.appBackground}
      />
      <View style={[styles.header, { borderBottomColor: shell.appDivider }]}>
        <TouchableOpacity
          accessibilityLabel="Quay lại màn Cá nhân"
          accessibilityRole="button"
          hitSlop={4}
          style={styles.backButton}
          onPress={navigation.goBack}
          testID={`${testID}-back`}
        >
          <View style={[styles.backVisual, { borderColor: shell.appBorder }]}>
            <ChevronLeft color={shell.appTextPrimary} size={22} {...IC} />
          </View>
        </TouchableOpacity>
        <View
          style={[
            styles.headerIcon,
            { backgroundColor: shell.appPrimaryContainer },
          ]}
        >
          {icon}
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: shell.appTextPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: shell.appTextSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(28, insets.bottom + 20) },
        ]}
      >
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

interface SettingsGroupProps {
  eyebrow: string;
  children: ReactNode;
  testID?: string;
}

export function SettingsGroup({ eyebrow, children, testID }: SettingsGroupProps) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  return (
    <View style={styles.groupBlock} testID={testID}>
      <Text style={[styles.eyebrow, { color: shell.appPrimary }]}>{eyebrow}</Text>
      <View
        style={[
          styles.group,
          { backgroundColor: shell.appSurface, borderColor: shell.appBorder },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

interface SettingsRowProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  value?: string;
  control?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  destructive?: boolean;
  last?: boolean;
}

export function SettingsRow({
  title,
  description,
  icon,
  value,
  control,
  onPress,
  accessibilityLabel,
  testID,
  destructive = false,
  last = false,
}: SettingsRowProps) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const content = (
    <>
      {!!icon && (
        <View
          style={[
            styles.rowIcon,
            { backgroundColor: destructive ? shell.appErrorContainer : shell.appSurfaceMuted },
          ]}
        >
          {icon}
        </View>
      )}
      <View style={styles.rowCopy}>
        <Text
          style={[
            styles.rowTitle,
            { color: destructive ? shell.appError : shell.appTextPrimary },
          ]}
        >
          {title}
        </Text>
        {!!description && (
          <Text style={[styles.rowDescription, { color: shell.appTextSecondary }]}>
            {description}
          </Text>
        )}
      </View>
      {!!value && (
        <Text style={[styles.rowValue, { color: shell.appTextSecondary }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      {control}
      {!!onPress && <ChevronRight color={shell.appTextMuted} size={17} {...IC} />}
    </>
  );
  const rowStyle = [
    styles.row,
    !last && { borderBottomWidth: 1, borderBottomColor: shell.appDivider },
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        activeOpacity={0.72}
        style={rowStyle}
        onPress={onPress}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={rowStyle} testID={testID}>
      {content}
    </View>
  );
}

export function SettingsActions({
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  primaryDisabled = false,
}: {
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryDisabled?: boolean;
}) {
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  return (
    <View style={styles.actions}>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.secondaryAction, { borderColor: shell.appBorder }]}
        onPress={onSecondary}
      >
        <Text style={[styles.secondaryActionText, { color: shell.appTextPrimary }]}>
          {secondaryLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        disabled={primaryDisabled}
        style={[
          styles.primaryAction,
          { backgroundColor: shell.appPrimary },
          primaryDisabled && styles.disabled,
        ]}
        onPress={onPrimary}
      >
        <Text style={[styles.primaryActionText, { color: shell.appOnPrimary }]}>
          {primaryLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
  },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backVisual: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    marginTop: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  headerCopy: { flex: 1, minWidth: 0, marginLeft: 11, paddingRight: 4 },
  title: {
    fontFamily: F_SERIF,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.45,
  },
  subtitle: { marginTop: 3, fontSize: 12.5, lineHeight: 18 },
  content: { paddingHorizontal: 15, paddingTop: 4 },
  groupBlock: { marginTop: 20 },
  eyebrow: { marginHorizontal: 2, marginBottom: 8, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7 },
  group: { overflow: 'hidden', borderWidth: 1, borderRadius: 10 },
  row: {
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0, marginLeft: 10, paddingRight: 8 },
  rowTitle: { fontSize: 13.5, lineHeight: 18, fontWeight: '700' },
  rowDescription: { marginTop: 2, fontSize: 11, lineHeight: 15 },
  rowValue: { maxWidth: 104, marginRight: 7, fontSize: 11.5, fontWeight: '600' },
  actions: { marginTop: 24, marginBottom: 4 },
  primaryAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  primaryActionText: { fontSize: 13.5, fontWeight: '800' },
  secondaryAction: { minHeight: 48, marginBottom: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.52 },
});
