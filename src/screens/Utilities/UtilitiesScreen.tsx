import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Hourglass,
  Bell,
  RefreshCw,
  Calculator,
  ChevronRight,
} from 'lucide-react-native';
import solarLunar from 'solarlunar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store/useAppStore';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

export default function UtilitiesScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const themeMode = useAppStore((state) => state.themeMode);
  const dark = themeMode === 'dark';

  const today = new Date();
  const lunar = solarLunar.solar2lunar(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  ) as any;

  // Local state for counts
  const [todayRemindersCount, setTodayRemindersCount] = useState(0);
  const [closestCounter, setClosestCounter] = useState<string | null>(null);

  // Palette tokens
  const canvasBg = dark ? '#181512' : '#F7F3ED';
  const surfaceBg = dark ? '#211D1A' : '#FFFDF9';
  const textPrimary = dark ? '#F4EEE8' : '#29231F';
  const textSecondary = dark ? '#C1B7AE' : '#746D66';
  const borderColor = dark ? 'rgba(255, 255, 255, 0.10)' : '#E4DCD2';

  // Backdrop colors for container blocks
  const calendarBg = dark ? '#2D283E' : '#F3E8FF';
  const calendarBorder = dark ? '#3E345E' : '#E9D5FF';
  const calendarAccent = dark ? '#C084FC' : '#7C3AED';

  const counterBg = dark ? '#342320' : '#FFF0EA';
  const counterBorder = dark ? '#4A302C' : '#FFE4E6';
  const counterAccent = dark ? '#F4A18E' : '#E11D48';

  const reminderBg = dark ? '#1E2823' : '#EBF2EB';
  const reminderBorder = dark ? '#2B3B31' : '#D2E2D2';
  const reminderAccent = dark ? '#9DB3A2' : '#16A34A';

  const converterBg = dark ? '#1C2428' : '#E6ECEF';
  const converterBorder = dark ? '#273339' : '#D0DBE0';
  const converterAccent = dark ? '#9BB0B6' : '#2563EB';

  const calculatorBg = dark ? '#26241C' : '#FEF9E7';
  const calculatorBorder = dark ? '#3A3528' : '#FDE047';
  const calculatorAccent = dark ? '#D9B264' : '#CA8A04';

  useEffect(() => {
    if (!isFocused) return;

    const loadDynamicStats = async () => {
      try {
      // 1. Load reminders
      const rawReminders = await AsyncStorage.getItem('@BaoDienTu:utilities:reminders');
      if (rawReminders) {
        const reminders = JSON.parse(rawReminders);
        const currentDate = new Date();
        const todayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        const todayItems = reminders.filter((r: any) => r.date === todayStr);
        setTodayRemindersCount(todayItems.length);
      } else {
        setTodayRemindersCount(0);
      }

      // 2. Load day counters
      const rawCounters = await AsyncStorage.getItem('@BaoDienTu:utilities:dayCounters');
      if (rawCounters) {
        const counters = JSON.parse(rawCounters);
        // Find closest upcoming counter
        let closest: any = null;
        let minDiff = Infinity;
        const todayTime = new Date().setHours(0,0,0,0);

        counters.forEach((c: any) => {
          const diff = new Date(c.targetDate).getTime() - todayTime;
          if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            closest = c;
          }
        });

        if (closest) {
          const days = Math.round(minDiff / (24 * 60 * 60 * 1000));
          setClosestCounter(`${closest.title}: Còn ${days} ngày`);
        } else {
          setClosestCounter(null);
        }
      } else {
        setClosestCounter(null);
      }
      } catch (e) {
        console.error(e);
      }
    };

    loadDynamicStats();
  }, [isFocused]);

  const dayNames = [
    'Chủ nhật',
    'Thứ hai',
    'Thứ ba',
    'Thứ tư',
    'Thứ năm',
    'Thứ sáu',
    'Thứ bảy',
  ];

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: canvasBg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={textPrimary} size={21} {...IC} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>
            Tiện ích mỗi ngày
          </Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
            Công cụ nhỏ hữu ích cho ngày của bạn
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        
        {/* LỊCH CARD (Full width) */}
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.8}
          style={[
            styles.calendarCard,
            {
              backgroundColor: calendarBg,
              borderColor: calendarBorder,
            },
          ]}
          onPress={() => navigation.navigate('Calendar')}
        >
          <View style={styles.cardTopRow}>
            <View>
              <Text style={[styles.cardLabel, { color: calendarAccent }]}>
                LỊCH HÀNG NGÀY
              </Text>
              <Text style={[styles.calendarTitle, { color: textPrimary }]}>
                {dayNames[today.getDay()]}, {today.getDate()} tháng {today.getMonth() + 1}
              </Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: surfaceBg }]}>
              <Calendar color={calendarAccent} size={20} {...IC} />
            </View>
          </View>
          <Text style={[styles.calendarMeta, { color: textSecondary }]}>
            {lunar.lDay} tháng {lunar.lMonth} âm lịch ({lunar.lYear})
          </Text>
          <View style={styles.cardActionRow}>
            <Text style={[styles.cardAction, { color: calendarAccent }]}>
              Xem lịch và ngày quan trọng
            </Text>
            <ChevronRight color={calendarAccent} size={17} {...IC} />
          </View>
        </TouchableOpacity>

        {/* TWO-COLUMN GRID */}
        <View style={styles.gridRow}>
          
          {/* ĐẾM NGÀY */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: counterBg, borderColor: counterBorder }]}
            onPress={() => navigation.navigate('DayCounter')}
          >
            <View style={[styles.iconBox, { backgroundColor: surfaceBg }]}>
              <Hourglass color={counterAccent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: counterAccent }]}>
              ĐẾM NGÀY
            </Text>
            <Text style={[styles.cardValue, { color: textPrimary }]}>
              {closestCounter || 'Còn bao nhiêu ngày?'}
            </Text>
          </TouchableOpacity>

          {/* NHẮC VIỆC */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: reminderBg, borderColor: reminderBorder }]}
            onPress={() => navigation.navigate('Reminders')}
          >
            <View style={[styles.iconBox, { backgroundColor: surfaceBg }]}>
              <Bell color={reminderAccent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: reminderAccent }]}>
              NHẮC VIỆC
            </Text>
            <Text style={[styles.cardValue, { color: textPrimary }]}>
              {todayRemindersCount > 0 ? `${todayRemindersCount} lời nhắc hôm nay` : 'Không có lời nhắc hôm nay'}
            </Text>
          </TouchableOpacity>

        </View>

        <View style={[styles.gridRow, { marginTop: 12 }]}>
          
          {/* CHUYỂN ĐỔI */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: converterBg, borderColor: converterBorder }]}
            onPress={() => navigation.navigate('QuickConverter')}
          >
            <View style={[styles.iconBox, { backgroundColor: surfaceBg }]}>
              <RefreshCw color={converterAccent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: converterAccent }]}>
              CHUYỂN ĐỔI
            </Text>
            <Text style={[styles.cardValue, { color: textPrimary }]}>
              Đơn vị nhanh
            </Text>
          </TouchableOpacity>

          {/* MÁY TÍNH */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            style={[styles.halfCard, { backgroundColor: calculatorBg, borderColor: calculatorBorder }]}
            onPress={() => navigation.navigate('QuickCalculator')}
          >
            <View style={[styles.iconBox, { backgroundColor: surfaceBg }]}>
              <Calculator color={calculatorAccent} size={19} {...IC} />
            </View>
            <Text style={[styles.cardLabel, styles.halfLabel, { color: calculatorAccent }]}>
              MÁY TÍNH
            </Text>
            <Text style={[styles.cardValue, { color: textPrimary }]}>
              Tính nhanh
            </Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 82, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  headerButton: { width: 48, height: 48, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerTitle: { fontFamily: F_SERIF, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  headerSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 16 },
  scrollBody: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  calendarCard: { padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  calendarTitle: { marginTop: 6, fontFamily: F_SERIF, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  calendarMeta: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  cardActionRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAction: { fontSize: 13, fontWeight: '700' },
  gridRow: { flexDirection: 'row', gap: 12 },
  halfCard: { flex: 1, minWidth: 0, minHeight: 128, padding: 14, borderWidth: 1, borderRadius: 12, justifyContent: 'space-between' },
  halfLabel: { marginTop: 8 },
  cardValue: { marginTop: 4, fontFamily: F_SERIF, fontSize: 15, lineHeight: 20, fontWeight: '700' },
});
