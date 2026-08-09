import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Bell, BellOff, Calendar, Clock, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

const REMINDERS_KEY = '@BaoDienTu:utilities:reminders';
const PERMISSION_KEY = '@BaoDienTu:utilities:notificationPermission';
const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  repeat: 'none' | 'daily' | 'weekly';
  createdAt: string;
}

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Không lặp lại' },
  { value: 'daily', label: 'Hàng ngày' },
  { value: 'weekly', label: 'Hàng tuần' },
] as const;

export default function RemindersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const dark = themeMode === 'dark';

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');

  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');

  // Styling based on Sage theme
  const canvasBg = dark ? '#141715' : '#F6F9F6';
  const cardBg = dark ? '#1E2521' : '#EBF2EB';
  const inputBg = dark ? '#28322C' : '#DCEDDC';
  const accentColor = '#477A5E';
  const borderColor = dark ? '#2B3B32' : '#C7DEC7';

  useEffect(() => {
    loadRemindersAndPermission();
    
    // Parse route params if passed from Day Counter
    if (route.params?.title) {
      setTitle(route.params.title);
    }
    if (route.params?.date) {
      const parts = route.params.date.split('-');
      setYear(parts[0]);
      setMonth(String(parseInt(parts[1], 10)));
      setDay(String(parseInt(parts[2], 10)));
    }
  }, [route.params]);

  const loadRemindersAndPermission = async () => {
    try {
      const storedReminders = await AsyncStorage.getItem(REMINDERS_KEY);
      if (storedReminders) {
        setReminders(JSON.parse(storedReminders));
      }
      const storedPermission = await AsyncStorage.getItem(PERMISSION_KEY);
      if (storedPermission) {
        setPermission(storedPermission as any);
      }
    } catch (e) {
      console.error('Failed to load reminders or permission', e);
    }
  };

  const savePermission = async (status: 'granted' | 'denied') => {
    try {
      await AsyncStorage.setItem(PERMISSION_KEY, status);
      setPermission(status);
    } catch (e) {
      // Ignored
    }
  };

  const handleRequestPermission = () => {
    Alert.alert(
      'Quyền thông báo',
      'NewsDaily muốn gửi thông báo lời nhắc học tập và công việc cho bạn.',
      [
        {
          text: 'Từ chối',
          onPress: () => savePermission('denied'),
          style: 'cancel',
        },
        {
          text: 'Cho phép',
          onPress: () => savePermission('granted'),
        },
      ]
    );
  };

  const handleSave = async () => {
    // 1. Check/request permission on first reminder creation
    if (permission === 'default') {
      handleRequestPermission();
      return;
    }

    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung lời nhắc.');
      return;
    }

    const dVal = parseInt(day, 10);
    const mVal = parseInt(month, 10);
    const yVal = parseInt(year, 10);
    const hVal = parseInt(hour, 10);
    const minVal = parseInt(minute, 10);

    if (
      isNaN(dVal) || isNaN(mVal) || isNaN(yVal) ||
      isNaN(hVal) || isNaN(minVal) ||
      dVal < 1 || dVal > 31 || mVal < 1 || mVal > 12 || yVal < 2000 ||
      hVal < 0 || hVal > 23 || minVal < 0 || minVal > 59
    ) {
      Alert.alert('Thông báo', 'Ngày/Giờ nhập vào không hợp lệ.');
      return;
    }

    const dateStr = `${yVal}-${String(mVal).padStart(2, '0')}-${String(dVal).padStart(2, '0')}`;
    const timeStr = `${String(hVal).padStart(2, '0')}:${String(minVal).padStart(2, '0')}`;

    const newReminder: Reminder = {
      id: Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      date: dateStr,
      time: timeStr,
      repeat,
      createdAt: new Date().toISOString(),
    };

    const updated = [newReminder, ...reminders];
    try {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      setReminders(updated);
      Alert.alert('Thành công', 'Đã lưu lời nhắc thành công.');
      
      // Reset inputs
      setTitle('');
      setDay('');
      setMonth('');
      setYear('');
      setHour('');
      setMinute('');
      setRepeat('none');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu lời nhắc.');
    }
  };

  const handleDelete = async (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    try {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      setReminders(updated);
    } catch (e) {
      // Ignored
    }
  };

  const handleOpenSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert('Thông báo', 'Vui lòng mở Cài đặt thiết bị > Thông báo > Cho phép ứng dụng NewsDaily.');
    });
  };

  const formatVnDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getRepeatLabel = (value: Reminder['repeat']) => {
    return REPEAT_OPTIONS.find((opt) => opt.value === value)?.label || 'Không';
  };

  return (
    <View style={[styles.root, { backgroundColor: canvasBg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={shell.appTextPrimary} size={24} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>Nhắc việc</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* Permission Notification Warning Banner */}
        {permission === 'denied' && (
          <View style={[styles.warningBanner, { backgroundColor: dark ? '#2D1F20' : '#FCE8E6', borderColor: '#EE8990' }]}>
            <BellOff color="#B44449" size={20} {...IC} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: dark ? '#EE8990' : '#B44449' }}>
                Thông báo đang tắt. Bạn vẫn có thể lưu lời nhắc.
              </Text>
            </View>
            <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: '#B44449' }]} onPress={handleOpenSettings}>
              <Text style={styles.settingsBtnText}>Mở cài đặt</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Creator Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: shell.appTextPrimary }]}>Tạo lời nhắc mới</Text>

          <TextInput
            placeholder="Nội dung nhắc nhở..."
            placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
            style={[styles.input, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
            value={title}
            onChangeText={setTitle}
          />

          {/* Date Picker Row */}
          <Text style={[styles.sectionLabel, { color: shell.appTextSecondary }]}>Ngày nhắc</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <TextInput
                placeholder="Ngày"
                placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={day}
                onChangeText={setDay}
              />
            </View>
            <View style={styles.pickerCol}>
              <TextInput
                placeholder="Tháng"
                placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={month}
                onChangeText={setMonth}
              />
            </View>
            <View style={styles.pickerCol2}>
              <TextInput
                placeholder="Năm"
                placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
                keyboardType="number-pad"
                maxLength={4}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={year}
                onChangeText={setYear}
              />
            </View>
          </View>

          {/* Time Picker Row */}
          <Text style={[styles.sectionLabel, { color: shell.appTextSecondary }]}>Giờ nhắc (24h)</Text>
          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <TextInput
                placeholder="Giờ"
                placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={hour}
                onChangeText={setHour}
              />
            </View>
            <View style={styles.pickerCol}>
              <TextInput
                placeholder="Phút"
                placeholderTextColor={dark ? '#6E7C73' : '#8FA496'}
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.smallInput, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
                value={minute}
                onChangeText={setMinute}
              />
            </View>
          </View>

          {/* Repeat Row */}
          <Text style={[styles.sectionLabel, { color: shell.appTextSecondary }]}>Tần suất lặp</Text>
          <View style={styles.repeatRow}>
            {REPEAT_OPTIONS.map((opt) => {
              const active = repeat === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.repeatBtn,
                    {
                      backgroundColor: active ? accentColor : inputBg,
                      borderColor: active ? accentColor : borderColor,
                    },
                  ]}
                  onPress={() => setRepeat(opt.value)}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: active ? '#FFF' : dark ? shell.appTextPrimary : accentColor,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accentColor }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Lưu lời nhắc</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders List */}
        <Text style={[styles.listHeading, { color: accentColor }]}>LỜI NHẮC ĐÃ LƯU</Text>
        {reminders.length === 0 ? (
          <Text style={[styles.emptyText, { color: shell.appTextMuted }]}>Chưa tạo lời nhắc nào.</Text>
        ) : (
          reminders.map((item) => (
            <View key={item.id} style={[styles.reminderCard, { backgroundColor: shell.appSurface, borderColor }]}>
              <View style={styles.reminderContent}>
                <View style={styles.iconBox}>
                  <Bell color={accentColor} size={18} {...IC} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reminderTitle, { color: shell.appTextPrimary }]}>{item.title}</Text>
                  <View style={styles.reminderMetaRow}>
                    <View style={styles.metaBadge}>
                      <Calendar size={11} color={shell.appTextSecondary} style={{ marginRight: 3 }} />
                      <Text style={[styles.metaText, { color: shell.appTextSecondary }]}>
                        {formatVnDate(item.date)}
                      </Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Clock size={11} color={shell.appTextSecondary} style={{ marginRight: 3 }} />
                      <Text style={[styles.metaText, { color: shell.appTextSecondary }]}>{item.time}</Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Text style={[styles.metaText, { color: accentColor, fontWeight: '700' }]}>
                        {getRepeatLabel(item.repeat)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Trash2 color={shell.appError || '#B44449'} size={18} {...IC} />
              </TouchableOpacity>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  settingsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  settingsBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
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
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pickerCol: {
    flex: 1,
  },
  pickerCol2: {
    flex: 1.5,
  },
  smallInput: {
    height: 40,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  repeatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  repeatBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
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
  listHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  reminderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(71, 122, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  reminderTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 19,
  },
  reminderMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});
