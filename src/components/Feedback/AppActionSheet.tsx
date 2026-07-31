import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';

type ActionTone = 'default' | 'danger' | 'vip';

interface AppActionSheetProps {
  visible: boolean;
  eyebrow?: string;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  tone?: ActionTone;
  loading?: boolean;
  onPrimary: () => void;
  onClose: () => void;
}

export default function AppActionSheet({
  visible,
  eyebrow,
  title,
  description,
  primaryLabel,
  secondaryLabel = 'Để sau',
  tone = 'default',
  loading = false,
  onPrimary,
  onClose,
}: AppActionSheetProps) {
  const colors = useAppStore((state) => state.getColors());
  const insets = useSafeAreaInsets();
  const accentColor =
    tone === 'danger'
      ? colors.danger
      : tone === 'vip'
        ? colors.vip
        : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={loading ? undefined : onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Đóng hộp xác nhận"
          style={StyleSheet.absoluteFillObject}
          onPress={loading ? undefined : onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {!!eyebrow && (
            <Text style={[styles.eyebrow, { color: accentColor }]}>
              {eyebrow}
            </Text>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>
            {description}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              disabled={loading}
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.secondaryLabel, { color: colors.text }]}>
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={loading}
              style={[
                styles.primaryButton,
                { backgroundColor: tone === 'danger' ? colors.danger : colors.text },
                loading && styles.disabledButton,
              ]}
              onPress={onPrimary}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={[styles.primaryLabel, { color: colors.background }]}>
                  {primaryLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,17,17,0.38)',
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    borderRadius: 2,
  },
  eyebrow: {
    marginTop: 20,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    fontFamily: 'serif',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '700',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    marginTop: 22,
    flexDirection: 'row',
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
    flex: 1.2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
