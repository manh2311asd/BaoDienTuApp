import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { localDB } from '../../services/localDB';
import { appTheme } from '../../theme/colors';

// §3 Font tokens
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const F_SANS  = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });

// §4 Palette
const C = {
  bg: appTheme.light.appBackground,
  card: appTheme.light.appSurface,
  border: appTheme.light.appBorder,
  ink: appTheme.light.appTextPrimary,
  muted: appTheme.light.appTextSecondary,
  btnBg: appTheme.light.appHeader,
  btnText: appTheme.light.appHeaderText,
  danger: appTheme.light.appError,
  dangerBg: appTheme.light.appPrimaryContainer,
  accent: appTheme.light.appPrimary,
  accentBg: appTheme.light.appBlueContainer,
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { setUser } = useAppStore();

  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setError('');
    setSuccessMessage('');
    setName('');
    setPassword('');
    setConfirm('');
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.4, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    
    if (mode === 'register' && password.length < 8) {
      setError('Mật khẩu phải có độ dài tối thiểu là 8 ký tự.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) { setError('Vui lòng nhập họ tên.'); return; }
      if (password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiClient.login(email.trim(), password);
        setUser(res.data);
        await localDB.saveUserSession(res.data);
      } else {
        await apiClient.register(name.trim(), email.trim(), password, confirm);
        switchMode('login');
        setSuccessMessage(
          'Tài khoản đã sẵn sàng. Email của bạn đã được điền, hãy nhập mật khẩu để đăng nhập.'
        );
      }
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Masthead */}
        <Animated.View style={[styles.masthead, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.mastheadRule} />
          <Text style={styles.mastTitle}>NewsDaily</Text>
          <View style={styles.mastheadRule} />
          <Text style={styles.mastheadSub}>Tin tức chọn lọc · Mỗi ngày</Text>
        </Animated.View>

        {/* Mode Switcher */}
        <Animated.View style={[styles.switcher, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
            onPress={() => switchMode('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, mode === 'login' && styles.switchBtnTextActive]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, mode === 'register' && styles.switchBtnActive]}
            onPress={() => switchMode('register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchBtnText, mode === 'register' && styles.switchBtnTextActive]}>
              Đăng ký
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Form Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {successMessage !== '' && (
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Tạo tài khoản thành công</Text>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}

          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn An"
                placeholderTextColor={C.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Địa chỉ email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={C.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Tối thiểu 8 ký tự"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType={mode === 'register' ? 'next' : 'done'}
              onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
            />
          </View>

          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={C.muted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>
          )}

          {error !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.btnText} size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <Text style={styles.footerText}>
            {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
          </Text>
          <TouchableOpacity
            style={styles.footerAction}
            onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.footerLink}>
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  masthead: {
    alignItems: 'center',
    marginBottom: 36,
  },
  mastheadRule: {
    height: 1,
    width: 60,
    backgroundColor: C.ink,
    marginVertical: 10,
  },
  mastTitle: {
    fontFamily: F_SERIF,
    fontSize: 38,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  mastheadSub: {
    fontFamily: F_SANS,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: appTheme.light.appSurfaceMuted,
    borderRadius: 8,
    padding: 3,
    marginBottom: 24,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 6,
  },
  switchBtnActive: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchBtnText: {
    fontFamily: F_SANS,
    fontSize: 14,
    color: C.muted,
    fontWeight: '500',
  },
  switchBtnTextActive: {
    color: C.ink,
    fontWeight: '700',
  },
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: F_SANS,
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontFamily: F_SANS,
    fontSize: 15,
    color: C.ink,
    backgroundColor: C.bg,
  },
  successBanner: {
    backgroundColor: appTheme.light.appSecondaryContainer,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  successTitle: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '700',
    color: appTheme.light.appSuccess,
  },
  successText: {
    marginTop: 4,
    fontFamily: F_SANS,
    fontSize: 13,
    color: appTheme.light.appSecondary,
    lineHeight: 19,
  },
  errorBanner: {
    backgroundColor: C.dangerBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: appTheme.light.appBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.danger,
    lineHeight: 19,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: C.btnBg,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: appTheme.light.appTextMuted,
  },
  primaryBtnText: {
    fontFamily: F_SANS,
    fontSize: 15,
    fontWeight: '700',
    color: C.btnText,
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: F_SANS,
    fontSize: 14,
    color: C.muted,
  },
  footerAction: {
    minHeight: 44,
    marginLeft: 5,
    justifyContent: 'center',
  },
  footerLink: {
    color: C.accent,
    fontWeight: '700',
  },
});
