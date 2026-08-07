import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  Calendar,
  ChevronRight,
  RefreshCw,
  Ticket,
  TrendingUp,
  Trophy,
} from 'lucide-react-native';
import solarLunar from 'solarlunar';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import {
  isUtilityCacheFresh,
  readUtilityCache,
  utilityCacheKeys,
  writeUtilityCache,
} from '../../services/utilityCache';
import {
  ExchangeRate,
  FootballMatch,
  LotteryDraw,
  UtilityEnvelope,
  UtilityResource,
} from '../../types/utilities';
import { appTheme, utilityThemes } from '../../theme/colors';
import { formatIsoDate } from './utilityUi';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;
const DASHBOARD_TTL = 3 * 60_000;

const emptyResource = <T,>(): UtilityResource<T> => ({
  status: 'idle',
  data: null,
  source: null,
  updatedAt: null,
  error: null,
  fromCache: false,
});

const formatUpdatedAt = (value: string | null) => {
  if (!value) return null;
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

const UtilityError = memo(function UtilityError({
  color,
  onRetry,
}: {
  color: string;
  onRetry: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={styles.retryRow}
      onPress={onRetry}
    >
      <RefreshCw color={color} size={14} {...IC} />
      <Text style={[styles.retryText, { color }]}>Thử lại</Text>
    </TouchableOpacity>
  );
});

export default function UtilitiesScreen() {
  const navigation = useNavigation<any>();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const dark = themeMode === 'dark';
  const today = new Date();
  const todayKey = formatIsoDate(today);
  const lunar = solarLunar.solar2lunar(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  ) as any;
  const [football, setFootball] = useState<UtilityResource<FootballMatch[]>>(
    emptyResource
  );
  const [finance, setFinance] = useState<UtilityResource<ExchangeRate[]>>(
    emptyResource
  );
  const [lottery, setLottery] = useState<UtilityResource<LotteryDraw>>(
    emptyResource
  );

  const loadResource = useCallback(
    async <T,>(
      cacheKey: string,
      setter: React.Dispatch<React.SetStateAction<UtilityResource<T>>>,
      fetcher: () => Promise<UtilityEnvelope<T>>,
      force = false
    ) => {
      const cached = await readUtilityCache<T>(cacheKey);
      if (cached) {
        setter({
          status: isUtilityCacheFresh(cached, DASHBOARD_TTL) ? 'success' : 'stale',
          data: cached.payload.data,
          source: cached.payload.source,
          updatedAt: cached.payload.updatedAt,
          error: null,
          fromCache: true,
        });
        if (!force && isUtilityCacheFresh(cached, DASHBOARD_TTL)) return;
      } else {
        setter((current) => ({ ...current, status: 'loading', error: null }));
      }

      try {
        const payload = await fetcher();
        await writeUtilityCache(cacheKey, payload);
        setter({
          status: 'success',
          data: payload.data,
          source: payload.source,
          updatedAt: payload.updatedAt,
          error: null,
          fromCache: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chưa thể cập nhật';
        setter((current) => ({
          ...current,
          status: current.data ? 'stale' : 'error',
          error: message,
        }));
      }
    },
    []
  );

  const loadFootball = useCallback(
    (force = false) =>
      loadResource(
        utilityCacheKeys.dashboard('football'),
        setFootball,
        async () =>
          (
            await apiClient.getFootballMatches({
              dateFrom: todayKey,
              dateTo: todayKey,
            })
          ).data,
        force
      ),
    [loadResource, todayKey]
  );
  const loadFinance = useCallback(
    (force = false) =>
      loadResource(
        utilityCacheKeys.dashboard('finance'),
        setFinance,
        async () => (await apiClient.getExchangeRates()).data,
        force
      ),
    [loadResource]
  );
  const loadLottery = useCallback(
    (force = false) =>
      loadResource(
        utilityCacheKeys.dashboard('lottery'),
        setLottery,
        async () =>
          (
            await apiClient.getLotteryDraw({
              region: 'north',
              drawDate: todayKey,
            })
          ).data,
        force
      ),
    [loadResource, todayKey]
  );

  useEffect(() => {
    loadFootball();
    loadFinance();
    loadLottery();
  }, [loadFinance, loadFootball, loadLottery]);

  const dayNames = [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ];
  const footballMatches = football.data || [];
  const firstMatch = footballMatches[0];
  const usd = finance.data?.find((item) => item.code === 'USD');
  const lotteryState = lottery.data?.status;

  const metaColor = shell.appTextSecondary;
  const surface = shell.appSurface;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: shell.appBackground }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={shell.appTextPrimary} size={21} {...IC} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>
            Tiện ích mỗi ngày
          </Text>
          <Text style={[styles.headerSubtitle, { color: metaColor }]}>
            Thông tin nhanh và tra cứu cá nhân hóa
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          style={[
            styles.calendarCard,
            {
              backgroundColor: dark
                ? utilityThemes.calendar.darkContainer
                : utilityThemes.calendar.container,
              borderColor: dark ? shell.appBorder : utilityThemes.calendar.border,
            },
          ]}
          onPress={() => navigation.navigate('Calendar')}
        >
          <View style={styles.cardTopRow}>
            <View>
              <Text style={[styles.cardLabel, { color: utilityThemes.calendar.accent }]}>
                LỊCH HÔM NAY
              </Text>
              <Text style={[styles.calendarTitle, { color: shell.appTextPrimary }]}>
                {dayNames[today.getDay()]}, {today.getDate()} tháng {today.getMonth() + 1}
              </Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: surface }]}>
              <Calendar color={utilityThemes.calendar.accent} size={20} {...IC} />
            </View>
          </View>
          <Text style={[styles.calendarMeta, { color: metaColor }]}>
            {lunar.lDay} tháng {lunar.lMonth} âm lịch
          </Text>
          <View style={styles.cardActionRow}>
            <Text style={[styles.cardAction, { color: utilityThemes.calendar.accent }]}>Xem lịch</Text>
            <ChevronRight color={utilityThemes.calendar.accent} size={17} {...IC} />
          </View>
        </TouchableOpacity>

        <View style={styles.twoColumnRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: surface, borderColor: dark ? shell.appBorder : utilityThemes.football.border }]}
            onPress={() => navigation.navigate('Football')}
          >
            <View style={[styles.iconBox, { backgroundColor: dark ? utilityThemes.football.darkContainer : utilityThemes.football.container }]}>
              <Trophy color={utilityThemes.football.accent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: utilityThemes.football.accent }]}>BÓNG ĐÁ</Text>
            {football.status === 'loading' ? (
              <ActivityIndicator style={styles.cardLoader} color={utilityThemes.football.accent} size="small" />
            ) : football.status === 'error' ? (
              <>
                <Text style={[styles.cardValue, { color: shell.appTextPrimary }]}>Chưa thể cập nhật</Text>
                <UtilityError color={utilityThemes.football.accent} onRetry={() => loadFootball(true)} />
              </>
            ) : (
              <>
                <Text style={[styles.cardValue, { color: shell.appTextPrimary }]}>
                  {footballMatches.length} trận hôm nay
                </Text>
                <Text style={[styles.cardDescription, { color: metaColor }]} numberOfLines={2}>
                  {firstMatch
                    ? `${new Date(firstMatch.utcDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${firstMatch.homeTeam.shortName} – ${firstMatch.awayTeam.shortName}`
                    : 'Không có trận trong nguồn hiện tại'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: surface, borderColor: dark ? shell.appBorder : utilityThemes.finance.border }]}
            onPress={() => navigation.navigate('Finance')}
          >
            <View style={[styles.iconBox, { backgroundColor: dark ? utilityThemes.finance.darkContainer : utilityThemes.finance.container }]}>
              <TrendingUp color={utilityThemes.finance.accent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: utilityThemes.finance.accent }]}>TÀI CHÍNH</Text>
            {finance.status === 'loading' ? (
              <ActivityIndicator style={styles.cardLoader} color={utilityThemes.finance.accent} size="small" />
            ) : finance.status === 'error' ? (
              <>
                <Text style={[styles.cardValue, { color: shell.appTextPrimary }]}>Chưa thể cập nhật</Text>
                <UtilityError color={utilityThemes.finance.accent} onRetry={() => loadFinance(true)} />
              </>
            ) : (
              <>
                <Text style={[styles.cardValue, { color: shell.appTextPrimary }]}>USD · Vietcombank</Text>
                <Text style={[styles.cardDescription, { color: metaColor }]} numberOfLines={2}>
                  {usd?.sell ? `Bán ${usd.sell.toLocaleString('vi-VN')} VND` : 'Chưa có tỷ giá USD'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.lotteryCard, { backgroundColor: surface, borderColor: dark ? shell.appBorder : utilityThemes.lottery.border }]}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={styles.lotteryMain}
            onPress={() => navigation.navigate('Lottery')}
          >
            <View style={[styles.iconBox, { backgroundColor: dark ? utilityThemes.lottery.darkContainer : utilityThemes.lottery.container }]}>
              <Ticket color={utilityThemes.lottery.accent} size={19} {...IC} />
            </View>
            <View style={styles.lotteryCopy}>
              <Text style={[styles.cardLabel, { color: utilityThemes.lottery.accent }]}>XỔ SỐ</Text>
              <Text style={[styles.cardValue, { color: shell.appTextPrimary }]}>Miền Bắc</Text>
              <Text style={[styles.cardDescription, { color: metaColor }]}>
                {lottery.status === 'loading'
                  ? 'Đang cập nhật trạng thái kỳ quay'
                  : lottery.status === 'error'
                    ? 'Nguồn kết quả chưa khả dụng'
                    : lotteryState === 'FINAL'
                      ? 'Đã có kết quả'
                      : lotteryState === 'DRAWING' || lotteryState === 'PARTIAL'
                        ? 'Đang quay'
                        : 'Chưa có kết quả'}
              </Text>
            </View>
            <ChevronRight color={utilityThemes.lottery.accent} size={18} {...IC} />
          </TouchableOpacity>
          {lottery.status === 'error' && (
            <UtilityError color={utilityThemes.lottery.accent} onRetry={() => loadLottery(true)} />
          )}
        </View>

        {(football.updatedAt || finance.updatedAt || lottery.updatedAt) && (
          <View style={styles.updateSection}>
            <Text style={[styles.updateHeading, { color: shell.appPrimary }]}>CẬP NHẬT HÔM NAY</Text>
            {football.updatedAt && (
              <Text style={[styles.updateLine, { color: metaColor }]}>Bóng đá · {formatUpdatedAt(football.updatedAt)}</Text>
            )}
            {finance.updatedAt && (
              <Text style={[styles.updateLine, { color: metaColor }]}>Tỷ giá · {formatUpdatedAt(finance.updatedAt)}</Text>
            )}
            {lottery.updatedAt && (
              <Text style={[styles.updateLine, { color: metaColor }]}>Xổ số · {formatUpdatedAt(lottery.updatedAt)}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 48, height: 48, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: F_SERIF, fontSize: 25, lineHeight: 30, fontWeight: '700' },
  headerSubtitle: { marginTop: 1, fontSize: 11.5, lineHeight: 16 },
  scrollBody: { paddingHorizontal: 15, paddingBottom: 34 },
  calendarCard: { minHeight: 124, padding: 14, borderWidth: 1, borderRadius: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 9.5, lineHeight: 13, fontWeight: '800', letterSpacing: 0.55 },
  calendarTitle: { marginTop: 4, fontFamily: F_SERIF, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  calendarMeta: { marginTop: 3, fontSize: 11.5, lineHeight: 16 },
  cardActionRow: { minHeight: 36, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAction: { fontSize: 12, fontWeight: '700' },
  twoColumnRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  halfCard: { flex: 1, minWidth: 0, minHeight: 124, padding: 13, borderWidth: 1, borderRadius: 10 },
  halfLabel: { marginTop: 10 },
  cardValue: { marginTop: 3, fontFamily: F_SERIF, fontSize: 15.5, lineHeight: 20, fontWeight: '700' },
  cardDescription: { marginTop: 3, fontSize: 10.5, lineHeight: 15 },
  cardLoader: { alignSelf: 'flex-start', marginTop: 13 },
  retryRow: { minHeight: 32, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  retryText: { marginLeft: 5, fontSize: 10.5, fontWeight: '700' },
  lotteryCard: { minHeight: 108, marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 10 },
  lotteryMain: { minHeight: 64, flexDirection: 'row', alignItems: 'center' },
  lotteryCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  updateSection: { marginTop: 24, paddingHorizontal: 2 },
  updateHeading: { fontSize: 9.5, lineHeight: 13, fontWeight: '800', letterSpacing: 0.55 },
  updateLine: { marginTop: 7, fontSize: 11.5, lineHeight: 16 },
});
