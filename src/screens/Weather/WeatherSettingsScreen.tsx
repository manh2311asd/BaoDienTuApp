import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, MapPin, Navigation } from 'lucide-react-native';
import {
  useAppStore,
  WeatherLocation,
} from '../../store/useAppStore';

const LOCATIONS: WeatherLocation[] = [
  { name: 'Hà Nội', latitude: 21.0285, longitude: 105.8542 },
  { name: 'TP. Hồ Chí Minh', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Đà Nẵng', latitude: 16.0544, longitude: 108.2022 },
  { name: 'Huế', latitude: 16.4637, longitude: 107.5909 },
  { name: 'Cần Thơ', latitude: 10.0452, longitude: 105.7469 },
];

const IC = { strokeWidth: 2 } as const;

export default function WeatherSettingsScreen() {
  const {
    getColors,
    weatherAutoLocation,
    weatherLocation,
    setWeatherAutoLocation,
    setWeatherLocation,
  } = useAppStore();
  const colors = getColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          NGUỒN VỊ TRÍ
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={styles.rowCopy}>
              <Navigation color={colors.text} size={20} {...IC} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Dùng vị trí hiện tại
                </Text>
                <Text style={[styles.rowDescription, { color: colors.textMuted }]}>
                  Chỉ yêu cầu GPS khi mở màn hình thời tiết.
                </Text>
              </View>
            </View>
            <Switch
              value={weatherAutoLocation}
              onValueChange={setWeatherAutoLocation}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          TỈNH THÀNH MẶC ĐỊNH
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            weatherAutoLocation && styles.disabledCard,
          ]}
        >
          {LOCATIONS.map((location, index) => {
            const selected = weatherLocation.name === location.name;
            return (
              <TouchableOpacity
                key={location.name}
                disabled={weatherAutoLocation}
                style={[
                  styles.locationRow,
                  index < LOCATIONS.length - 1 && {
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                  },
                ]}
                onPress={() => setWeatherLocation(location)}
              >
                <MapPin color={colors.textMuted} size={18} {...IC} />
                <Text style={[styles.locationName, { color: colors.text }]}>
                  {location.name}
                </Text>
                {selected && (
                  <Check color={colors.primary} size={18} {...IC} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          Khi quyền vị trí bị từ chối hoặc GPS không phản hồi, ứng dụng dùng tỉnh
          thành mặc định đã chọn. Thiết lập được lưu trên thiết bị.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 8,
  },
  disabledCard: {
    opacity: 0.5,
  },
  switchRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowDescription: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
  },
  locationRow: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    marginTop: 12,
    paddingHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
  },
});
