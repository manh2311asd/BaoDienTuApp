import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

interface StaffHeaderProps {
  title: string;
  eyebrow?: string;
  onBack: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function StaffHeader({
  title,
  eyebrow,
  onBack,
  actionLabel,
  onAction,
}: StaffHeaderProps) {
  const colors = useAppStore((state) => state.getColors());
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        accessibilityLabel="Quay lại"
        style={styles.side}
        onPress={onBack}
      >
        <Text style={[styles.back, { color: colors.text }]}>‹</Text>
      </TouchableOpacity>
      <View style={styles.copy}>
        {!!eyebrow && (
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {eyebrow}
          </Text>
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.side}>
        {!!actionLabel && (
          <TouchableOpacity onPress={onAction}>
            <Text style={[styles.action, { color: colors.primary }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 66,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
  side: {
    width: 72,
    minHeight: 42,
    justifyContent: 'center',
  },
  back: {
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '300',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 2,
    fontFamily: F_SERIF,
    fontSize: 17,
    fontWeight: '700',
  },
  action: {
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
  },
});
