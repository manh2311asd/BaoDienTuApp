import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Coins,
  Info,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { apiClient } from '../../services/api/client';
import {
  isUtilityCacheFresh,
  readUtilityCache,
  utilityCacheKeys,
  writeUtilityCache,
} from '../../services/utilityCache';
import { useAppStore } from '../../store/useAppStore';
import { getPageTheme } from '../../theme/colors';
import { ExchangeRate, GoldPrice, UtilityResource } from '../../types/utilities';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;
const FINANCE_TTL = 10 * 60_000;
const FAVORITES_KEY = '@BaoDienTu:finance:favoriteCurrencies';

type Tab = 'overview' | 'forex' | 'gold' | 'stocks';
type RateColumn = 'cashBuy' | 'transferBuy' | 'sell';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'forex', label: 'Ngoại tệ' },
  { key: 'gold', label: 'Giá vàng' },
  { key: 'stocks', label: 'Chứng khoán' },
];

const RATE_COLUMNS: Array<{ key: RateColumn; label: string; shortLabel: string }> = [
  { key: 'cashBuy', label: 'Mua tiền mặt', shortLabel: 'Mua TM' },
  { key: 'transferBuy', label: 'Mua chuyển khoản', shortLabel: 'Mua CK' },
  { key: 'sell', label: 'Bán', shortLabel: 'Bán' },
];

const emptyResource = <T,>(): UtilityResource<T> => ({
  status: 'idle',
  data: null,
  source: null,
  updatedAt: null,
  error: null,
  fromCache: false,
});

const formatNumber = (value?: number | null, maximumFractionDigits = 2) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString('vi-VN', { maximumFractionDigits });
};

const formatUpdatedAt = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const ForexRow = memo(function ForexRow({
  item,
  favorite,
  onToggleFavorite,
  onSelect,
  colors,
}: {
  item: ExchangeRate;
  favorite: boolean;
  onToggleFavorite: (code: string) => void;
  onSelect: (code: string) => void;
  colors: ReturnType<typeof getPageTheme>;
}) {
  return (
    <TouchableOpacity
      style={[styles.forexRow, { borderBottomColor: colors.border }]}
      activeOpacity={0.72}
      onPress={() => onSelect(item.code)}
    >
      <TouchableOpacity accessibilityLabel={`${favorite ? 'Bỏ yêu thích' : 'Yêu thích'} ${item.code}`} style={styles.starButton} onPress={() => onToggleFavorite(item.code)}>
        <Star color={favorite ? colors.warning : colors.textMuted} fill={favorite ? colors.warning : 'transparent'} size={16} {...IC} />
      </TouchableOpacity>
      <View style={styles.currencyCell}>
        <Text style={[styles.currencyCode, { color: colors.textPrimary }]}>{item.code}</Text>
        <Text style={[styles.currencyName, { color: colors.textMuted }]} numberOfLines={1}>{item.name}</Text>
      </View>
      <Text style={[styles.rateCell, { color: colors.textPrimary }]}>{formatNumber(item.cashBuy)}</Text>
      <Text style={[styles.rateCell, { color: colors.textPrimary }]}>{formatNumber(item.transferBuy)}</Text>
      <Text style={[styles.rateCell, { color: colors.textPrimary }]}>{formatNumber(item.sell)}</Text>
    </TouchableOpacity>
  );
});

const GoldRow = memo(function GoldRow({ item, colors }: { item: GoldPrice; colors: ReturnType<typeof getPageTheme> }) {
  return (
    <View style={[styles.goldRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.goldTitleRow}>
        <View style={[styles.goldIcon, { backgroundColor: colors.primaryContainer }]}><Coins color={colors.warning} size={17} {...IC} /></View>
        <View style={styles.goldCopy}>
          <Text style={[styles.goldName, { color: colors.textPrimary }]}>{item.name}</Text>
          <Text style={[styles.goldMeta, { color: colors.textMuted }]}>{[item.brand, item.region, item.unit].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <View style={styles.goldPrices}>
        <View><Text style={[styles.priceLabel, { color: colors.textMuted }]}>Mua</Text><Text style={[styles.goldPrice, { color: colors.textPrimary }]}>{formatNumber(item.buy)}</Text></View>
        <View style={styles.priceRight}><Text style={[styles.priceLabel, { color: colors.textMuted }]}>Bán</Text><Text style={[styles.goldPrice, { color: colors.textPrimary }]}>{formatNumber(item.sell)}</Text></View>
        <View style={styles.priceRight}><Text style={[styles.priceLabel, { color: colors.textMuted }]}>Thay đổi</Text><Text style={[styles.goldPrice, { color: item.change == null ? colors.textMuted : item.change >= 0 ? colors.success : colors.error }]}>{item.change == null ? '—' : `${item.change > 0 ? '+' : ''}${formatNumber(item.change)}`}</Text></View>
      </View>
    </View>
  );
});

export default function FinanceScreen() {
  const navigation = useNavigation();
  const { themeMode } = useAppStore();
  const colors = getPageTheme('finance', themeMode);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [forex, setForex] = useState<UtilityResource<ExchangeRate[]>>(emptyResource);
  const [gold, setGold] = useState<UtilityResource<GoldPrice[]>>(emptyResource);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [amount, setAmount] = useState('100');
  const [currency, setCurrency] = useState('USD');
  const [rateColumn, setRateColumn] = useState<RateColumn>('transferBuy');
  const [goldCategory, setGoldCategory] = useState<'all' | GoldPrice['category']>('all');
  const [goldBrand, setGoldBrand] = useState('all');
  const [goldRegion, setGoldRegion] = useState('all');
  const forexFetchAt = useRef(0);
  const goldFetchAt = useRef(0);

  const loadForex = useCallback(async (force = false) => {
    const key = utilityCacheKeys.finance('forex');
    const cached = await readUtilityCache<ExchangeRate[]>(key);
    if (cached) {
      setForex({ status: isUtilityCacheFresh(cached, FINANCE_TTL) ? 'success' : 'stale', data: cached.payload.data, source: cached.payload.source, updatedAt: cached.payload.updatedAt, error: null, fromCache: true });
      if (!force && isUtilityCacheFresh(cached, FINANCE_TTL)) return;
    } else {
      setForex((current) => ({ ...current, status: 'loading', error: null }));
    }
    try {
      const response = await apiClient.getExchangeRates();
      await writeUtilityCache(key, response.data);
      forexFetchAt.current = Date.now();
      setForex({ status: 'success', data: response.data.data, source: response.data.source, updatedAt: response.data.updatedAt, error: null, fromCache: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải tỷ giá';
      setForex((current) => ({ ...current, status: current.data ? 'stale' : 'error', error: message }));
    }
  }, []);

  const loadGold = useCallback(async (force = false) => {
    const key = utilityCacheKeys.finance('gold');
    const cached = await readUtilityCache<GoldPrice[]>(key);
    if (cached) {
      setGold({ status: isUtilityCacheFresh(cached, FINANCE_TTL) ? 'success' : 'stale', data: cached.payload.data, source: cached.payload.source, updatedAt: cached.payload.updatedAt, error: null, fromCache: true });
      if (!force && isUtilityCacheFresh(cached, FINANCE_TTL)) return;
    } else {
      setGold((current) => ({ ...current, status: 'loading', error: null }));
    }
    try {
      const response = await apiClient.getGoldPrices();
      await writeUtilityCache(key, response.data);
      goldFetchAt.current = Date.now();
      setGold({ status: 'success', data: response.data.data, source: response.data.source, updatedAt: response.data.updatedAt, error: null, fromCache: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải giá vàng';
      setGold((current) => ({ ...current, status: current.data ? 'stale' : 'error', error: message }));
    }
  }, []);

  useEffect(() => {
    loadForex();
    loadGold();
    AsyncStorage.getItem(FAVORITES_KEY).then((value) => {
      if (value) setFavorites(JSON.parse(value));
    }).catch(() => undefined);
  }, [loadForex, loadGold]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (Date.now() - forexFetchAt.current > FINANCE_TTL) loadForex(true);
      if (Date.now() - goldFetchAt.current > FINANCE_TTL) loadGold(true);
    });
    return () => subscription.remove();
  }, [loadForex, loadGold]);

  const toggleFavorite = useCallback((code: string) => {
    setFavorites((current) => {
      const next = current.includes(code) ? current.filter((item) => item !== code) : [...current, code];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const filteredForex = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    return [...(forex.data || [])]
      .filter((item) => !query || item.code.toLowerCase().includes(query) || item.name.toLocaleLowerCase('vi-VN').includes(query))
      .sort((a, b) => Number(favorites.includes(b.code)) - Number(favorites.includes(a.code)));
  }, [favorites, forex.data, search]);

  const goldBrands = useMemo(() => [...new Set((gold.data || []).map((item) => item.brand).filter(Boolean) as string[])], [gold.data]);
  const goldRegions = useMemo(() => [...new Set((gold.data || []).map((item) => item.region).filter(Boolean) as string[])], [gold.data]);
  const filteredGold = useMemo(
    () => (gold.data || []).filter((item) =>
      (goldCategory === 'all' || item.category === goldCategory) &&
      (goldBrand === 'all' || item.brand === goldBrand) &&
      (goldRegion === 'all' || item.region === goldRegion)
    ),
    [gold.data, goldBrand, goldCategory, goldRegion]
  );
  const selectedRate = forex.data?.find((item) => item.code === currency);
  const currencyOptions = useMemo(() => {
    const items = forex.data || [];
    const selected = items.find((item) => item.code === currency);
    return selected ? [selected, ...items.filter((item) => item.code !== currency)] : items;
  }, [currency, forex.data]);
  const rate = selectedRate?.[rateColumn];
  const numericAmount = Number(amount.replace(',', '.'));
  const converted = rate != null && Number.isFinite(numericAmount) ? rate * numericAmount : null;

  const refreshActive = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'gold') await loadGold(true);
      else if (activeTab === 'overview') await Promise.allSettled([loadForex(true), loadGold(true)]);
      else if (activeTab === 'forex') await loadForex(true);
    } finally {
      setRefreshing(false);
    }
  };

  const sourceLine = (resource: UtilityResource<unknown>, fallback: string) =>
    resource.source ? `Nguồn: ${resource.source} · ${formatUpdatedAt(resource.updatedAt)}` : fallback;

  const commonHeader = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((item) => {
          const active = item.key === activeTab;
          return (
            <TouchableOpacity key={item.key} style={[styles.tab, { backgroundColor: active ? colors.primary : colors.cardBackground, borderColor: active ? colors.primary : colors.border }]} onPress={() => { Keyboard.dismiss(); setActiveTab(item.key); }}>
              <Text style={[styles.tabText, { color: active ? colors.onPrimary : colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </>
  );

  const renderEmpty = (message: string, onRetry?: () => void) => (
    <View style={styles.emptyState}>
      <Info color={colors.primary} size={30} strokeWidth={1.6} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Chưa có dữ liệu</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && <TouchableOpacity style={styles.retryButton} onPress={onRetry}><RefreshCw color={colors.primary} size={16} {...IC} /><Text style={[styles.retryText, { color: colors.primary }]}>Tải lại</Text></TouchableOpacity>}
    </View>
  );

  const forexHeader = (
    <>
      {commonHeader}
      <View style={[styles.bankRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text style={[styles.bankLabel, { color: colors.textMuted }]}>NGÂN HÀNG</Text>
        <Text style={[styles.bankValue, { color: colors.textPrimary }]}>Vietcombank</Text>
      </View>
      <View style={[styles.searchBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Search color={colors.textMuted} size={17} {...IC} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Tìm mã hoặc tên ngoại tệ" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.textPrimary }]} />
      </View>
      <View style={[styles.converter, { backgroundColor: colors.primaryContainer, borderColor: colors.border }]}>
        <Text style={[styles.blockEyebrow, { color: colors.primary }]}>QUY ĐỔI THEO ĐÚNG LOẠI GIAO DỊCH</Text>
        <View style={styles.converterInputs}>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" selectTextOnFocus style={[styles.amountInput, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.currencyPicker}>
            {currencyOptions.map((item) => (
              <TouchableOpacity key={item.code} style={[styles.currencyChip, { backgroundColor: currency === item.code ? colors.primary : colors.cardBackground, borderColor: colors.border }]} onPress={() => setCurrency(item.code)}>
                <Text style={[styles.currencyChipText, { color: currency === item.code ? colors.onPrimary : colors.textSecondary }]}>{item.code}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <View style={styles.rateModeRow}>
          {RATE_COLUMNS.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.rateMode, { borderColor: rateColumn === item.key ? colors.primary : colors.border }]} onPress={() => setRateColumn(item.key)}>
              <Text style={[styles.rateModeText, { color: rateColumn === item.key ? colors.primary : colors.textMuted }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.convertResult, { color: colors.textPrimary }]}>{converted == null ? 'Chưa có tỷ giá phù hợp' : `${amount || '0'} ${currency} ≈ ${formatNumber(converted, 0)} VND`}</Text>
      </View>
      <View style={[styles.centralRateNote, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.centralRateCopy}>
          <Text style={[styles.blockEyebrow, { color: colors.primary }]}>TỶ GIÁ TRUNG TÂM USD/VND</Text>
          <Text style={[styles.centralRateUnavailable, { color: colors.textSecondary }]}>Chưa tích hợp nguồn Ngân hàng Nhà nước</Text>
        </View>
        <Info color={colors.textMuted} size={18} {...IC} />
      </View>
      <Text style={[styles.sourceText, { color: colors.textMuted }]}>{sourceLine(forex, 'Chưa kết nối được nguồn tỷ giá')}</Text>
      {forex.status === 'stale' && <Text style={[styles.staleText, { color: colors.warning }]}>Đang hiển thị dữ liệu lưu gần nhất.</Text>}
      <View style={[styles.tableHeader, { backgroundColor: colors.cardBackgroundAlt, borderColor: colors.border }]}>
        <Text style={[styles.tableCurrency, { color: colors.textSecondary }]}>Ngoại tệ</Text>
        {RATE_COLUMNS.map((item) => <Text key={item.key} style={[styles.tableHeading, { color: colors.textSecondary }]}>{item.shortLabel}</Text>)}
      </View>
    </>
  );

  const goldHeader = (
    <>
      {commonHeader}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goldFilters}>
        {([['all', 'Tất cả'], ['bar', 'Vàng miếng'], ['ring', 'Vàng nhẫn'], ['other', 'Khác']] as const).map(([key, label]) => {
          const active = goldCategory === key;
          return <TouchableOpacity key={key} style={[styles.filterChip, { backgroundColor: active ? colors.primaryContainer : colors.cardBackground, borderColor: active ? colors.primary : colors.border }]} onPress={() => setGoldCategory(key)}><Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary }]}>{label}</Text></TouchableOpacity>;
        })}
      </ScrollView>
      {goldBrands.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goldFilters}>
          {['all', ...goldBrands].map((item) => <TouchableOpacity key={item} style={[styles.filterChip, { backgroundColor: goldBrand === item ? colors.primaryContainer : colors.cardBackground, borderColor: goldBrand === item ? colors.primary : colors.border }]} onPress={() => setGoldBrand(item)}><Text style={[styles.filterText, { color: goldBrand === item ? colors.primary : colors.textSecondary }]}>{item === 'all' ? 'Mọi thương hiệu' : item}</Text></TouchableOpacity>)}
        </ScrollView>
      )}
      {goldRegions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.goldFilters}>
          {['all', ...goldRegions].map((item) => <TouchableOpacity key={item} style={[styles.filterChip, { backgroundColor: goldRegion === item ? colors.primaryContainer : colors.cardBackground, borderColor: goldRegion === item ? colors.primary : colors.border }]} onPress={() => setGoldRegion(item)}><Text style={[styles.filterText, { color: goldRegion === item ? colors.primary : colors.textSecondary }]}>{item === 'all' ? 'Mọi khu vực' : item}</Text></TouchableOpacity>)}
        </ScrollView>
      )}
      <Text style={[styles.sourceText, { color: colors.textMuted }]}>{sourceLine(gold, 'Nguồn giá vàng chưa được cấu hình')}</Text>
      {gold.status === 'stale' && <Text style={[styles.staleText, { color: colors.warning }]}>Đang hiển thị dữ liệu lưu gần nhất.</Text>}
    </>
  );

  const overviewData = [
    { key: 'forex', title: 'Tỷ giá Vietcombank', value: selectedRate?.transferBuy ? `USD ${formatNumber(selectedRate.transferBuy)} VND` : null, resource: forex },
    { key: 'gold', title: 'Giá vàng', value: gold.data?.[0] ? `${gold.data[0].name} · bán ${formatNumber(gold.data[0].sell)}` : null, resource: gold },
    { key: 'stocks', title: 'Chứng khoán', value: null, resource: emptyResource<never>() },
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.pageBackground }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Quay lại" style={styles.backButton} onPress={() => navigation.goBack()}><ArrowLeft color={colors.textPrimary} size={21} {...IC} /></TouchableOpacity>
        <View style={styles.headerCopy}><Text style={[styles.title, { color: colors.textPrimary }]}>Tài chính</Text><Text style={[styles.subtitle, { color: colors.textSecondary }]}>Tỷ giá và thị trường từ nguồn công bố</Text></View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}><TrendingUp color={colors.primary} size={19} {...IC} /></View>
      </View>

      {activeTab === 'forex' && (
        <FlatList
          data={filteredForex}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={forexHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshActive} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty(forex.error || 'Không nhận được dữ liệu tỷ giá từ Vietcombank.', () => loadForex(true))}
          renderItem={({ item }) => <ForexRow item={item} favorite={favorites.includes(item.code)} onToggleFavorite={toggleFavorite} onSelect={setCurrency} colors={colors} />}
        />
      )}

      {activeTab === 'gold' && (
        <FlatList
          data={filteredGold}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={goldHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshActive} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty(gold.error || 'Ứng dụng chưa được cấu hình nhà cung cấp giá vàng thật.', () => loadGold(true))}
          renderItem={({ item }) => <GoldRow item={item} colors={colors} />}
        />
      )}

      {activeTab === 'stocks' && (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshActive} tintColor={colors.primary} />} contentContainerStyle={styles.listContent}>
          {commonHeader}
          {renderEmpty('Chưa tích hợp nguồn dữ liệu chứng khoán được cấp phép. Ứng dụng không hiển thị chỉ số hoặc mã mẫu.')}
        </ScrollView>
      )}

      {activeTab === 'overview' && (
        <FlatList
          data={overviewData}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={<>{commonHeader}<Text style={[styles.overviewTitle, { color: colors.textPrimary }]}>Thị trường hôm nay</Text><Text style={[styles.overviewIntro, { color: colors.textSecondary }]}>Mỗi khối dữ liệu được tải và báo lỗi độc lập.</Text></>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshActive} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={[styles.overviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.overviewCardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
              {item.key === 'forex' && selectedRate ? (
                <View style={styles.overviewRateRow}>
                  {RATE_COLUMNS.map((column) => <View key={column.key} style={styles.overviewRateCell}><Text style={[styles.priceLabel, { color: colors.textMuted }]}>{column.shortLabel}</Text><Text style={[styles.overviewRateValue, { color: colors.primary }]}>{formatNumber(selectedRate[column.key])}</Text></View>)}
                </View>
              ) : (
                <Text style={[styles.overviewValue, { color: item.value ? colors.primary : colors.textMuted }]}>{item.value || 'Chưa có nguồn dữ liệu thật'}</Text>
              )}
              {item.resource.source && <Text style={[styles.overviewSource, { color: colors.textMuted }]}>{item.resource.source} · {formatUpdatedAt(item.resource.updatedAt)}</Text>}
              {item.resource.error && <Text style={[styles.overviewError, { color: colors.error }]}>{item.resource.error}</Text>}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenHeader: { minHeight: 72, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  backButton: { width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  title: { fontFamily: F_SERIF, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  subtitle: { marginTop: 1, fontSize: 11.5 },
  headerIcon: { width: 38, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 36 },
  tabs: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 10, gap: 7 },
  tab: { minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  bankRow: { minHeight: 48, marginHorizontal: 15, marginTop: 4, paddingHorizontal: 13, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  bankValue: { fontSize: 12.5, fontWeight: '700' },
  searchBox: { minHeight: 46, marginHorizontal: 15, marginVertical: 4, paddingHorizontal: 12, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, height: 44, marginLeft: 8, paddingVertical: 0, fontSize: 13 },
  converter: { marginHorizontal: 15, marginTop: 10, padding: 13, borderWidth: 1, borderRadius: 10 },
  blockEyebrow: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.45 },
  converterInputs: { marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  amountInput: { width: 82, height: 40, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, fontSize: 14, fontVariant: ['tabular-nums'] },
  currencyPicker: { paddingLeft: 7, gap: 6 },
  currencyChip: { minWidth: 55, height: 40, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  currencyChipText: { fontSize: 11, fontWeight: '800' },
  rateModeRow: { marginTop: 9, flexDirection: 'row', gap: 6 },
  rateMode: { flex: 1, minHeight: 37, padding: 5, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  rateModeText: { textAlign: 'center', fontSize: 9.5, fontWeight: '700' },
  convertResult: { marginTop: 12, fontFamily: F_SERIF, fontSize: 20, fontWeight: '700' },
  centralRateNote: { minHeight: 62, marginHorizontal: 15, marginTop: 10, paddingHorizontal: 13, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center' },
  centralRateCopy: { flex: 1 },
  centralRateUnavailable: { marginTop: 4, fontSize: 10.5 },
  sourceText: { marginHorizontal: 15, marginTop: 12, fontSize: 10.5, lineHeight: 15 },
  staleText: { marginHorizontal: 15, marginTop: 4, fontSize: 10.5 },
  tableHeader: { minHeight: 42, marginTop: 10, marginHorizontal: 15, paddingHorizontal: 7, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center' },
  tableCurrency: { width: 118, paddingLeft: 34, fontSize: 9, fontWeight: '800' },
  tableHeading: { flex: 1, textAlign: 'right', fontSize: 8.5, fontWeight: '800' },
  forexRow: { minHeight: 58, marginHorizontal: 15, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  starButton: { width: 34, height: 48, alignItems: 'center', justifyContent: 'center' },
  currencyCell: { width: 84 },
  currencyCode: { fontSize: 12.5, fontWeight: '800' },
  currencyName: { marginTop: 2, fontSize: 9 },
  rateCell: { flex: 1, textAlign: 'right', fontSize: 10.5, fontVariant: ['tabular-nums'] },
  goldFilters: { paddingHorizontal: 15, paddingVertical: 7, gap: 7 },
  filterChip: { minHeight: 35, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 11.5, fontWeight: '700' },
  goldRow: { marginHorizontal: 15, marginTop: 10, padding: 13, borderWidth: 1, borderRadius: 10 },
  goldTitleRow: { flexDirection: 'row', alignItems: 'center' },
  goldIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goldCopy: { flex: 1, marginLeft: 9 },
  goldName: { fontFamily: F_SERIF, fontSize: 15, fontWeight: '700' },
  goldMeta: { marginTop: 2, fontSize: 9.5 },
  goldPrices: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between' },
  priceRight: { alignItems: 'flex-end' },
  priceLabel: { marginBottom: 3, fontSize: 9.5, textTransform: 'uppercase' },
  goldPrice: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  overviewTitle: { marginHorizontal: 15, marginTop: 8, fontFamily: F_SERIF, fontSize: 21, fontWeight: '700' },
  overviewIntro: { marginHorizontal: 15, marginTop: 3, marginBottom: 3, fontSize: 11.5 },
  overviewCard: { marginHorizontal: 15, marginTop: 10, padding: 14, borderWidth: 1, borderRadius: 10 },
  overviewCardTitle: { fontFamily: F_SERIF, fontSize: 15, fontWeight: '700' },
  overviewValue: { marginTop: 7, fontSize: 14, fontWeight: '700' },
  overviewRateRow: { marginTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  overviewRateCell: { flex: 1 },
  overviewRateValue: { marginTop: 3, fontSize: 12.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  overviewSource: { marginTop: 7, fontSize: 9.5 },
  overviewError: { marginTop: 7, fontSize: 10.5, lineHeight: 15 },
  emptyState: { minHeight: 245, paddingHorizontal: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, fontFamily: F_SERIF, fontSize: 18, fontWeight: '700' },
  emptyText: { marginTop: 6, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  retryButton: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  retryText: { fontSize: 12, fontWeight: '700' },
});
