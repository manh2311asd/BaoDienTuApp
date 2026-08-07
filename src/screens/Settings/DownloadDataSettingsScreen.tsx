import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Database,
  Download,
  Image as ImageIcon,
  Trash2,
  Wifi,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';
import { localDB, StorageUsage } from '../../services/localDB';
import {
  SettingsGroup,
  SettingsRow,
  SettingsScreenLayout,
} from '../../components/Settings/SettingsScreenLayout';
import AppActionSheet from '../../components/Feedback/AppActionSheet';
import { useToast } from '../../components/Toast/ToastContext';
import { formatStorageBytes } from './readingSettingsUi';

type Props = NativeStackScreenProps<RootStackParamList, 'DownloadDataSettings'>;

const EMPTY_USAGE: StorageUsage = {
  offlineBytes: 0,
  imageBytes: 0,
  cacheBytes: 0,
  totalBytes: 0,
};

export default function DownloadDataSettingsScreen({ navigation }: Props) {
  const {
    offlineIds,
    setShowImages,
    setWifiOnlyDownloads,
    showImages,
    themeMode,
    wifiOnlyDownloads,
  } = useAppStore();
  const shell = appTheme[themeMode];
  const { showToast } = useToast();
  const [usage, setUsage] = useState<StorageUsage>(EMPTY_USAGE);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [confirmAction, setConfirmAction] = useState<'cache' | 'downloads' | null>(null);
  const [working, setWorking] = useState(false);

  const loadUsage = useCallback(async () => {
    setLoadingUsage(true);
    try {
      setUsage(await localDB.getStorageUsage());
    } catch {
      setUsage(EMPTY_USAGE);
    } finally {
      setLoadingUsage(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage, offlineIds.length]);

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    setWorking(true);
    try {
      if (confirmAction === 'cache') {
        await localDB.clearTransientCache();
        showToast('Đã dọn dữ liệu tạm');
      } else {
        const succeeded = await localDB.deleteAllOfflineArticles();
        if (!succeeded) throw new Error('delete-downloads-failed');
        showToast('Đã xóa tất cả bản tải xuống');
      }
      setConfirmAction(null);
      await loadUsage();
    } catch {
      showToast('Chưa thể dọn dữ liệu trên thiết bị');
    } finally {
      setWorking(false);
    }
  };

  const switchColors = {
    false: shell.appBorder,
    true: shell.appPrimary,
  };

  return (
    <>
      <SettingsScreenLayout
        icon={<Database color={shell.appPrimary} size={21} strokeWidth={2} />}
        navigation={navigation}
        subtitle="Kiểm soát tải bài và dung lượng trên thiết bị"
        testID="download-data-settings-screen"
        title="Tải xuống và dữ liệu"
      >
        <SettingsGroup eyebrow="DỮ LIỆU KHI ĐỌC">
          <SettingsRow
            control={
              <Switch
                accessibilityLabel="Hiển thị ảnh bài viết"
                accessibilityRole="switch"
                accessibilityState={{ checked: showImages }}
                onValueChange={setShowImages}
                thumbColor={shell.appSurface}
                trackColor={switchColors}
                value={showImages}
              />
            }
            description="Tắt để tải trang nhanh và dùng ít dữ liệu hơn"
            icon={<ImageIcon color={shell.appBlueIcon} size={18} strokeWidth={2} />}
            last
            testID="show-article-images-setting"
            title="Ảnh trong bài viết"
          />
        </SettingsGroup>

        <SettingsGroup eyebrow="TẢI BÀI OFFLINE">
          <SettingsRow
            control={
              <Switch
                accessibilityLabel="Chỉ tải bài khi dùng Wi-Fi"
                accessibilityRole="switch"
                accessibilityState={{ checked: wifiOnlyDownloads }}
                onValueChange={setWifiOnlyDownloads}
                thumbColor={shell.appSurface}
                trackColor={switchColors}
                value={wifiOnlyDownloads}
              />
            }
            description="Ngăn tải mới khi thiết bị đang dùng dữ liệu di động"
            icon={<Wifi color={shell.appSageIcon} size={18} strokeWidth={2} />}
            testID="wifi-only-downloads-setting"
            title="Chỉ tải qua Wi-Fi"
          />
          <SettingsRow
            accessibilityLabel={`Mở ${offlineIds.length} bài đã tải xuống`}
            description={`${offlineIds.length} bài đang có trên thiết bị`}
            icon={<Download color={shell.appSageIcon} size={18} strokeWidth={2} />}
            last
            onPress={() =>
              navigation.navigate('MainTabs', {
                screen: 'LibraryTab',
                params: { initialSection: 'downloaded' },
              })
            }
            testID="open-downloaded-articles"
            title="Bài viết đã tải"
          />
        </SettingsGroup>

        <SettingsGroup eyebrow="DUNG LƯỢNG TRÊN THIẾT BỊ">
          {loadingUsage ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={shell.appPrimary} size="small" />
              <Text style={[styles.loadingText, { color: shell.appTextSecondary }]}>Đang đo dung lượng…</Text>
            </View>
          ) : (
            <>
              <SettingsRow title="Bài đọc offline" value={formatStorageBytes(usage.offlineBytes)} />
              <SettingsRow
                description="Ứng dụng chưa tạo tệp ảnh riêng"
                title="Ảnh đã lưu"
                value={formatStorageBytes(usage.imageBytes)}
              />
              <SettingsRow title="Dữ liệu tạm" value={formatStorageBytes(usage.cacheBytes)} />
              <SettingsRow last title="Tổng được quản lý" value={formatStorageBytes(usage.totalBytes)} />
            </>
          )}
        </SettingsGroup>

        <SettingsGroup eyebrow="DỌN DỮ LIỆU">
          <SettingsRow
            description="Giữ đăng nhập, cài đặt, bài đã lưu và bài offline"
            icon={<Trash2 color={shell.appPrimary} size={18} strokeWidth={2} />}
            onPress={() => setConfirmAction('cache')}
            testID="clear-transient-cache"
            title="Xóa dữ liệu tạm"
          />
          <SettingsRow
            destructive
            description="Xóa toàn bộ bài đã tải khỏi thiết bị"
            icon={<Trash2 color={shell.appError} size={18} strokeWidth={2} />}
            last
            onPress={() => setConfirmAction('downloads')}
            testID="delete-all-downloads"
            title="Xóa tất cả bản tải xuống"
          />
        </SettingsGroup>
      </SettingsScreenLayout>

      <AppActionSheet
        description={
          confirmAction === 'downloads'
            ? `Bạn sắp xóa ${offlineIds.length} bài offline. Bài đã lưu và tài khoản không bị ảnh hưởng.`
            : 'Dữ liệu danh sách tin và tiện ích đã lưu tạm sẽ được dọn. Phiên đăng nhập, cài đặt, bài đã lưu và bài offline vẫn được giữ nguyên.'
        }
        eyebrow={confirmAction === 'downloads' ? 'BẢN TẢI XUỐNG' : 'BỘ NHỚ ĐỆM'}
        loading={working}
        onClose={() => setConfirmAction(null)}
        onPrimary={runConfirmedAction}
        primaryLabel={confirmAction === 'downloads' ? 'Xóa tất cả' : 'Dọn dữ liệu tạm'}
        secondaryLabel="Hủy"
        title={confirmAction === 'downloads' ? 'Xóa tất cả bài offline?' : 'Dọn dữ liệu tạm?'}
        tone={confirmAction === 'downloads' ? 'danger' : 'default'}
        visible={confirmAction !== null}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingRow: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: { marginLeft: 10, fontSize: 12, lineHeight: 17 },
});
