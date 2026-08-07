import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { apiClient } from '../../services/api/client';
import {
  isUtilityCacheFresh,
  readUtilityCache,
  utilityCacheKeys,
  writeUtilityCache,
} from '../../services/utilityCache';
import {
  FootballMatch,
  FootballStanding,
  UtilityResource,
} from '../../types/utilities';
import { getPageTheme, utilityThemes } from '../../theme/colors';
import {
  FootballTab,
  footballPollInterval,
  footballStatusLabel,
  formatIsoDate,
  isMatchForTab,
  shiftIsoDate,
} from '../Utilities/utilityUi';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;
const FOOTBALL_TTL = 5 * 60_000;
const STANDINGS_TTL = 15 * 60_000;
const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED', 'HALFTIME']);

const COMPETITIONS = [
  { code: '', label: 'Tất cả giải' },
  { code: 'PL', label: 'Ngoại hạng Anh' },
  { code: 'CL', label: 'Champions League' },
  { code: 'PD', label: 'La Liga' },
  { code: 'BL1', label: 'Bundesliga' },
  { code: 'SA', label: 'Serie A' },
  { code: 'FL1', label: 'Ligue 1' },
];

const emptyResource = <T,>(): UtilityResource<T> => ({
  status: 'idle',
  data: null,
  source: null,
  updatedAt: null,
  error: null,
  fromCache: false,
});

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Chưa có thời gian cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `Cập nhật lúc ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}, ${date.toLocaleDateString('vi-VN')}`;
};

const formatKickoff = (match: FootballMatch) => {
  const date = new Date(match.utcDate);
  if (Number.isNaN(date.getTime())) return 'Chưa xác định giờ thi đấu';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const Team = memo(function Team({
  name,
  crest,
  score,
  color,
}: {
  name: string;
  crest?: string | null;
  score?: number | null;
  color: string;
}) {
  return (
    <View style={styles.teamRow}>
      {crest ? <Image source={{ uri: crest }} style={styles.teamLogo} /> : <View style={styles.logoPlaceholder} />}
      <Text style={[styles.teamName, { color }]} numberOfLines={2}>{name}</Text>
      {score != null && <Text style={[styles.score, { color }]}>{score}</Text>}
    </View>
  );
});

const FootballMatchCard = memo(function FootballMatchCard({
  match,
  colors,
  onOpen,
}: {
  match: FootballMatch;
  colors: ReturnType<typeof getPageTheme>;
  onOpen: (match: FootballMatch) => void;
}) {
  const live = LIVE_STATUSES.has(match.status);
  const finished = match.status === 'FINISHED';
  const showScore = live || finished;
  return (
    <View
      style={[
        styles.matchCard,
        {
          backgroundColor: live ? colors.primaryContainer : colors.cardBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.matchMetaRow}>
        <Text style={[styles.matchRound, { color: colors.textSecondary }]}>
          {match.matchday ? `Vòng ${match.matchday}` : match.stage || 'Lịch thi đấu'}
        </Text>
        <View style={styles.statusRow}>
          {live && <View style={styles.liveDot} />}
          <Text style={[styles.statusText, { color: live ? colors.error : colors.textSecondary }]}>
            {live ? `LIVE${match.minute != null ? ` · ${match.minute}'` : ''}` : footballStatusLabel(match.status)}
          </Text>
        </View>
      </View>
      {!showScore && (
        <Text style={[styles.kickoff, { color: colors.primary }]}>{formatKickoff(match)}</Text>
      )}
      <Team name={match.homeTeam.name} crest={match.homeTeam.crest} score={showScore ? match.score.home : null} color={colors.textPrimary} />
      <Team name={match.awayTeam.name} crest={match.awayTeam.crest} score={showScore ? match.score.away : null} color={colors.textPrimary} />
      {!!match.venue && (
        <View style={styles.venueRow}>
          <MapPin color={colors.textMuted} size={13} {...IC} />
          <Text style={[styles.venueText, { color: colors.textMuted }]} numberOfLines={1}>{match.venue}</Text>
        </View>
      )}
      {(finished || live) && (
        <TouchableOpacity accessibilityRole="button" style={styles.detailButton} onPress={() => onOpen(match)}>
          <Text style={[styles.detailText, { color: colors.primary }]}>Chi tiết trận</Text>
          <ChevronRight color={colors.primary} size={15} {...IC} />
        </TouchableOpacity>
      )}
    </View>
  );
});

export default function FootballScreen() {
  const navigation = useNavigation<any>();
  const themeMode = useAppStore((state) => state.themeMode);
  const colors = getPageTheme('football', themeMode);
  const today = useMemo(() => formatIsoDate(new Date()), []);
  const [activeTab, setActiveTab] = useState<FootballTab>('today');
  const [selectedDate, setSelectedDate] = useState(today);
  const [competition, setCompetition] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [matches, setMatches] = useState<UtilityResource<FootballMatch[]>>(emptyResource);
  const [standings, setStandings] = useState<UtilityResource<FootballStanding[]>>(emptyResource);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundFetching, setBackgroundFetching] = useState(false);
  const [detailMatch, setDetailMatch] = useState<FootballMatch | null>(null);
  const lastFetchAt = useRef(0);

  const matchRange = useMemo(() => {
    if (activeTab === 'upcoming') return { from: selectedDate, to: shiftIsoDate(selectedDate, 14) };
    if (activeTab === 'results') return { from: shiftIsoDate(selectedDate, -14), to: selectedDate };
    return { from: selectedDate, to: selectedDate };
  }, [activeTab, selectedDate]);

  const loadMatches = useCallback(async (force = false, pullRefresh = false) => {
    if (activeTab === 'standings') return;
    const key = utilityCacheKeys.football(selectedDate, competition, season, activeTab);
    const cached = await readUtilityCache<FootballMatch[]>(key);
    if (cached) {
      setMatches({
        status: isUtilityCacheFresh(cached, FOOTBALL_TTL) ? 'success' : 'stale',
        data: cached.payload.data,
        source: cached.payload.source,
        updatedAt: cached.payload.updatedAt,
        error: null,
        fromCache: true,
      });
      if (!force && isUtilityCacheFresh(cached, FOOTBALL_TTL)) return;
      if (!pullRefresh) setBackgroundFetching(true);
    } else {
      setMatches((current) => ({ ...current, status: 'loading', error: null }));
    }
    try {
      const payload = (
        await apiClient.getFootballMatches({
          dateFrom: matchRange.from,
          dateTo: matchRange.to,
          competition: competition || undefined,
        })
      ).data;
      await writeUtilityCache(key, payload);
      lastFetchAt.current = Date.now();
      setMatches({ status: 'success', data: payload.data, source: payload.source, updatedAt: payload.updatedAt, error: null, fromCache: false });
    } catch (error) {
      setMatches((current) => ({ ...current, status: current.data ? 'stale' : 'error', error: error instanceof Error ? error.message : 'Chưa thể cập nhật Bóng đá' }));
    } finally {
      setBackgroundFetching(false);
    }
  }, [activeTab, competition, matchRange.from, matchRange.to, season, selectedDate]);

  const loadStandings = useCallback(async (force = false) => {
    if (activeTab !== 'standings') return;
    if (!competition) {
      setStandings((current) => ({ ...current, status: 'error', error: 'Chọn một giải đấu để xem bảng xếp hạng' }));
      return;
    }
    const key = utilityCacheKeys.footballStandings(competition, season);
    const cached = await readUtilityCache<FootballStanding[]>(key);
    if (cached) {
      setStandings({ status: isUtilityCacheFresh(cached, STANDINGS_TTL) ? 'success' : 'stale', data: cached.payload.data, source: cached.payload.source, updatedAt: cached.payload.updatedAt, error: null, fromCache: true });
      if (!force && isUtilityCacheFresh(cached, STANDINGS_TTL)) return;
      setBackgroundFetching(true);
    } else {
      setStandings((current) => ({ ...current, status: 'loading', error: null }));
    }
    try {
      const payload = (await apiClient.getFootballStandings({ competition, season: Number(season) })).data;
      await writeUtilityCache(key, payload);
      setStandings({ status: 'success', data: payload.data, source: payload.source, updatedAt: payload.updatedAt, error: null, fromCache: false });
    } catch (error) {
      setStandings((current) => ({ ...current, status: current.data ? 'stale' : 'error', error: error instanceof Error ? error.message : 'Chưa thể cập nhật bảng xếp hạng' }));
    } finally {
      setBackgroundFetching(false);
    }
  }, [activeTab, competition, season]);

  useEffect(() => {
    activeTab === 'standings' ? loadStandings() : loadMatches();
  }, [activeTab, loadMatches, loadStandings]);

  const visibleMatches = useMemo(
    () => (matches.data || []).filter((match) => isMatchForTab(match, activeTab, selectedDate)),
    [activeTab, matches.data, selectedDate]
  );

  useEffect(() => {
    if (activeTab === 'standings') return;
    const interval = footballPollInterval(visibleMatches);
    if (!interval) return;
    const timer = setInterval(() => loadMatches(true), interval);
    return () => clearInterval(timer);
  }, [activeTab, loadMatches, visibleMatches]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastFetchAt.current > FOOTBALL_TTL) {
        activeTab === 'standings' ? loadStandings(true) : loadMatches(true);
      }
    });
    return () => subscription.remove();
  }, [activeTab, loadMatches, loadStandings]);

  const sections = useMemo(() => {
    const grouped = new Map<string, FootballMatch[]>();
    visibleMatches.forEach((match) => {
      grouped.set(match.competition, [...(grouped.get(match.competition) || []), match]);
    });
    return [...grouped.entries()].map(([title, data]) => ({ title, data }));
  }, [visibleMatches]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      activeTab === 'standings' ? await loadStandings(true) : await loadMatches(true, true);
    } finally {
      setRefreshing(false);
    }
  };

  const tabLabels: Record<FootballTab, string> = {
    today: 'Hôm nay',
    upcoming: 'Sắp diễn ra',
    results: 'Kết quả',
    standings: 'BXH',
  };
  const currentResource = activeTab === 'standings' ? standings : matches;

  const header = (
    <>
      <View style={styles.tabRow}>
        {(Object.keys(tabLabels) as FootballTab[]).map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary }]} onPress={() => {
            if (tab === 'standings' && !competition) setCompetition('PL');
            setActiveTab(tab);
          }}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textSecondary }]}>{tabLabels[tab]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab !== 'standings' && (
        <View style={[styles.dateNavigator, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TouchableOpacity accessibilityLabel="Ngày trước" style={styles.navButton} onPress={() => setSelectedDate(shiftIsoDate(selectedDate, -1))}>
            <ChevronLeft color={colors.textPrimary} size={20} {...IC} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>{selectedDate === today ? 'Hôm nay ' : ''}{selectedDate.split('-').reverse().join('/')}</Text>
          <TouchableOpacity accessibilityLabel="Ngày sau" style={styles.navButton} onPress={() => setSelectedDate(shiftIsoDate(selectedDate, 1))}>
            <ChevronRight color={colors.textPrimary} size={20} {...IC} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.competitionRow}>
        {COMPETITIONS.map((item) => {
          const selected = competition === item.code;
          return (
            <TouchableOpacity key={item.code || 'all'} style={[styles.competitionChip, { backgroundColor: selected ? colors.primary : colors.cardBackground, borderColor: selected ? colors.primary : colors.border }]} onPress={() => setCompetition(item.code)}>
              <Text style={[styles.competitionText, { color: selected ? colors.onPrimary : colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {activeTab === 'standings' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasonRow}>
          {[0, 1, 2].map((offset) => {
            const value = String(new Date().getFullYear() - offset);
            const selected = season === value;
            return (
              <TouchableOpacity key={value} style={[styles.seasonChip, { backgroundColor: selected ? colors.primaryContainer : colors.cardBackground, borderColor: selected ? colors.primary : colors.border }]} onPress={() => setSeason(value)}>
                <Text style={[styles.seasonText, { color: selected ? colors.primary : colors.textSecondary }]}>{value}/{Number(value) + 1}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.sourceRow}>
        <Text style={[styles.sourceText, { color: colors.textMuted }]}>
          {currentResource.source ? `Nguồn: ${currentResource.source} · ${formatTimestamp(currentResource.updatedAt)}` : 'Nguồn dữ liệu chưa được cấu hình'}
        </Text>
        {backgroundFetching && <Text style={[styles.updatingText, { color: colors.primary }]}>Đang cập nhật…</Text>}
      </View>
      {currentResource.status === 'stale' && (
        <Text style={[styles.staleText, { color: colors.warning }]}>Dữ liệu có thể chưa phải mới nhất</Text>
      )}
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.pageBackground }]}>
      <View style={[styles.screenHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityLabel="Quay lại" style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={21} {...IC} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Bóng đá</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Lịch đấu, tỷ số và bảng xếp hạng</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryContainer }]}><Trophy color={colors.primary} size={19} {...IC} /></View>
      </View>

      {activeTab === 'standings' ? (
        <SectionList
          sections={standings.data?.length ? [{ title: 'BẢNG XẾP HẠNG', data: standings.data }] : []}
          keyExtractor={(item) => String((item as FootballStanding).teamId)}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<EmptyState loading={standings.status === 'loading'} message={standings.error || 'Chưa có dữ liệu bảng xếp hạng'} color={colors.primary} textColor={colors.textSecondary} onRetry={() => loadStandings(true)} />}
          renderSectionHeader={({ section }) => (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title}</Text>
              <View style={[styles.standingHeader, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
                <Text style={[styles.rank, { color: colors.textMuted }]}>#</Text>
                <View style={styles.standingLogo} />
                <Text style={[styles.standingTeam, { color: colors.textMuted }]}>Đội</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>Tr</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>T</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>H</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>B</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>HS</Text>
                <Text style={[styles.standingValue, { color: colors.textMuted }]}>Đ</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const row = item as FootballStanding;
            return <StandingRow row={row} colors={colors} />;
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<EmptyState loading={matches.status === 'loading'} message={matches.error || 'Không có trận phù hợp với ngày và bộ lọc này'} color={colors.primary} textColor={colors.textSecondary} onRetry={() => loadMatches(true)} />}
          renderSectionHeader={({ section }) => <Text style={[styles.sectionTitle, { color: colors.primary }]}>{section.title.toUpperCase()}</Text>}
          renderItem={({ item }) => <FootballMatchCard match={item} colors={colors} onOpen={setDetailMatch} />}
        />
      )}

      <Modal visible={Boolean(detailMatch)} transparent animationType="slide" onRequestClose={() => setDetailMatch(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.detailSheet, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.detailHeader}>
              <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>Chi tiết trận</Text>
              <TouchableOpacity accessibilityLabel="Đóng chi tiết" style={styles.closeButton} onPress={() => setDetailMatch(null)}><X color={colors.textPrimary} size={20} {...IC} /></TouchableOpacity>
            </View>
            {detailMatch && (
              <>
                <Text style={[styles.detailCompetition, { color: colors.primary }]}>{detailMatch.competition}</Text>
                <Team name={detailMatch.homeTeam.name} crest={detailMatch.homeTeam.crest} score={detailMatch.score.home} color={colors.textPrimary} />
                <Team name={detailMatch.awayTeam.name} crest={detailMatch.awayTeam.crest} score={detailMatch.score.away} color={colors.textPrimary} />
                <View style={styles.detailMeta}><Clock3 color={colors.textMuted} size={15} {...IC} /><Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>{formatKickoff(detailMatch)}</Text></View>
                {!!detailMatch.venue && <View style={styles.detailMeta}><MapPin color={colors.textMuted} size={15} {...IC} /><Text style={[styles.detailMetaText, { color: colors.textSecondary }]}>{detailMatch.venue}</Text></View>}
                <Text style={[styles.providerNote, { color: colors.textMuted }]}>Chỉ hiển thị dữ liệu trận đấu do nguồn cung cấp.</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const StandingRow = memo(function StandingRow({ row, colors }: { row: FootballStanding; colors: ReturnType<typeof getPageTheme> }) {
  return (
    <View style={[styles.standingRow, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
      <Text style={[styles.rank, { color: colors.textSecondary }]}>{row.position}</Text>
      {row.crest ? <Image source={{ uri: row.crest }} style={styles.standingLogo} /> : <View style={styles.standingLogo} />}
      <Text style={[styles.standingTeam, { color: colors.textPrimary }]} numberOfLines={1}>{row.team}</Text>
      {[row.played, row.won, row.draw, row.lost, row.goalDifference, row.points].map((value, index) => (
        <Text key={`${row.teamId}-${index}`} style={[styles.standingValue, index === 5 && styles.points, { color: colors.textPrimary }]}>{value}</Text>
      ))}
    </View>
  );
});

const EmptyState = memo(function EmptyState({ loading, message, color, textColor, onRetry }: { loading: boolean; message: string; color: string; textColor: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      {loading ? <View style={[styles.skeleton, { backgroundColor: utilityThemes.football.container }]} /> : <Text style={[styles.emptyText, { color: textColor }]}>{message}</Text>}
      {!loading && <TouchableOpacity style={styles.retryButton} onPress={onRetry}><RefreshCw color={color} size={16} {...IC} /><Text style={[styles.retryLabel, { color }]}>Thử lại</Text></TouchableOpacity>}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  screenHeader: { minHeight: 72, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  backButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontFamily: F_SERIF, fontSize: 25, lineHeight: 30, fontWeight: '700' },
  subtitle: { marginTop: 1, fontSize: 11.5, lineHeight: 16 },
  headerIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 30 },
  tabRow: { flexDirection: 'row' },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 11.5, fontWeight: '700' },
  dateNavigator: { minHeight: 52, marginHorizontal: 15, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 9 },
  navButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 13, fontWeight: '700' },
  competitionRow: { paddingHorizontal: 15, paddingVertical: 10 },
  competitionChip: { minHeight: 38, marginRight: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7 },
  competitionText: { fontSize: 11, fontWeight: '700' },
  seasonRow: { paddingHorizontal: 15, paddingBottom: 8 },
  seasonChip: { minHeight: 34, marginRight: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  seasonText: { fontSize: 10.5, fontWeight: '700' },
  sourceRow: { paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceText: { flex: 1, fontSize: 10.5, lineHeight: 15 },
  updatingText: { marginLeft: 8, fontSize: 10.5, fontWeight: '700' },
  staleText: { marginTop: 4, paddingHorizontal: 15, fontSize: 10.5 },
  sectionTitle: { marginTop: 18, marginBottom: 8, marginHorizontal: 15, fontSize: 10, fontWeight: '800', letterSpacing: 0.55 },
  matchCard: { marginHorizontal: 15, marginBottom: 9, padding: 13, borderWidth: 1, borderRadius: 10 },
  matchMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchRound: { flex: 1, fontSize: 10.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, marginRight: 5, borderRadius: 4, backgroundColor: '#C73737' },
  statusText: { fontSize: 10, fontWeight: '800' },
  kickoff: { marginVertical: 7, fontSize: 12, fontWeight: '700' },
  teamRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center' },
  teamLogo: { width: 25, height: 25, resizeMode: 'contain' },
  logoPlaceholder: { width: 25, height: 25 },
  teamName: { flex: 1, minWidth: 0, marginLeft: 9, fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
  score: { marginLeft: 10, fontSize: 22, fontVariant: ['tabular-nums'], fontWeight: '800' },
  venueRow: { marginTop: 5, flexDirection: 'row', alignItems: 'center' },
  venueText: { flex: 1, marginLeft: 5, fontSize: 10.5 },
  detailButton: { minHeight: 44, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  detailText: { marginRight: 3, fontSize: 11.5, fontWeight: '700' },
  standingRow: { minHeight: 48, marginHorizontal: 15, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  standingHeader: { minHeight: 34, marginHorizontal: 15, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  rank: { width: 24, textAlign: 'center', fontSize: 11, fontVariant: ['tabular-nums'] },
  standingLogo: { width: 22, height: 22, resizeMode: 'contain' },
  standingTeam: { flex: 1, minWidth: 90, marginLeft: 7, fontSize: 11.5, fontWeight: '600' },
  standingValue: { width: 28, textAlign: 'right', fontSize: 10.5, fontVariant: ['tabular-nums'] },
  points: { fontWeight: '800' },
  emptyState: { minHeight: 220, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', fontSize: 13, lineHeight: 19 },
  skeleton: { width: '100%', height: 116, borderRadius: 10 },
  retryButton: { minHeight: 48, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  retryLabel: { marginLeft: 6, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,16,0.5)' },
  detailSheet: { padding: 18, paddingBottom: 30, borderTopWidth: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  detailHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { fontFamily: F_SERIF, fontSize: 21, fontWeight: '700' },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  detailCompetition: { marginVertical: 8, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  detailMeta: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
  detailMetaText: { marginLeft: 7, fontSize: 11.5 },
  providerNote: { marginTop: 16, fontSize: 10.5, lineHeight: 15 },
});
