import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { ArrowLeft, RefreshCw, ChevronDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

type Category = 'length' | 'mass' | 'temp' | 'capacity' | 'speed';

interface UnitOption {
  value: string;
  label: string;
}

const CATEGORIES = [
  { value: 'length', label: 'Độ dài' },
  { value: 'mass', label: 'Khối lượng' },
  { value: 'temp', label: 'Nhiệt độ' },
  { value: 'capacity', label: 'Dung lượng' },
  { value: 'speed', label: 'Tốc độ' },
] as const;

const UNITS: Record<Category, UnitOption[]> = {
  length: [
    { value: 'mm', label: 'Milimet (mm)' },
    { value: 'cm', label: 'Centimet (cm)' },
    { value: 'm', label: 'Met (m)' },
    { value: 'km', label: 'Kilomet (km)' },
    { value: 'inch', label: 'Inch (in)' },
    { value: 'ft', label: 'Feet (ft)' },
    { value: 'mile', label: 'Mile (mi)' },
  ],
  mass: [
    { value: 'g', label: 'Gram (g)' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'lb', label: 'Pound (lb)' },
  ],
  temp: [
    { value: 'C', label: 'Độ C (°C)' },
    { value: 'F', label: 'Độ F (°F)' },
    { value: 'K', label: 'Kelvin (K)' },
  ],
  capacity: [
    { value: 'KB', label: 'Kilobyte (KB)' },
    { value: 'MB', label: 'Megabyte (MB)' },
    { value: 'GB', label: 'Gigabyte (GB)' },
    { value: 'TB', label: 'Terabyte (TB)' },
  ],
  speed: [
    { value: 'kmh', label: 'Kilomet/giờ (km/h)' },
    { value: 'ms', label: 'Met/giây (m/s)' },
    { value: 'mph', label: 'Dặm/giờ (mph)' },
  ],
};

// Length base is meter (m)
const LENGTH_FACTORS: Record<string, number> = {
  m: 1.0,
  mm: 0.001,
  cm: 0.01,
  km: 1000.0,
  inch: 0.0254,
  ft: 0.3048,
  mile: 1609.344,
};

// Mass base is kilogram (kg)
const MASS_FACTORS: Record<string, number> = {
  kg: 1.0,
  g: 0.001,
  lb: 0.45359237,
};

// Capacity base is KB
const CAPACITY_FACTORS: Record<string, number> = {
  KB: 1.0,
  MB: 1024.0,
  GB: 1024.0 * 1024.0,
  TB: 1024.0 * 1024.0 * 1024.0,
};

// Speed base is km/h
const SPEED_FACTORS: Record<string, number> = {
  kmh: 1.0,
  ms: 3.6,
  mph: 1.609344,
};

const convertTemperature = (val: number, from: string, to: string): number => {
  let tempC = 0;
  if (from === 'C') tempC = val;
  else if (from === 'F') tempC = ((val - 32) * 5) / 9;
  else if (from === 'K') tempC = val - 273.15;

  if (to === 'C') return tempC;
  if (to === 'F') return (tempC * 9) / 5 + 32;
  if (to === 'K') return tempC + 273.15;
  return val;
};

export default function QuickConverterScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const dark = themeMode === 'dark';

  const [category, setCategory] = useState<Category>('length');
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('km');
  const [toUnit, setToUnit] = useState('mile');
  const [result, setResult] = useState('');

  // Dropdown states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'category' | 'from' | 'to'>('category');

  // Styling based on Blue-Gray theme
  const canvasBg = dark ? '#131617' : '#F2F6F8';
  const cardBg = dark ? '#1D2326' : '#E6ECEF';
  const inputBg = dark ? '#283236' : '#D5E1E6';
  const accentColor = '#4F6870';
  const borderColor = dark ? '#2D393E' : '#C4D4D9';

  // Automatically reset units when category changes
  useEffect(() => {
    const opts = UNITS[category];
    if (opts.length >= 2) {
      setFromUnit(opts[0].value);
      setToUnit(opts[1].value);
    }
  }, [category]);

  const performConversion = useCallback(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      setResult('---');
      return;
    }

    if (fromUnit === toUnit) {
      setResult(num.toString());
      return;
    }

    let calculated = 0;

    if (category === 'length') {
      const fromFactor = LENGTH_FACTORS[fromUnit];
      const toFactor = LENGTH_FACTORS[toUnit];
      calculated = (num * fromFactor) / toFactor;
    } else if (category === 'mass') {
      const fromFactor = MASS_FACTORS[fromUnit];
      const toFactor = MASS_FACTORS[toUnit];
      calculated = (num * fromFactor) / toFactor;
    } else if (category === 'capacity') {
      const fromFactor = CAPACITY_FACTORS[fromUnit];
      const toFactor = CAPACITY_FACTORS[toUnit];
      calculated = (num * fromFactor) / toFactor;
    } else if (category === 'speed') {
      const fromFactor = SPEED_FACTORS[fromUnit];
      const toFactor = SPEED_FACTORS[toUnit];
      calculated = (num * fromFactor) / toFactor;
    } else if (category === 'temp') {
      calculated = convertTemperature(num, fromUnit, toUnit);
    }

    // Format the number beautifully: limit decimal places
    if (Math.abs(calculated) < 0.000001) {
      setResult(calculated.toExponential(5));
    } else {
      setResult(String(Number(calculated.toFixed(6))));
    }
  }, [category, fromUnit, inputValue, toUnit]);

  useEffect(() => {
    performConversion();
  }, [performConversion]);

  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const openSelectModal = (type: typeof modalType) => {
    setModalType(type);
    setShowModal(true);
  };

  const handleModalSelect = (val: string) => {
    if (modalType === 'category') {
      setCategory(val as Category);
    } else if (modalType === 'from') {
      setFromUnit(val);
    } else {
      setToUnit(val);
    }
    setShowModal(false);
  };

  const getActiveOptions = () => {
    if (modalType === 'category') {
      return CATEGORIES;
    }
    return UNITS[category];
  };

  const getLabel = (type: 'category' | 'from' | 'to') => {
    if (type === 'category') {
      return CATEGORIES.find((cat) => cat.value === category)?.label || '';
    }
    const val = type === 'from' ? fromUnit : toUnit;
    return UNITS[category].find((opt) => opt.value === val)?.label || val;
  };

  return (
    <View style={[styles.root, { backgroundColor: canvasBg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={shell.appTextPrimary} size={24} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>Chuyển đổi</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
        {/* Category selector */}
        <Text style={[styles.sectionHeading, { color: accentColor }]}>Nhóm chuyển đổi</Text>
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: cardBg, borderColor }]}
          onPress={() => openSelectModal('category')}
        >
          <Text style={[styles.dropdownText, { color: shell.appTextPrimary }]}>{getLabel('category')}</Text>
          <ChevronDown size={20} color={shell.appTextSecondary} {...IC} />
        </TouchableOpacity>

        {/* Input box */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardLabel, { color: shell.appTextSecondary }]}>Chuyển từ</Text>
          <View style={styles.inputRow}>
            <TextInput
              keyboardType="numeric"
              style={[styles.input, { color: shell.appTextPrimary, backgroundColor: inputBg }]}
              value={inputValue}
              onChangeText={(txt) => setInputValue(txt.replace(',', '.'))}
            />
            <TouchableOpacity
              style={[styles.unitSelector, { backgroundColor: inputBg, borderColor }]}
              onPress={() => openSelectModal('from')}
            >
              <Text style={[styles.unitText, { color: shell.appTextPrimary }]} numberOfLines={1}>
                {getLabel('from')}
              </Text>
              <ChevronDown size={14} color={shell.appTextSecondary} {...IC} />
            </TouchableOpacity>
          </View>

          {/* Swap icon row */}
          <View style={styles.swapRow}>
            <TouchableOpacity style={[styles.swapBtn, { backgroundColor: accentColor }]} onPress={handleSwap}>
              <RefreshCw color="#FFF" size={16} {...IC} />
            </TouchableOpacity>
          </View>

          {/* Result box */}
          <Text style={[styles.cardLabel, { color: shell.appTextSecondary, marginTop: 4 }]}>Kết quả</Text>
          <View style={styles.inputRow}>
            <View style={[styles.input, styles.resultContainer, { backgroundColor: inputBg }]}>
              <Text style={[styles.resultText, { color: shell.appTextPrimary }]} numberOfLines={1}>
                {result}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.unitSelector, { backgroundColor: inputBg, borderColor }]}
              onPress={() => openSelectModal('to')}
            >
              <Text style={[styles.unitText, { color: shell.appTextPrimary }]} numberOfLines={1}>
                {getLabel('to')}
              </Text>
              <ChevronDown size={14} color={shell.appTextSecondary} {...IC} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal for Dropdowns */}
      <Modal visible={showModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: shell.appSurface, borderColor }]}>
            <Text style={[styles.modalHeaderTitle, { color: shell.appTextPrimary }]}>
              {modalType === 'category' ? 'Chọn nhóm chuyển đổi' : 'Chọn đơn vị'}
            </Text>
            <FlatList
              data={getActiveOptions()}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected =
                  modalType === 'category'
                    ? category === item.value
                    : modalType === 'from'
                    ? fromUnit === item.value
                    : toUnit === item.value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      {
                        backgroundColor: isSelected ? cardBg : 'transparent',
                      },
                    ]}
                    onPress={() => handleModalSelect(item.value)}
                  >
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? accentColor : shell.appTextPrimary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dropdown: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1.5,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 17,
    fontWeight: '700',
  },
  resultContainer: {
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 17,
    fontWeight: '700',
  },
  unitSelector: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  unitText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  swapRow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: '60%',
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
