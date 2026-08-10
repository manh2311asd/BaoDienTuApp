import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Crown,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { apiClient } from '../../services/api/client';
import { localDB } from '../../services/localDB';
import { useAppStore } from '../../store/useAppStore';
import { DemoCardPayment, VipPackage } from '../../types/content';
import { appTheme } from '../../theme/colors';
import {
  DEMO_VISA,
  DemoVisaForm,
  emptyDemoVisaForm,
  formatCardNumber,
  formatExpiry,
  validateDemoVisa,
} from '../../utils/demoVisa';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2.2 } as const;

const getFinalPrice = (pkg: VipPackage) =>
  pkg.price * (1 - (pkg.discountPercent || 0) / 100);

export default function VipPackagesScreen({ navigation }: any) {
  const { getColors, setUser, themeMode, user } = useAppStore();
  const colors = getColors();
  const shell = appTheme[themeMode];
  const [packages, setPackages] = useState<VipPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [cardForm, setCardForm] = useState<DemoVisaForm>(emptyDemoVisaForm);
  const [cardError, setCardError] = useState('');
  const [pendingDemoPayment, setPendingDemoPayment] =
    useState<DemoCardPayment | null>(null);

  const loadPackages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.getVipPackages();
      const sortedPackages = [...response.data].sort(
        (left, right) => left.durationDays - right.durationDays,
      );
      setPackages(sortedPackages);
      setSelectedPackageId(current => {
        if (current && sortedPackages.some(pkg => pkg.id === current)) {
          return current;
        }
        return (
          sortedPackages.find(pkg => pkg.durationDays === 60)?.id ??
          sortedPackages[0]?.id ??
          null
        );
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải danh sách gói VIP.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const selectedPackage = useMemo(
    () => packages.find(pkg => pkg.id === selectedPackageId) ?? null,
    [packages, selectedPackageId],
  );

  const requestLogin = () => {
    Alert.alert(
      'Cần đăng nhập',
      'Bạn cần đăng nhập để đăng ký gói thành viên.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Đăng nhập',
          onPress: () =>
            navigation.navigate('MainTabs', { screen: 'ProfileTab' }),
        },
      ],
    );
  };

  const buySelectedPackage = async () => {
    if (!user) {
      requestLogin();
      return;
    }
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
        'Trạng thái VIP sẽ được cập nhật sau khi giao dịch được hệ thống xác nhận.',
      );
    } catch (paymentError) {
      Alert.alert(
        'Không thể mở thanh toán',
        paymentError instanceof Error
          ? paymentError.message
          : 'Vui lòng thử lại.',
      );
    } finally {
      setPaying(false);
    }
  };

  const openVisaCheckout = () => {
    if (!user) {
      requestLogin();
      return;
    }
    if (!selectedPackage) {
      return;
    }
    setCardForm(emptyDemoVisaForm());
    setCardError('');
    setPendingDemoPayment(null);
    setCheckoutVisible(true);
  };

  const closeVisaCheckout = () => {
    if (paying) {
      return;
    }
    setCheckoutVisible(false);
    setCardError('');
    setPendingDemoPayment(null);
  };

  const fillSampleVisa = () => {
    setCardForm({ ...DEMO_VISA });
    setCardError('');
  };

  const updateCardField = (field: keyof DemoVisaForm, value: string) => {
    setCardForm(current => ({ ...current, [field]: value }));
    setCardError('');
  };

  const confirmDemoVisa = async () => {
    if (!selectedPackage || !user) {
      return;
    }

    const validationError = validateDemoVisa(cardForm);
    if (validationError) {
      setCardError(validationError);
      return;
    }

    setPaying(true);
    setCardError('');
    try {
      let pending = pendingDemoPayment;
      if (!pending) {
        const created = await apiClient.createDemoCardPayment(
          selectedPackage.id,
        );
        pending = created.data;
        setPendingDemoPayment(pending);
      }

      const confirmed = await apiClient.confirmDemoCardPayment(
        pending.transactionId,
        pending.paymentCode,
      );
      if (
        confirmed.data.status !== 'SUCCESS' ||
        !confirmed.data.vipExpiryDate
      ) {
        throw new Error(
          'Hệ thống chưa xác nhận được quyền VIP. Vui lòng thử lại.',
        );
      }

      const updatedUser = {
        ...user,
        vipExpiryDate: confirmed.data.vipExpiryDate,
      };
      setUser(updatedUser);
      await localDB.saveUserSession(updatedUser);

      setCheckoutVisible(false);
      setPendingDemoPayment(null);
      setCardForm(emptyDemoVisaForm());
      Alert.alert(
        'Thanh toán thử nghiệm thành công',
        `Gói ${selectedPackage.durationDays} ngày đã được kích hoạt. Bạn có thể đọc bài VIP ngay bây giờ.`,
        [{ text: 'Hoàn tất', onPress: () => navigation.goBack() }],
      );
    } catch (paymentError) {
      setCardError(
        paymentError instanceof Error
          ? paymentError.message
          : 'Không thể xác nhận giao dịch.',
      );
    } finally {
      setPaying(false);
    }
  };

  const selectedPrice = selectedPackage
    ? getFinalPrice(selectedPackage).toLocaleString('vi-VN')
    : '';
  const selectedSurface = shell.appYellowContainer;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: shell.appHeader,
            borderBottomColor: shell.appBorder,
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={shell.appHeaderText} size={22} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appHeaderText }]}>
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
            'Quyền đọc được cập nhật sau khi backend xác nhận',
          ].map(benefit => (
            <View key={benefit} style={styles.benefitRow}>
              <View
                style={[
                  styles.checkBox,
                  { backgroundColor: shell.appSecondaryContainer },
                ]}
              >
                <Check color={shell.appSuccess} size={14} {...IC} />
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
          packages.map(pkg => {
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
                        style={[
                          styles.radioDot,
                          { backgroundColor: colors.vip },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.packageCopy}>
                    <View style={styles.packageTitleRow}>
                      <Text
                        style={[styles.packageName, { color: colors.text }]}
                      >
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
                      Đọc các bài báo VIP không giới hạn trong{' '}
                      {pkg.durationDays} ngày.
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
          Visa mẫu chỉ dành cho bản demo, không dùng thẻ thật
        </Text>
        <TouchableOpacity
          disabled={!selectedPackage || paying}
          style={[
            styles.payButton,
            { backgroundColor: colors.text },
            (!selectedPackage || paying) && styles.disabledButton,
          ]}
          onPress={openVisaCheckout}
        >
          {paying ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.payButtonText, { color: colors.background }]}>
              {selectedPackage
                ? `Thanh toán Visa thử nghiệm • ${selectedPrice} ₫`
                : 'Chọn một gói để tiếp tục'}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!selectedPackage || paying}
          style={styles.vnpayButton}
          onPress={buySelectedPackage}
        >
          <Text style={[styles.vnpayButtonText, { color: colors.primary }]}>
            Hoặc thanh toán qua VNPay
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={checkoutVisible}
        onRequestClose={closeVisaCheckout}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalOverlay, { backgroundColor: shell.appOverlay }]}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[styles.checkoutSheet, { backgroundColor: colors.card }]}
            >
              <View style={styles.checkoutHeader}>
                <View>
                  <Text
                    style={[styles.checkoutEyebrow, { color: colors.primary }]}
                  >
                    THANH TOÁN THỬ NGHIỆM
                  </Text>
                  <Text style={[styles.checkoutTitle, { color: colors.text }]}>
                    Thêm thẻ Visa
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Đóng thanh toán"
                  disabled={paying}
                  style={[styles.closeButton, { borderColor: colors.border }]}
                  onPress={closeVisaCheckout}
                >
                  <X color={colors.text} size={20} {...IC} />
                </TouchableOpacity>
              </View>

              <View style={styles.visaCard}>
                <View style={styles.visaCardTop}>
                  <View style={styles.cardChip} />
                  <Text style={styles.visaWordmark}>VISA</Text>
                </View>
                <Text style={styles.cardPreviewNumber}>
                  {cardForm.number || '•••• •••• •••• ••••'}
                </Text>
                <View style={styles.cardPreviewBottom}>
                  <View>
                    <Text style={styles.cardPreviewLabel}>CHỦ THẺ</Text>
                    <Text style={styles.cardPreviewValue}>
                      {cardForm.holder || 'NGUYEN VAN LONG'}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cardPreviewLabel}>HẾT HẠN</Text>
                    <Text style={styles.cardPreviewValue}>
                      {cardForm.expiry || 'MM/YY'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.sampleButton,
                  { backgroundColor: shell.appPrimaryContainer },
                ]}
                onPress={fillSampleVisa}
              >
                <CreditCard color={colors.primary} size={17} {...IC} />
                <Text
                  style={[styles.sampleButtonText, { color: colors.primary }]}
                >
                  Điền thẻ Visa mẫu
                </Text>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                SỐ THẺ
              </Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={19}
                placeholder={DEMO_VISA.number}
                placeholderTextColor={shell.appTextMuted}
                style={[
                  styles.cardInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={cardForm.number}
                onChangeText={value =>
                  updateCardField('number', formatCardNumber(value))
                }
              />

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                TÊN CHỦ THẺ
              </Text>
              <TextInput
                autoCapitalize="characters"
                maxLength={40}
                placeholder={DEMO_VISA.holder}
                placeholderTextColor={shell.appTextMuted}
                style={[
                  styles.cardInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                value={cardForm.holder}
                onChangeText={value =>
                  updateCardField('holder', value.toUpperCase())
                }
              />

              <View style={styles.cardInputRow}>
                <View style={styles.halfInput}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textMuted }]}
                  >
                    HẾT HẠN
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder={DEMO_VISA.expiry}
                    placeholderTextColor={shell.appTextMuted}
                    style={[
                      styles.cardInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={cardForm.expiry}
                    onChangeText={value =>
                      updateCardField('expiry', formatExpiry(value))
                    }
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textMuted }]}
                  >
                    CVV
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={3}
                    secureTextEntry
                    placeholder={DEMO_VISA.cvv}
                    placeholderTextColor={shell.appTextMuted}
                    style={[
                      styles.cardInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={cardForm.cvv}
                    onChangeText={value =>
                      updateCardField('cvv', value.replace(/\D/g, ''))
                    }
                  />
                </View>
              </View>

              {cardError ? (
                <Text style={[styles.cardError, { color: colors.danger }]}>
                  {cardError}
                </Text>
              ) : null}

              <View
                style={[
                  styles.demoNotice,
                  { backgroundColor: shell.appSecondaryContainer },
                ]}
              >
                <ShieldCheck color={shell.appSuccess} size={18} {...IC} />
                <Text
                  style={[styles.demoNoticeText, { color: colors.textMuted }]}
                >
                  NewsDaily không gửi hoặc lưu số thẻ, ngày hết hạn và CVV. Chỉ
                  mã giao dịch thử nghiệm được gửi tới backend.
                </Text>
              </View>

              <TouchableOpacity
                disabled={paying}
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.text },
                  paying && styles.disabledButton,
                ]}
                onPress={confirmDemoVisa}
              >
                {paying ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text
                    style={[
                      styles.confirmButtonText,
                      { color: colors.background },
                    ]}
                  >
                    Xác nhận và kích hoạt VIP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: appTheme.light.appYellowContainer,
    borderRadius: 999,
  },
  recommendedText: {
    color: appTheme.light.appWarning,
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
    borderTopColor: appTheme.light.appBorder,
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
    backgroundColor: appTheme.light.appPrimaryContainer,
    borderRadius: 999,
  },
  discountText: {
    color: appTheme.light.appError,
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
  vnpayButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vnpayButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  checkoutSheet: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  checkoutEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  checkoutTitle: {
    marginTop: 4,
    fontFamily: F_SERIF,
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 19,
  },
  visaCard: {
    height: 176,
    marginTop: 16,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: '#183B68',
    borderRadius: 18,
    shadowColor: '#0A203A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
  visaCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardChip: {
    width: 36,
    height: 27,
    backgroundColor: '#E9C977',
    borderRadius: 6,
  },
  visaWordmark: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  cardPreviewNumber: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardPreviewLabel: {
    marginBottom: 3,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  cardPreviewValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sampleButton: {
    height: 42,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  sampleButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  cardInput: {
    height: 46,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 9,
    fontSize: 13,
    fontWeight: '600',
  },
  cardInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  cardError: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  demoNotice: {
    marginTop: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 9,
  },
  demoNoticeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 10,
    lineHeight: 15,
  },
  confirmButton: {
    height: 49,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
