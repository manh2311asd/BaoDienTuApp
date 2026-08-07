import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { ArrowLeft, Settings, RotateCw, CloudSun, Sun, Cloud, CloudRain, HelpCircle, MapPin, Clock, Calendar } from 'lucide-react-native';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appTheme, utilityThemes } from '../../theme/colors';

const F_SRF  = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const W_SUNNY = appTheme.light.appWarning;
const W_CLOUDY = appTheme.light.appTextSecondary;
const W_RAIN = utilityThemes.weather.accent;
const W_STORM = utilityThemes.calendar.accent;
const IC = { strokeWidth: 2 } as const;

interface WeatherData {
  timestamp: number;
  locationName: string;
  temp: number;
  state: string;
  max: number;
  min: number;
  hourly: { time: string; temp: number; code: number }[];
  daily: { day: string; tempMax: number; tempMin: number; code: number }[];
  aqi?: number;
}

const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

const getWeatherStateName = (code: number) => {
  if (code === 0) return 'Trời quang';
  if (code >= 1 && code <= 3) return 'Nhiều mây';
  if (code === 45 || code === 48) return 'Sương mù';
  if (code >= 51 && code <= 55) return 'Mưa phùn';
  if (code >= 61 && code <= 65) return 'Có mưa';
  if (code >= 80 && code <= 82) return 'Mưa rào';
  if (code >= 95 && code <= 99) return 'Có dông';
  return 'Không xác định';
};

const getWeatherIcon = (code: number, size = 24) => {
  if (code === 0) return <Sun color={W_SUNNY} size={size} {...IC} />;
  if (code >= 1 && code <= 3) return <CloudSun color={W_CLOUDY} size={size} {...IC} />;
  if (code === 45 || code === 48) return <Cloud color={W_CLOUDY} size={size} {...IC} />;
  if (code >= 51 && code <= 55) return <CloudRain color={W_RAIN} size={size} {...IC} />;
  if (code >= 61 && code <= 65) return <CloudRain color={W_RAIN} size={size} {...IC} />;
  if (code >= 80 && code <= 82) return <CloudRain color={W_RAIN} size={size} {...IC} />;
  if (code >= 95 && code <= 99) return <CloudRain color={W_STORM} size={size} {...IC} />;
  return <Cloud color={W_CLOUDY} size={size} {...IC} />;
};

const getAqiLabel = (aqi: number) => {
  if (aqi <= 50) return 'Tốt';
  if (aqi <= 100) return 'Trung bình';
  if (aqi <= 150) return 'Kém';
  if (aqi <= 200) return 'Xấu';
  return 'Rất xấu';
};

const WeatherScreen = ({ navigation }: any) => {
  const { getColors, themeMode, weatherAutoLocation, weatherLocation } = useAppStore();
  const colors = getColors();
  const shell = appTheme[themeMode];
  const weatherCanvas = themeMode === 'dark' ? shell.appBackground : utilityThemes.weather.canvas;
  const weatherHeader = themeMode === 'dark' ? shell.appHeader : utilityThemes.weather.header;
  const insets = useSafeAreaInsets();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const [isStale, setIsStale] = useState(false);

  const loadWeather = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');
    setIsStale(false);

    const cacheIdentity = weatherAutoLocation
      ? 'auto'
      : `${weatherLocation.latitude},${weatherLocation.longitude}`;
    const cacheKey = `@BaoDienTu:weather_cache:${cacheIdentity}`;
    let cachedData: WeatherData | null = null;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        cachedData = JSON.parse(cached) as WeatherData;
        const age = Date.now() - cachedData.timestamp;
        if (!forceRefresh && age < CACHE_EXPIRY_MS) {
          setWeatherData(cachedData);
          return;
        }
      }

      let lat = weatherLocation.latitude;
      let lon = weatherLocation.longitude;
      let city = weatherLocation.name;

      if (weatherAutoLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const loc = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise<never>((_, reject) => {
                setTimeout(
                  () => reject(new Error('Location request timed out')),
                  5000
                );
              }),
            ]);
            lat = loc.coords.latitude;
            lon = loc.coords.longitude;
            const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            if (geo && geo[0]) {
              city = geo[0].city || geo[0].region || geo[0].subregion || 'Vị trí hiện tại';
            }
          } catch {
            city = `${weatherLocation.name} (mặc định)`;
          }
        } else {
          city = `${weatherLocation.name} (mặc định)`;
        }
      }

      const [response, airQualityResponse] = await Promise.all([
        axios.get(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        ),
        axios
          .get(
            `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi&timezone=auto`
          )
          .catch(() => null),
      ]);

      const data = response.data;
      const currentHourKey = String(data.current.time).slice(0, 13);
      const currentHourIndex = Math.max(
        0,
        data.hourly.time.findIndex((time: string) =>
          time.startsWith(currentHourKey)
        )
      );

      const hourly = [];
      for (let i = 0; i < 12; i++) {
        const idx = currentHourIndex + i;
        const timeStr = String(data.hourly.time[idx] || '').slice(11, 16);
        const tempVal = Math.round(
          data.hourly.temperature_2m[idx] ?? data.current.temperature_2m
        );
        const codeVal =
          data.hourly.weather_code[idx] ?? data.current.weather_code;
        hourly.push({
          time: timeStr || '--:--',
          temp: tempVal,
          code: codeVal,
        });
      }

      const daily = [];
      const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

      for (let i = 0; i < 6; i++) {
        const date = new Date(`${data.daily.time[i]}T12:00:00`);
        const dayLabel = i === 0 ? 'Hôm nay' : daysOfWeek[date.getDay()];
        const maxVal = Math.round(data.daily.temperature_2m_max[i]);
        const minVal = Math.round(data.daily.temperature_2m_min[i]);
        const codeVal = data.daily.weather_code[i];
        daily.push({
          day: dayLabel,
          tempMax: maxVal,
          tempMin: minVal,
          code: codeVal,
        });
      }

      const fetchedData: WeatherData = {
        timestamp: Date.now(),
        locationName: city,
        temp: Math.round(data.current.temperature_2m),
        state: getWeatherStateName(data.current.weather_code),
        max: Math.round(data.daily.temperature_2m_max[0]),
        min: Math.round(data.daily.temperature_2m_min[0]),
        hourly,
        daily,
        aqi: airQualityResponse?.data?.current?.us_aqi,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(fetchedData));
      setWeatherData(fetchedData);

    } catch {
      if (cachedData) {
        setWeatherData(cachedData);
        setIsStale(true);
        setError('Không thể cập nhật. Đang hiển thị dữ liệu đã lưu gần nhất.');
      } else {
        setWeatherData(null);
        setError('Không thể tải thời tiết. Vui lòng kiểm tra kết nối mạng.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [weatherAutoLocation, weatherLocation]);

  useEffect(() => {
    loadWeather(false);
  }, [loadWeather]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!weatherData) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorState}>
          <Cloud color={colors.textMuted} size={42} {...IC} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.text }]}
            onPress={() => loadWeather(true)}
          >
            <Text style={[styles.retryButtonText, { color: colors.background }]}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: weatherCanvas }]}>
      <StatusBar barStyle="light-content" backgroundColor={weatherHeader} />
      {/* Header bar with safe top inset padding */}
      <View style={[
        styles.headerContainer, 
        { 
          borderBottomColor: shell.appBorder,
          backgroundColor: weatherHeader,
          paddingTop: (insets.top > 0 ? insets.top : 12) + 8,
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ArrowLeft color={shell.appHeaderText} size={22} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appHeaderText }]}>Thời tiết</Text>
        <View style={styles.headerRightBtns}>
          <TouchableOpacity onPress={() => loadWeather(true)} style={[styles.headerBtn, { marginRight: 12 }]} disabled={isRefreshing}>
            <RotateCw color={shell.appHeaderText} size={22} {...IC} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('WeatherSettings')}
            style={styles.headerBtn}
          >
            <Settings color={shell.appHeaderText} size={22} {...IC} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isStale && (
          <View style={styles.staleBanner}>
            <Text style={styles.staleText}>{error}</Text>
          </View>
        )}
        {/* Location Display */}
        <View style={styles.locationContainer}>
          <MapPin color={utilityThemes.weather.accent} size={22} style={{ marginRight: 6 }} {...IC} />
          <Text style={[styles.locationName, { color: colors.text }]}>
            {weatherData?.locationName}
          </Text>
        </View>

        {/* Temperature & State display */}
        <View style={styles.tempSection}>
          <View style={styles.tempRow}>
            {weatherData && getWeatherIcon(weatherData.hourly[0]?.code || 0, 60)}
            <Text style={[styles.tempText, { color: colors.text }]}>{weatherData?.temp}°</Text>
          </View>
          <Text style={[styles.weatherStateText, { color: colors.text }]}>
            {weatherData?.state}
          </Text>
          
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeText, { color: colors.textMuted }]}>
              Cao: {weatherData?.max}°   Thấp: {weatherData?.min}°
            </Text>
          </View>

          {typeof weatherData.aqi === 'number' && (
            <View style={styles.aqiRow}>
              <Text style={[styles.aqiLabel, { color: colors.textMuted }]}>Không khí: </Text>
              <HelpCircle color={colors.textMuted} size={14} style={{ marginRight: 6 }} {...IC} />
              <View style={styles.aqiValueBadge}>
                <Text style={styles.aqiValueText}>
                  {Math.round(weatherData.aqi)} ({getAqiLabel(weatherData.aqi)})
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section: Hourly Forecast (Plain clean section with top border to match Image 2) */}
        <View style={[styles.plainSection, { borderTopColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Clock color={colors.textMuted} size={18} style={{ marginRight: 8 }} {...IC} />
            <Text style={[styles.sectionTitleText, { color: colors.text }]}>Theo giờ</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyScroll}>
            {weatherData?.hourly.map((h, index) => (
              <View key={index} style={styles.hourlyItem}>
                <Text style={[styles.hourlyTime, { color: colors.textMuted }]}>{h.time}</Text>
                <View style={styles.hourlyIconWrapper}>
                  {getWeatherIcon(h.code, 24)}
                </View>
                <Text style={[styles.hourlyTemp, { color: colors.text }]}>{h.temp}°</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Section: Daily Forecast (Plain clean section with top border to match Image 2) */}
        <View style={[styles.plainSection, { borderTopColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Calendar color={colors.textMuted} size={18} style={{ marginRight: 8 }} {...IC} />
            <Text style={[styles.sectionTitleText, { color: colors.text }]}>Theo ngày</Text>
          </View>
          <View style={styles.dailyContainer}>
            {weatherData?.daily.map((d, index) => (
              <View key={index} style={[styles.dailyRow, index < weatherData.daily.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                <Text style={[styles.dailyDay, { color: colors.text }]}>{d.day}</Text>
                <View style={styles.dailyRight}>
                  {getWeatherIcon(d.code, 24)}
                  <Text style={[styles.dailyTempText, { color: colors.text }]}>
                    {d.tempMax}° / {d.tempMin}°
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footnote Source */}
        <View style={styles.footnoteContainer}>
          <Text style={[styles.footnoteText, { color: colors.textMuted }]}>
            Nguồn: weather.com
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

export default WeatherScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 14,
    maxWidth: 300,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 16,
    minHeight: 40,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 5,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  staleBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    backgroundColor: appTheme.light.appYellowContainer,
  },
  staleText: {
    color: appTheme.light.appWarning,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: F_SRF,   // A4: editorial serif headings
    fontWeight: '700',
  },
  headerRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  locationName: {
    fontSize: 26,
    fontFamily: F_SRF,   // A4: serif location name → editorial feel
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tempSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempText: {
    fontSize: 72,
    fontWeight: '300',
  },
  weatherStateText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  rangeRow: {
    marginTop: 4,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  aqiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: appTheme.light.appSurfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,     // A3 FIX: pill(20)→crisp(6)
  },
  aqiLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  aqiValueBadge: {
    backgroundColor: appTheme.light.appSuccess,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,     // A3 FIX: no pill
  },
  aqiValueText: {
    color: appTheme.light.appHeaderText,
    fontSize: 11,
    fontWeight: '800',
  },
  plainSection: {
    borderTopWidth: 1,
    paddingVertical: 18,
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  hourlyScroll: {
    paddingRight: 10,
  },
  hourlyItem: {
    alignItems: 'center',
    marginRight: 22,
    width: 50,
  },
  hourlyTime: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  hourlyIconWrapper: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  hourlyTemp: {
    fontSize: 14,
    fontWeight: '700',
  },
  dailyContainer: {
    width: '100%',
  },
  dailyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dailyDay: {
    fontSize: 14,
    fontWeight: '600',
  },
  dailyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    justifyContent: 'space-between',
  },
  dailyTempText: {
    fontSize: 14,
    fontWeight: '700',
    width: 65,
    textAlign: 'right',
  },
  footnoteContainer: {
    alignItems: 'flex-end',
    marginTop: 14,
    paddingRight: 4,
  },
  footnoteText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
