import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ticket,
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
import {
  LotteryDraw,
  LotteryPrize,
  LotteryStatus,
  UtilityResource,
} from '../../types/utilities';
import { formatIsoDate, isFutureIsoDate, shiftIsoDate } from '../Utilities/utilityUi';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;
const LOTTERY_TTL = 5 * 60_000;

type Region = LotteryDraw['region'];

const REGIONS: Array<{ key: Region; label: string }> = [
  { key: 'north', label: 'Miền Bắc' },
  { key: 'central', label: 'Miền Trung' },
  { key: 'south', label: 'Miền Nam' },
  { key: 'vietlott', label: 'Vietlott' },
];

const PROVINCES: Record<'central' | 'south', string[]> = {
  central: ['Đà Nẵng', 'Khánh Hòa', 'Bình Định', 'Quảng Nam', 'Quảng Ngãi'],
  south: ['TP.HCM', 'Đồng Nai', 'Cần Thơ', 'An Giang', 'Bình Dương'],
};

const VIETLOTT_TYPES = ['Mega 6/45', 'Power 6/55', 'Max 3D', 'Keno'];

const emptyResource = (): UtilityResource<LotteryDraw> => ({
  status: 'idle',
  data: null,
  source: null,
  updatedAt: null,
  error: null,
  fromCache: false,
});

const statusText: Record<LotteryStatus, string> = {
  SCHEDULED: 'Chờ quay thưởng',
  DRAWING: 'Đang quay',
  PARTIAL: 'Đang cập nhật',
  FINAL: 'Đã có kết quả',
  POSTPONED: 'Tạm hoãn',
  UNAVAILABLE: 'Chưa có dữ liệu',
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

const PrizeRow = memo(function PrizeRow({
  item,
  accent,
  text,
  muted,
  border,
  container,
}: {
  item: LotteryPrize;
  accent: string;
  text: string;
  muted: string;
  border: string;
  container: string;
}) {
  const special = /DB|ĐB|SPECIAL/i.test(item.code) || /đặc biệt/i.test(item.name);
  return (
    <View style={[styles.prizeRow, { borderBottomColor: border }, special && { backgroundColor: container }]}>
      <View style={styles.prizeLabelWrap}>
        <Text style={[styles.prizeCode, { color: special ? accent : muted }]}>{item.code}</Text>
        <Text style={[styles.prizeName, { color: muted }]} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={styles.numberWrap}>
        {item.numbers.map((number, index) => (
          <Text
            key={`${item.code}:${number}:${index}`}
            style={[styles.number, special && styles.specialNumber, { color: special ? accent : text }]}
          >
            {number}
          </Text>
        ))}
      </View>
    </View>
  );
});

export default function LotteryScreen() {
  const navigation = useNavigation();
  const { themeMode } = useAppStore();
  const colors = getPageTheme('lottery', themeMode);
  const today = formatIsoDate(new Date());
  const [region, setRegion] = useState<Region>('north');
  const [provinceByRegion, setProvinceByRegion] = useState({
    central: PROVINCES.central[0],
    south: PROVINCES.south[0],
  });
  const [lotteryType, setLotteryType] = useState(VIETLOTT_TYPES[0]);
  const [drawDate, setDrawDate] = useState(today);
  const [resource, setResource] = useState<UtilityResource<LotteryDraw>>(emptyResource);
  const [refreshing, setRefreshing] = useState(false);
  const lastFetchAt = useRef(0);

  const province = region === 'central' || region === 'south'
    ? provinceByRegion[region]
    : '';
  const activeLotteryType = region === 'vietlott' ? lotteryType : '';
  const cacheKey = useMemo(
    () => utilityCacheKeys.lottery(region, province, drawDate, activeLotteryType),
    [activeLotteryType, drawDate, province, region]
  );

  const load = useCallback(async (force = false) => {
    const cached = await readUtilityCache<LotteryDraw>(cacheKey);
    if (cached) {
      setResource({
        status: isUtilityCacheFresh(cached, LOTTERY_TTL) ? 'success' : 'stale',
        data: cached.payload.data,
        source: cached.payload.source,
        updatedAt: cached.payload.updatedAt,
        error: null,
        fromCache: true,
      });
      if (!force && isUtilityCacheFresh(cached, LOTTERY_TTL)) return;
    } else {
      setResource((current) => ({ ...current, status: 'loading', error: null }));
    }

    try {
      const response = await apiClient.getLotteryDraw({
        region,
        province: province || undefined,
        drawDate,
        lotteryType: activeLotteryType || undefined,
      });
      await writeUtilityCache(cacheKey, response.data);
      lastFetchAt.current = Date.now();
      setResource({
        status: 'success',
        data: response.data.data,
        source: response.data.source,
        updatedAt: response.data.updatedAt,
        error: null,
        fromCache: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải kết quả xổ số';
      setResource((current) => ({
        ...current,
        status: current.data ? 'stale' : 'error',
        error: message,
      }));
    }
  }, [activeLotteryType, cacheKey, drawDate, province, region]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const status = resource.data?.status;
    if (status !== 'DRAWING' && status !== 'PARTIAL') return;
    const timer = setInterval(() => load(true), 10_000);
    return () => clearInterval(timer);
  }, [load, resource.data?.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastFetchAt.current > LOTTERY_TTL) load(true);
    });
    return () => subscription.remove();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  const changeDate = (offset: number) => {
    const next = shiftIsoDate(drawDate, offset);
    if (!isFutureIsoDate(next)) setDrawDate(next);
  };

  const header = (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {REGIONS.map((item) => {
          const active = item.key === region;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.tab, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.cardBackground }]}
              onPress={() => setRegion(item.key)}
            >
              <Text style={[styles.tabText, { color: active ? colors.onPrimary : colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {(region === 'central' || region === 'south') && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {PROVINCES[region].map((item) => {
            const active = province === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, { backgroundColor: active ? colors.primaryContainer : colors.cardBackground, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setProvinceByRegion((current) => ({ ...current, [region]: item }))}
              >
                <Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {region === 'vietlott' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {VIETLOTT_TYPES.map((item) => {
            const active = lotteryType === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.filterChip, { backgroundColor: active ? colors.primaryContainer : colors.cardBackground, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setLotteryType(item)}
              >
                <Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.dateBar, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Ngày trước" style={styles.navButton} onPress={() => changeDate(-1)}>
          <ChevronLeft color={colors.textPrimary} size={20} {...IC} />
        </TouchableOpacity>
        <View style={styles.dateCopy}>
          <CalendarDays color={colors.primary} size={16} {...IC} />
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>{drawDate === today ? 'Hôm nay · ' : ''}{drawDate.split('-').reverse().join('/')}</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Ngày sau"
          disabled={drawDate >= today}
          style={[styles.navButton, drawDate >= today && styles.disabled]}
          onPress={() => changeDate(1)}
        >
          <ChevronRight color={colors.textPrimary} size={20} {...IC} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={[styles.statusBadge, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.statusText, { color: colors.primary }]}>
            {statusText[resource.data?.status || 'UNAVAILABLE']}
          </Text>
        </View>
        <Text style={[styles.sourceText, { color: colors.textMuted }]} numberOfLines={2}>
          {resource.source
            ? `Nguồn: ${resource.source} · ${formatUpdatedAt(resource.updatedAt)}`
            : 'Nguồn dữ liệu xổ số chưa được cấu hình'}
        </Text>
      </View>

      {(resource.data?.completedAt || resource.data?.scheduledAt) && (
        <Text style={[styles.drawTime, { color: colors.textSecondary }]}>
          {resource.data.completedAt
            ? `Hoàn tất lúc ${formatUpdatedAt(resource.data.completedAt)}`
            : `Dự kiến cập nhật lúc ${formatUpdatedAt(resource.data.scheduledAt || null)}`}
        </Text>
      )}

      {resource.data?.status === 'SCHEDULED' && (
        <View style={[styles.notice, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.noticeText, { color: colors.primary }]}>Kỳ quay chưa bắt đầu. Ứng dụng sẽ không hiển thị kết quả giả.</Text>
        </View>
      )}
      {resource.data?.status === 'PARTIAL' && (
        <View style={[styles.notice, { backgroundColor: colors.primaryContainer }]}>
          <Text style={[styles.noticeText, { color: colors.primary }]}>Kết quả chưa hoàn tất; các giải còn lại đang được cập nhật.</Text>
        </View>
      )}
      {resource.status === 'stale' && (
        <Text style={[styles.staleText, { color: colors.warning }]}>Đang hiển thị dữ liệu lưu gần nhất vì nguồn cập nhật chưa phản hồi.</Text>
      )}
    </>
  );

  const prizes = resource.data?.status === 'SCHEDULED' ? [] : resource.data?.prizes || [];
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.pageBackground }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Quay lại" style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={21} {...IC} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Xổ số</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Kết quả theo nguồn đã xác thực</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}>
          <Ticket color={colors.primary} size={19} {...IC} />
        </View>
      </View>

      <FlatList
        data={prizes}
        keyExtractor={(item) => item.code}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ticket color={colors.primary} size={31} strokeWidth={1.6} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Chưa có kết quả để hiển thị</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {resource.error || 'Hãy chọn kỳ quay khác hoặc tải lại khi nhà cung cấp công bố kết quả.'}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => load(true)}>
              <RefreshCw color={colors.primary} size={16} {...IC} />
              <Text style={[styles.retryText, { color: colors.primary }]}>Tải lại</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <PrizeRow item={item} accent={colors.primary} text={colors.textPrimary} muted={colors.textSecondary} border={colors.border} container={colors.primaryContainer} />
        )}
      />
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
  tabs: { paddingHorizontal: 15, paddingTop: 14, paddingBottom: 6, gap: 7 },
  tab: { minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  filters: { paddingHorizontal: 15, paddingVertical: 8, gap: 7 },
  filterChip: { minHeight: 34, paddingHorizontal: 12, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 11.5, fontWeight: '600' },
  dateBar: { minHeight: 52, marginHorizontal: 15, marginTop: 8, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  navButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.28 },
  dateCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dateText: { fontSize: 12.5, fontWeight: '700' },
  metaRow: { marginHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  statusText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  sourceText: { flex: 1, fontSize: 10.5, lineHeight: 15 },
  drawTime: { marginHorizontal: 15, marginTop: -7, marginBottom: 10, fontSize: 10.5 },
  notice: { marginHorizontal: 15, marginBottom: 10, padding: 12, borderRadius: 9 },
  noticeText: { fontSize: 11.5, lineHeight: 17 },
  staleText: { marginHorizontal: 15, marginBottom: 10, fontSize: 10.5 },
  prizeRow: { minHeight: 68, marginHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  prizeLabelWrap: { width: 82, paddingRight: 8 },
  prizeCode: { fontSize: 12, fontWeight: '800' },
  prizeName: { marginTop: 2, fontSize: 9.5 },
  numberWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7 },
  number: { minWidth: 42, textAlign: 'right', fontSize: 17, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] },
  specialNumber: { fontSize: 23, lineHeight: 29 },
  emptyState: { minHeight: 245, paddingHorizontal: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 12, fontFamily: F_SERIF, fontSize: 18, fontWeight: '700' },
  emptyText: { marginTop: 6, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  retryButton: { minHeight: 48, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  retryText: { fontSize: 12, fontWeight: '700' },
});
