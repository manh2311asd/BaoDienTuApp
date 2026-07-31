import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { ArrowLeft, Star } from 'lucide-react-native';
import solarLunar from 'solarlunar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalendarMonth {
  year: number;
  month: number;
  key: string;
}

// §3 Font tokens
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const F_SANS  = Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' });
const IC = { strokeWidth: 2 } as const;

// §4 Palette
const C = {
  bg:       '#FCFBF9',
  card:     '#FFFFFF',
  border:   '#EAEAEA',
  ink:      '#111111',
  muted:    '#787774',
  danger:   '#9F2F2D',
  accent:   '#1F6C9F',
  accentBg: '#E1F3FE',
  vip:      '#956400',
  vipBg:    '#FBF3DB',
};

// Vietnam Solar Holidays mapping: "Month-Day" -> Holiday details
const SOLAR_HOLIDAYS: Record<string, { name: string; star: boolean }> = {
  '1-1': { name: 'Tết Dương Lịch', star: true },
  '4-30': { name: 'Ngày Giải phóng Miền Nam', star: true },
  '5-1': { name: 'Ngày Quốc tế Lao động', star: true },
  '5-19': { name: 'Ngày sinh Chủ tịch Hồ Chí Minh', star: false },
  '7-27': { name: 'Ngày Thương binh - Liệt sĩ', star: true },
  '8-10': { name: 'Ngày Vì nạn nhân chất độc da cam Việt Nam', star: true },
  '8-19': { name: 'Ngày Cách mạng Tháng Tám thành công', star: true },
  '9-2': { name: 'Ngày Quốc khánh Việt Nam', star: true },
  '10-10': { name: 'Ngày Giải phóng Thủ đô', star: false },
  '10-20': { name: 'Ngày Phụ nữ Việt Nam', star: false },
  '11-20': { name: 'Ngày Nhà giáo Việt Nam', star: true },
  '12-22': { name: 'Ngày thành lập QĐND Việt Nam', star: false },
};

// Vietnam Lunar Holidays mapping: "LunarMonth-LunarDay" -> Holiday details
const LUNAR_HOLIDAYS: Record<string, { name: string; star: boolean }> = {
  '1-1': { name: 'Tết Nguyên Đán', star: true },
  '1-2': { name: 'Tết Nguyên Đán (Mùng 2)', star: true },
  '1-3': { name: 'Tết Nguyên Đán (Mùng 3)', star: true },
  '1-15': { name: 'Tết Nguyên Tiêu (Rằm tháng Giêng)', star: false },
  '3-10': { name: 'Giỗ tổ Hùng Vương', star: true },
  '4-15': { name: 'Lễ Phật Đản', star: false },
  '5-5': { name: 'Tết Đoan Ngọ', star: false },
  '7-15': { name: 'Lễ Vu Lan / Rằm tháng Bảy', star: false },
  '8-15': { name: 'Tết Trung Thu (Rằm tháng Tám)', star: true },
  '12-23': { name: 'Ngày đưa ông Táo về trời', star: false },
};

const getHoliday = (day: number, month: number, year: number, lunarCal: any) => {
  const solarKey = `${month}-${day}`;
  if (SOLAR_HOLIDAYS[solarKey]) {
    return SOLAR_HOLIDAYS[solarKey];
  }
  const lMonth = lunarCal.lMonth;
  const lDay = lunarCal.lDay;
  const lunarKey = `${lMonth}-${lDay}`;
  if (LUNAR_HOLIDAYS[lunarKey]) {
    return LUNAR_HOLIDAYS[lunarKey];
  }
  return null;
};

const getYearCanChi = (lunarYear: number) => {
  const cans = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
  const chis = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];
  const can = cans[lunarYear % 10];
  const chi = chis[lunarYear % 12];
  return `${can} ${chi}`;
};

export default function CalendarScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  // Dynamic selected date: Default to TODAY (New Date)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Generate initial months from 2020 to 2030 (11 years)
  const generateInitialMonths = (): CalendarMonth[] => {
    const list: CalendarMonth[] = [];
    for (let y = 2020; y <= 2030; y++) {
      for (let m = 1; m <= 12; m++) {
        list.push({
          year: y,
          month: m,
          key: `${y}-${m}`,
        });
      }
    }
    return list;
  };

  const [months, setMonths] = useState(generateInitialMonths());

  // Calculate target initial scroll index of current selected month
  const getInitialScrollIndex = () => {
    const startYear = 2020;
    const targetYear = selectedDate.getFullYear();
    const targetMonth = selectedDate.getMonth() + 1;
    return (targetYear - startYear) * 12 + (targetMonth - 1);
  };

  const loadMoreMonths = () => {
    const lastMonth = months[months.length - 1];
    const nextList: CalendarMonth[] = [];
    const startDate = new Date(lastMonth.year, lastMonth.month, 1);
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      nextList.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      });
    }
    setMonths((prev) => [...prev, ...nextList]);
  };

  const getDayName = (date: Date) => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
  };

  const selectedLunar = solarLunar.solar2lunar(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1,
    selectedDate.getDate()
  );
  const selectedYearCanChi = getYearCanChi(selectedLunar.lYear);
  const selectedHoliday = getHoliday(
    selectedDate.getDate(),
    selectedDate.getMonth() + 1,
    selectedDate.getFullYear(),
    selectedLunar
  );

  const handleDayPress = (day: number, month: number, year: number) => {
    setSelectedDate(new Date(year, month - 1, day));
  };

  // Renders a monthly grid card
  const renderMonthCard = useCallback(({ item }: { item: CalendarMonth }) => {
    const { year, month } = item;
    const totalDays = new Date(year, month, 0).getDate();
    // Monday-based offset: 0 for Monday, 6 for Sunday
    const startOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;

    const days = [];
    const weekdayHeaders = ['Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'CN'];

    // Empty offset boxes
    for (let i = 0; i < startOffset; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayBox} />);
    }

    // Days grid
    for (let day = 1; day <= totalDays; day++) {
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() + 1 === month &&
        selectedDate.getFullYear() === year;

      const isToday =
        new Date().getDate() === day &&
        new Date().getMonth() + 1 === month &&
        new Date().getFullYear() === year;

      const lunarCal = solarLunar.solar2lunar(year, month, day);
      const lDay = lunarCal.lDay;
      const lMonth = lunarCal.lMonth;
      const isFirstLunarDay = lDay === 1;

      const holiday = getHoliday(day, month, year, lunarCal);
      const hasStar = holiday?.star === true;

      const isSunday = (startOffset + day - 1) % 7 === 6;
      const isSaturday = (startOffset + day - 1) % 7 === 5;
      
      let dayTextColor = C.ink;
      if (isSunday) dayTextColor = C.danger;
      else if (isSaturday) dayTextColor = C.accent;

      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={styles.dayBox}
          onPress={() => handleDayPress(day, month, year)}
        >
          <View
            style={[
              styles.dayCircle,
              isToday && { borderColor: C.ink, borderWidth: 1.5 },
              isSelected && { backgroundColor: C.ink },
            ]}
          >
            {/* Solar day number with conditional Star (P1.11 React Native Safe) */}
            <View style={styles.solarDayRow}>
              <Text
                style={[
                  styles.solarText,
                  { color: isSelected ? '#FFFFFF' : dayTextColor },
                  isToday && !isSelected && { color: C.ink },
                ]}
              >
                {day}
              </Text>
              {hasStar ? (
                <Star
                  fill="#F59E0B"
                  color="#F59E0B"
                  size={7}
                  style={styles.starIcon}
                />
              ) : null}
            </View>

            {/* Lunar day string */}
            <Text
              style={[
                styles.lunarText,
                { color: isSelected ? 'rgba(255,255,255,0.8)' : C.muted },
              ]}
            >
              {isFirstLunarDay ? `${lDay}/${lMonth}` : `${lDay}`}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    const totalCells = 42;
    const remaining = totalCells - days.length;
    for (let i = 0; i < remaining; i++) {
      days.push(<View key={`pad-${i}`} style={styles.dayBox} />);
    }

    const rows = [];
    let rowDays = [];

    // Header cells for weekday names
    rows.push(
      <View key="header" style={styles.weekRow}>
        {weekdayHeaders.map((h, i) => (
          <Text
            key={h}
            style={[
              styles.weekHeaderCell,
              i === 6 && { color: C.danger },
              i === 5 && { color: C.accent },
            ]}
            maxFontSizeMultiplier={1.4}
          >
            {h}
          </Text>
        ))}
      </View>
    );

    for (let i = 0; i < days.length; i++) {
      rowDays.push(days[i]);
      if (rowDays.length === 7 || i === days.length - 1) {
        rows.push(
          <View key={`row-${rows.length}`} style={styles.weekRow}>
            {rowDays}
          </View>
        );
        rowDays = [];
      }
    }

    return (
      <View style={styles.monthCard}>
        <Text style={styles.monthTitle} maxFontSizeMultiplier={1.4}>
          Tháng {month}, {year}
        </Text>
        <View style={styles.gridContainer}>{rows}</View>
      </View>
    );
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View
        style={[
          styles.headerContainer,
          { paddingTop: (insets.top > 0 ? insets.top : 12) + 8 },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={C.ink} size={22} {...IC} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} maxFontSizeMultiplier={1.4}>Lịch</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Selected Day Info Board */}
      <View style={styles.topBoard}>
        <View style={styles.todayCard}>
          <View style={styles.todayLeft}>
            <Text style={styles.todayLabel} maxFontSizeMultiplier={1.3}>DƯƠNG LỊCH</Text>
            <Text style={styles.todayBigNumber} maxFontSizeMultiplier={1.5}>
              {selectedDate.getDate()}
            </Text>
          </View>
          <View style={styles.todayRight}>
            <Text style={styles.todaySolarText} maxFontSizeMultiplier={1.4}>
              {getDayName(selectedDate)}, {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
            </Text>
            <Text style={styles.todayLunarText} maxFontSizeMultiplier={1.3}>
              Âm lịch: Ngày {selectedLunar.lDay} tháng {selectedLunar.lMonth} năm {selectedYearCanChi}
            </Text>

            {/* Display Holiday names (P1.11 React Native Safe) */}
            {selectedHoliday ? (
              <View style={[styles.holidayBadge, { backgroundColor: selectedHoliday.star ? C.vipBg : C.accentBg }]}>
                {selectedHoliday.star ? <Star fill="#F59E0B" color="#F59E0B" size={11} style={{ marginRight: 4 }} /> : null}
                <Text style={[styles.holidayText, { color: selectedHoliday.star ? C.vip : C.accent }]} maxFontSizeMultiplier={1.3}>
                  {selectedHoliday.name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* Infinite Scroll List of Month Cards */}
      <FlatList
        ref={flatListRef}
        data={months}
        renderItem={renderMonthCard}
        keyExtractor={(item) => item.key}
        initialScrollIndex={getInitialScrollIndex()}
        getItemLayout={(data, index) => ({
          length: 356,
          offset: 356 * index,
          index,
        })}
        onEndReached={loadMoreMonths}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F_SERIF,
    fontWeight: '700',
    color: C.ink,
  },
  topBoard: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  todayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
    backgroundColor: C.card,
  },
  todayLeft: {
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingRight: 16,
    marginRight: 16,
  },
  todayLabel: {
    fontFamily: F_SANS,
    fontSize: 10,
    fontWeight: '700',
    color: C.danger,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  todayBigNumber: {
    fontFamily: F_SERIF,
    fontSize: 36,
    fontWeight: '700',
    color: C.ink,
  },
  todayRight: {
    flex: 1,
    justifyContent: 'center',
  },
  todaySolarText: {
    fontFamily: F_SERIF,
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  todayLunarText: {
    fontFamily: F_SANS,
    fontSize: 13,
    color: C.muted,
  },
  holidayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  holidayText: {
    fontFamily: F_SANS,
    fontSize: 11,
    fontWeight: '700',
  },
  monthCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: C.card,
    height: 338,
  },
  monthTitle: {
    fontFamily: F_SERIF,
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 16,
    textAlign: 'center',
  },
  gridContainer: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekHeaderCell: {
    fontFamily: F_SANS,
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    width: 40,
    textAlign: 'center',
  },
  dayBox: {
    width: '14.28%',
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircle: {
    width: '88%',
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solarDayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 1,
  },
  solarText: {
    fontFamily: F_SANS,
    fontSize: 13,
    fontWeight: '700',
  },
  starIcon: {
    marginLeft: 1,
    marginTop: -2,
  },
  lunarText: {
    fontFamily: F_SANS,
    fontSize: 9,
    fontWeight: '500',
  },
});
