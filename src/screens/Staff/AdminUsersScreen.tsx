import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { AdminUser } from '../../types/content';
import { useToast } from '../../components/Toast/ToastContext';
import StaffHeader from './StaffHeader';
import { STAFF_COLORS } from './staffUi';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});

const ROLES: Array<{
  value: Exclude<AdminUser['role'], 'VIP'>;
  label: string;
  description: string;
}> = [
  { value: 'MEMBER', label: 'Độc giả', description: 'Đọc và bình luận' },
  { value: 'AUTHOR', label: 'Tác giả', description: 'Soạn và gửi bài' },
  { value: 'CENSOR', label: 'Kiểm duyệt', description: 'Duyệt hoặc trả bài' },
  { value: 'ADMIN', label: 'Quản trị', description: 'Toàn quyền quản lý' },
];

export default function AdminUsersScreen({ navigation }: any) {
  const currentUser = useAppStore((state) => state.user);
  const colors = useAppStore((state) => state.getColors());
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async (query = keyword, silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');
    try {
      const response = await apiClient.getAdminUsers(query);
      setUsers(response.data);
    } catch (loadError: any) {
      setError(loadError.message || 'Không thể tải người dùng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [keyword]);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(keyword), 350);
    return () => clearTimeout(timer);
  }, [keyword, loadUsers]);

  const changeRole = async (role: Exclude<AdminUser['role'], 'VIP'>) => {
    if (!selectedUser) {
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.updateAdminUserRole(selectedUser.id, role);
      setUsers((current) =>
        current.map((item) =>
          item.id === selectedUser.id ? { ...item, role: response.data.role } : item
        )
      );
      setSelectedUser((current) =>
        current ? { ...current, role: response.data.role } : current
      );
      showToast('Đã cập nhật vai trò');
    } catch (changeError: any) {
      setError(changeError.message || 'Không thể đổi vai trò');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!selectedUser) {
      return;
    }
    const nextStatus = selectedUser.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    setSaving(true);
    try {
      const response = await apiClient.updateAdminUserStatus(
        selectedUser.id,
        nextStatus
      );
      setUsers((current) =>
        current.map((item) =>
          item.id === selectedUser.id
            ? { ...item, status: response.data.status }
            : item
        )
      );
      setSelectedUser(null);
      showToast(nextStatus === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa');
    } catch (changeError: any) {
      setError(changeError.message || 'Không thể đổi trạng thái tài khoản');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StaffHeader
        title="Quản lý người dùng"
        eyebrow="NEWSDAILY ADMIN"
        onBack={() => navigation.goBack()}
      />
      <View style={[styles.searchArea, { borderBottomColor: colors.border }]}>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm theo tên hoặc email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.searchInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />
        <Text style={[styles.resultCount, { color: colors.textMuted }]}>
          {users.length} tài khoản
        </Text>
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: STAFF_COLORS.redBg }]}>
          <Text style={{ color: STAFF_COLORS.redText }}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadUsers(keyword, true);
              }}
              tintColor={colors.text}
            />
          }
        >
          {users.map((item) => {
            const isSelf = item.id === currentUser?.id;
            return (
              <TouchableOpacity
                key={item.id}
                disabled={isSelf}
                activeOpacity={0.78}
                style={[
                  styles.userRow,
                  { borderBottomColor: colors.border },
                  isSelf && styles.selfRow,
                ]}
                onPress={() => setSelectedUser(item)}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor:
                        item.status === 'LOCKED'
                          ? STAFF_COLORS.redBg
                          : STAFF_COLORS.blueBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarLetter,
                      {
                        color:
                          item.status === 'LOCKED'
                            ? STAFF_COLORS.redText
                            : STAFF_COLORS.blueText,
                      },
                    ]}
                  >
                    {item.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userCopy}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {item.fullName}
                    {isSelf ? ' · Bạn' : ''}
                  </Text>
                  <Text style={[styles.email, { color: colors.textMuted }]}>
                    {item.email}
                  </Text>
                  <View style={styles.userMeta}>
                    <View
                      style={[
                        styles.roleBadge,
                        { backgroundColor: STAFF_COLORS.grayBg },
                      ]}
                    >
                      <Text style={[styles.roleText, { color: colors.textMuted }]}>
                        {item.role}
                      </Text>
                    </View>
                    {item.status === 'LOCKED' && (
                      <Text style={[styles.lockedText, { color: colors.danger }]}>
                        ĐÃ KHÓA
                      </Text>
                    )}
                  </View>
                </View>
                {!isSelf && (
                  <Text style={[styles.manageText, { color: colors.primary }]}>
                    QUẢN LÝ
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={Boolean(selectedUser)}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedUser(null)}
          />
          <View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 18),
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sheetEyebrow, { color: colors.primary }]}>
              QUYỀN TÀI KHOẢN
            </Text>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {selectedUser?.fullName}
            </Text>
            <Text style={[styles.sheetEmail, { color: colors.textMuted }]}>
              {selectedUser?.email}
            </Text>

            <Text style={[styles.optionLabel, { color: colors.textMuted }]}>
              VAI TRÒ
            </Text>
            <View style={[styles.roleOptions, { borderTopColor: colors.border }]}>
              {ROLES.map((role) => {
                const active = selectedUser?.role === role.value;
                return (
                  <TouchableOpacity
                    key={role.value}
                    disabled={saving}
                    style={[
                      styles.roleOption,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => changeRole(role.value)}
                  >
                    <View style={styles.roleOptionCopy}>
                      <Text style={[styles.roleOptionTitle, { color: colors.text }]}>
                        {role.label}
                      </Text>
                      <Text
                        style={[styles.roleOptionHint, { color: colors.textMuted }]}
                      >
                        {role.description}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.selectionMark,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : colors.card,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              disabled={saving}
              style={[
                styles.statusButton,
                {
                  borderColor:
                    selectedUser?.status === 'LOCKED'
                      ? colors.success
                      : colors.danger,
                },
              ]}
              onPress={toggleStatus}
            >
              {saving ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <Text
                  style={[
                    styles.statusButtonText,
                    {
                      color:
                        selectedUser?.status === 'LOCKED'
                          ? colors.success
                          : colors.danger,
                    },
                  ]}
                >
                  {selectedUser?.status === 'LOCKED'
                    ? 'Mở khóa tài khoản'
                    : 'Khóa tài khoản'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchArea: { padding: 16, borderBottomWidth: 1 },
  searchInput: { height: 46, paddingHorizontal: 13, borderWidth: 1, borderRadius: 6, fontSize: 14 },
  resultCount: { marginTop: 9, fontSize: 10, fontWeight: '700' },
  list: { paddingBottom: 40 },
  userRow: {
    minHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  selfRow: { opacity: 0.72 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: F_SERIF, fontSize: 19, fontWeight: '700' },
  userCopy: { flex: 1, marginLeft: 12 },
  userName: { fontFamily: F_SERIF, fontSize: 16, fontWeight: '700' },
  email: { marginTop: 3, fontSize: 10 },
  userMeta: { marginTop: 7, flexDirection: 'row', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 10 },
  roleText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  lockedText: { marginLeft: 8, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  manageText: { marginLeft: 8, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  errorBox: { margin: 16, marginBottom: 0, padding: 12, borderRadius: 6 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,17,17,0.38)' },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sheetEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  sheetTitle: { marginTop: 7, fontFamily: F_SERIF, fontSize: 23, fontWeight: '700' },
  sheetEmail: { marginTop: 4, fontSize: 11 },
  optionLabel: { marginTop: 22, marginBottom: 8, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  roleOptions: { borderTopWidth: 1 },
  roleOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  roleOptionCopy: { flex: 1 },
  roleOptionTitle: { fontSize: 13, fontWeight: '700' },
  roleOptionHint: { marginTop: 3, fontSize: 10 },
  selectionMark: { width: 18, height: 18, borderWidth: 2, borderRadius: 9 },
  statusButton: { height: 48, marginTop: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 6 },
  statusButtonText: { fontSize: 12, fontWeight: '800' },
});
