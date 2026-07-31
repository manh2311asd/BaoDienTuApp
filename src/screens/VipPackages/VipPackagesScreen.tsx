import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Crown } from 'lucide-react-native';
import { apiClient } from '../../services/api/client';
import { useAppStore } from '../../store/useAppStore';
import { VipPackage } from '../../types/content';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2.2 } as const;

const getFinalPrice = (pkg: VipPackage) =>
  pkg.price * (1 - (pkg.discountPercent || 0) / 100);

export default function VipPackagesScreen({ navigation }: any) {
  const { getColors, themeMode } = useAppStore();
  const colors = getColors();
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.getVipPackages();
      const sortedPackages = [...response.data].sort(
        (left, right) => left.durationDays - right.durationDays
      );
      setPackages(sortedPackages);
      setSelectedPackageId((current) => {
        if (current && sortedPackages.some((pkg) => pkg.id === current)) {
          return current;
        }
        return (
          sortedPackages.find((pkg) => pkg.durationDays === 60)?.id ??
          sortedPackages[0]?.id ??
          null
        );
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải danh sách gói VIP.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [packages, selectedPackageId]
  );

  const buySelectedPackage = async () => {
    if (!selectedPackage) {
      return;
    }

    setPaying(true);
    try {
      const response = await apiClient.createTransaction(selectedPackage.id);
      const paymentUrl = response.data.paymentUrl?.trim();
      if (!paymentUrl || !/^https?:\/\//i.test(paymentUrl)) {
        throw new Error('Cổng thanh toán trả về địa chỉ không hợp lệ.');
      }

      const canOpenPayment = await Linking.canOpenURL(paymentUrl);
      if (!canOpenPayment) {
        throw new Error('Thiết bị không thể mở cổng thanh toán.');
      }

      await Linking.openURL(paymentUrl);
      Alert.alert(
        'Đã mở cổng thanh toán',
        'Trạng thái VIP sẽ được cập nhật sau khi giao dịch được hệ thống xác nhận.'
      );
    } catch (paymentError) {
      Alert.alert(
        'Không thể mở thanh toán',
        paymentError instanceof Error ? paymentError.message : 'Vui lòng thử lại.'
      );
    } finally {
      setPaying(false);
    }
  };

  const selectedPrice = selectedPackage
    ? getFinalPrice(selectedPackage).toLocaleString('vi-VN')
    : '';
  const selectedSurface = themeMode === 'dark' ? '#302B1E' : '#FBF3DB';

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={colors.text} size={22} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Gói thành viên
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.crownBox, { backgroundColor: selectedSurface }]}>
          <Crown color={colors.vip} size={22} {...IC} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          Đọc không giới hạn
        </Text>
        <Text style={[styles.intro, { color: colors.textMuted }]}>
          Chọn thời hạn phù hợp để đọc trọn vẹn bài VIP và sử dụng các tiện ích
          dành cho thành viên.
        </Text>

        <View
          style={[
            styles.benefitCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {[
            'Đọc toàn bộ nội dung bài viết VIP',
            'Sử dụng tính năng tóm tắt bằng AI',
            'Quyền đọc được cập nhật sau khi VNPay xác nhận',
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={[styles.checkBox, { backgroundColor: '#EDF3EC' }]}>
                <Check color="#346538" size={14} {...IC} />
              </View>
              <Text style={[styles.benefitText, { color: colors.text }]}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          CHỌN THỜI HẠN
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : error ? (
          <View style={[styles.errorCard, { borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {error}
            </Text>
            <TouchableOpacity onPress={loadPackages}>
              <Text style={[styles.retryText, { color: colors.primary }]}>
                Tải lại
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          packages.map((pkg) => {
            const selected = pkg.id === selectedPackageId;
            const finalPrice = getFinalPrice(pkg);
            const recommended = pkg.durationDays === 60;

            return (
              <TouchableOpacity
                key={pkg.id}
                activeOpacity={0.82}
                style={[
                  styles.packageCard,
                  {
                    backgroundColor: selected ? selectedSurface : colors.card,
                    borderColor: selected ? colors.vip : colors.border,
                  },
                ]}
                onPress={() => setSelectedPackageId(pkg.id)}
              >
                <View style={styles.packageTop}>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: selected ? colors.vip : colors.textMuted,
                      },
                    ]}
                  >
                    {selected && (
                      <View
                        style={[styles.radioDot, { backgroundColor: colors.vip }]}
                      />
                    )}
                  </View>
                  <View style={styles.packageCopy}>
                    <View style={styles.packageTitleRow}>
                      <Text style={[styles.packageName, { color: colors.text }]}>
                        Gói {pkg.durationDays} ngày
                      </Text>
                      {recommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>ĐỀ XUẤT</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.packageDescription,
                        { color: colors.textMuted },
                      ]}
                    >
                      Đọc các bài báo VIP không giới hạn trong {pkg.durationDays}{' '}
                      ngày.
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <View style={styles.discountRow}>
                    {pkg.discountPercent > 0 && (
                      <>
                        <Text
                          style={[
                            styles.originalPrice,
                            { color: colors.textMuted },
                          ]}
                        >
                          {pkg.price.toLocaleString('vi-VN')} ₫
                        </Text>
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            −{pkg.discountPercent}%
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <Text style={[styles.packagePrice, { color: colors.text }]}>
                    {finalPrice.toLocaleString('vi-VN')} ₫
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.card, borderTopColor: colors.border },
        ]}
      >
        <Text style={[styles.paymentNote, { color: colors.textMuted }]}>
          Thanh toán an toàn qua VNPay
        </Text>
        <TouchableOpacity
          disabled={!selectedPackage || paying}
          style={[
            styles.payButton,
            { backgroundColor: colors.text },
            (!selectedPackage || paying) && styles.disabledButton,
          ]}
          onPress={buySelectedPackage}
        >
          {paying ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.payButtonText, { color: colors.background }]}>
              {selectedPackage
                ? `Tiếp tục • ${selectedPrice} ₫`
                : 'Chọn một gói để tiếp tục'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  crownBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  title: {
    marginTop: 14,
    fontFamily: F_SERIF,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  intro: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 20,
  },
  benefitCard: {
    marginTop: 20,
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
  },
  benefitRow: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  benefitText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionLabel: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  loader: {
    marginVertical: 36,
  },
  errorCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
  },
  retryText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
  },
  packageCard: {
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  packageTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 20,
    height: 20,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  packageCopy: {
    flex: 1,
    marginLeft: 11,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packageName: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
  },
  recommendedBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#FBF3DB',
    borderRadius: 999,
  },
  recommendedText: {
    color: '#956400',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  packageDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  priceRow: {
    marginTop: 12,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(120,119,116,0.24)',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#FDEBEC',
    borderRadius: 999,
  },
  discountText: {
    color: '#9F2F2D',
    fontSize: 9,
    fontWeight: '800',
  },
  packagePrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
  },
  paymentNote: {
    marginBottom: 7,
    textAlign: 'center',
    fontSize: 10,
  },
  payButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  disabledButton: {
    opacity: 0.55,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
