import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Share2, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

const STORAGE_KEY = '@BaoDienTu:utilities:dayCounters';
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

export interface DayCounter {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
}

const PRESETS = ['Kỳ thi', 'Sinh nhật', 'Ngày đi du lịch', 'Deadline'];

export default function DayCounterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const dark = themeMode === 'dark';

  const [counters, setCounters] = useState<DayCounter[]>([]);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Styling based on Theme & Peach accent
  const canvasBg = dark ? '#1C1615' : '#FFF9F6';
  const cardBg = dark ? '#2D211F' : '#FFF0EA';
  const inputBg = dark ? '#382A27' : '#FFEBE4';
  const accentColor = '#D66552';
  const borderColor = dark ? '#43312E' : '#FFD9CC';

  useEffect(() => {
    loadCounters();
  }, []);

  const loadCounters = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCounters(JSON.parse(raw));
      }
    } catch (e) {
      console.error('Failed to load day counters', e);
    }
  };

  const saveCounters = async (updated: DayCounter[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setCounters(updated);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu.');
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên sự kiện.');
      return;
    }

    const dVal = parseInt(day, 10);
    const mVal = parseInt(month, 10);
    const yVal = parseInt(year, 10);

    if (isNaN(dVal) || isNaN(mVal) || isNaN(yVal) || dVal < 1 || dVal > 31 || mVal < 1 || mVal > 12 || yVal < 2000) {
      Alert.alert('Thông báo', 'Ngày tháng năm không hợp lệ.');
      return;
    }

    // Verify Date exists
    const dateStr = `${yVal}-${String(mVal).padStart(2, '0')}-${String(dVal).padStart(2, '0')}`;
    const testDate = new Date(dateStr);
    if (isNaN(testDate.getTime())) {
      Alert.alert('Thông báo', 'Ngày đã chọn không tồn tại.');
      return;
    }

    if (editingId) {
      const updated = counters.map((c) =>
        c.id === editingId ? { ...c, title: title.trim(), targetDate: dateStr } : c
      );
      saveCounters(updated);
      setEditingId(null);
    } else {
      const newCounter: DayCounter = {
        id: Math.random().toString(36).substring(2, 9),
        title: title.trim(),
        targetDate: dateStr,
        createdAt: new Date().toISOString(),
      };
      saveCounters([newCounter, ...counters]);
    }

    // Reset inputs
    setTitle('');
    setDay('');
    setMonth('');
    setYear('');
  };

  const handleEdit = (item: DayCounter) => {
    setEditingId(item.id);
    setTitle(item.title);
    const parts = item.targetDate.split('-');
    setYear(parts[0]);
    setMonth(String(parseInt(parts[1], 10)));
    setDay(String(parseInt(parts[2], 10)));
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa mốc thời gian này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          const updated = counters.filter((c) => c.id !== id);
          saveCounters(updated);
        },
      },
    ]);
  };

  const handleShare = async (item: DayCounter, daysDiff: number, isUpcoming: boolean) => {
    try {
      const text = isUpcoming
        ? `Đếm ngược sự kiện "${item.title}": Còn đúng ${daysDiff} ngày nữa (ngày ${formatVnDate(item.targetDate)}). Theo dõi cùng tôi nhé!`
        : `Sự kiện "${item.title}" đã diễn ra được ${daysDiff} ngày (từ ngày ${formatVnDate(item.targetDate)}).`;
      await Share.share({ message: text });
    } catch (e) {
      // Ignored
    }
  };

  const handleRemindMe = (item: DayCounter) => {
    // Navigate to Reminders with parameters to preset values
    navigation.navigate('Reminders', {
      title: `Nhắc việc: ${item.title}`,
      date: item.targetDate,
    });
  };

  const formatVnDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getVnFullDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
      const dayName = days[date.getDay()];
      return `${dayName}, ${date.getDate()} tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
    } catch {
      return '';
    }
  };

  // Calculate day difference
  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / msPerDay);
    return diffDays;
  };

  const upcomingCounters: { item: DayCounter; diff: number }[] = [];
  const pastCounters: { item: DayCounter; diff: number }[] = [];

  counters.forEach((c) => {
    const diff = getDaysDiff(c.targetDate);
    if (diff >= 0) {
      upcomingCounters.push({ item: c, diff });
    } else {
      pastCounters.push({ item: c, diff: Math.abs(diff) });
    }
  });

  // Sort upcoming ascending, past descending
  upcomingCounters.sort((a, b) => a.diff - b.diff);
  pastCounters.sort((a, b) => a.diff - b.diff);

  return (
    <View style={[styles.root, { backgroundColor: canvasBg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={shell.appTextPrimary} size={24} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>Đếm ngày</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* Creator section */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: shell.appTextPrimary }]}>
            {editingId ? 'Sửa mốc ngày đã chọn' : 'Bạn đang chờ ngày nào?'}
          </Text>

          <TextInput
            placeholder="Tên sự kiện (Ví dụ: Thi cuối kỳ...)"
            placeholderTextColor={dark ? '#776562' : '#A99692'}
            style={[styles.input, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
            value={title}
            onChangeText={setTitle}
          />

          {/* Preset Buttons */}
          <View style={styles.presetsRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.presetBtn, { backgroundColor: inputBg }]}
                onPress={() => setTitle(p)}
              >
                <Text style={{ fontSize: 11, color: accentColor, fontWeight: '600' }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Picker Manual Inputs */}
          <View style={styles.dateInputRow}>
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: shell.appTextSecondary }]}>Ngày</Text>
              <TextInput
                placeholder="DD"
                placeholderTextColor={dark ? '#776562' : '#A99692'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={day}
                onChangeText={setDay}
              />
            </View>
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: shell.appTextSecondary }]}>Tháng</Text>
              <TextInput
                placeholder="MM"
                placeholderTextColor={dark ? '#776562' : '#A99692'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={month}
                onChangeText={setMonth}
              />
            </View>
            <View style={styles.dateCol}>
              <Text style={[styles.dateLabel, { color: shell.appTextSecondary }]}>Năm</Text>
              <TextInput
                placeholder="YYYY"
                placeholderTextColor={dark ? '#776562' : '#A99692'}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.largeInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={year}
                onChangeText={setYear}
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingId ? 'Cập nhật' : 'Lưu sự kiện'}</Text>
            </TouchableOpacity>
            {editingId && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: accentColor }]}
                onPress={() => {
                  setEditingId(null);
                  setTitle('');
                  setDay('');
                  setMonth('');
                  setYear('');
                }}
              >
                <Text style={{ color: accentColor, fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section List: SẮP TỚI */}
        <Text style={[styles.sectionHeading, { color: accentColor }]}>SẮP TỚI</Text>
        {upcomingCounters.length === 0 ? (
          <Text style={[styles.emptyText, { color: shell.appTextMuted }]}>Không có sự kiện sắp tới.</Text>
        ) : (
          upcomingCounters.map(({ item, diff }) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: shell.appSurface, borderColor }]}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: shell.appTextPrimary }]}>{item.title}</Text>
                  <Text style={[styles.itemDateText, { color: shell.appTextSecondary }]}>
                    {getVnFullDate(item.targetDate)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: cardBg }]}>
                  <Text style={[styles.badgeText, { color: accentColor }]}>
                    Còn {diff} ngày
                  </Text>
                </View>
              </View>

              <View style={[styles.itemActions, { borderTopColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                  <Text style={[styles.actionBtnText, { color: shell.appTextSecondary }]}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionBtnText, { color: shell.appError || '#B44449' }]}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemindMe(item)}>
                  <Bell size={13} color={shell.appTextSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: shell.appTextSecondary }]}>Nhắc tôi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item, diff, true)}>
                  <Share2 size={13} color={shell.appTextSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: shell.appTextSecondary }]}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Section List: ĐÃ QUA */}
        <Text style={[styles.sectionHeading, { color: shell.appTextSecondary, marginTop: 24 }]}>ĐÃ QUA</Text>
        {pastCounters.length === 0 ? (
          <Text style={[styles.emptyText, { color: shell.appTextMuted }]}>Không có sự kiện đã qua.</Text>
        ) : (
          pastCounters.map(({ item, diff }) => (
            <View key={item.id} style={[styles.itemCard, { backgroundColor: shell.appSurface, borderColor, opacity: 0.8 }]}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: shell.appTextPrimary }]}>{item.title}</Text>
                  <Text style={[styles.itemDateText, { color: shell.appTextSecondary }]}>
                    {getVnFullDate(item.targetDate)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: dark ? '#292524' : '#F1EBE6' }]}>
                  <Text style={[styles.badgeText, { color: shell.appTextSecondary }]}>
                    Đã qua {diff} ngày
                  </Text>
                </View>
              </View>

              <View style={[styles.itemActions, { borderTopColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                  <Text style={[styles.actionBtnText, { color: shell.appTextSecondary }]}>Sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionBtnText, { color: shell.appError || '#B44449' }]}>Xóa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item, diff, false)}>
                  <Share2 size={13} color={shell.appTextSecondary} style={{ marginRight: 4 }} />
                  <Text style={[styles.actionBtnText, { color: shell.appTextSecondary }]}>Chia sẻ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: F_SERIF,
    marginLeft: 8,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  smallInput: {
    height: 44,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  largeInput: {
    height: 44,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    marginBottom: 16,
  },
  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemDateText: {
    fontSize: 11.5,
    marginTop: 4,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  itemActions: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
