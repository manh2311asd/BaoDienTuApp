import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { ArrowLeft, Delete } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';

const F_SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const IC = { strokeWidth: 2 } as const;

export default function QuickCalculatorScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];
  const dark = themeMode === 'dark';

  // Calculator State Machine
  const [currentVal, setCurrentVal] = useState('0');
  const [prevVal, setPrevVal] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [isEquationFinished, setIsEquationFinished] = useState(false);

  // Styling based on Yellow theme
  const canvasBg = dark ? '#151411' : '#FCFAF5';
  const displayBg = dark ? '#211E18' : '#FAF6EC';
  const btnBg = dark ? '#2D281E' : '#F4ECD8';
  const accentColor = '#D4A017';
  const textBtnColor = dark ? '#D9B264' : '#8A6F27';
  const borderColor = dark ? '#342F24' : '#E8DFCC';

  const handleClear = () => {
    setCurrentVal('0');
    setPrevVal(null);
    setOperator(null);
    setIsEquationFinished(false);
  };

  const handleBackspace = () => {
    if (isEquationFinished) {
      handleClear();
      return;
    }
    if (currentVal.length > 1) {
      setCurrentVal(currentVal.slice(0, -1));
    } else {
      setCurrentVal('0');
    }
  };

  const handleNumber = (num: string) => {
    if (currentVal === '0' || isEquationFinished) {
      setCurrentVal(num);
      setIsEquationFinished(false);
    } else {
      setCurrentVal(currentVal + num);
    }
  };

  const handleDecimal = () => {
    if (isEquationFinished) {
      setCurrentVal('0.');
      setIsEquationFinished(false);
      return;
    }
    if (!currentVal.includes('.')) {
      setCurrentVal(currentVal + '.');
    }
  };

  const handleToggleSign = () => {
    if (currentVal === '0') return;
    if (currentVal.startsWith('-')) {
      setCurrentVal(currentVal.slice(1));
    } else {
      setCurrentVal('-' + currentVal);
    }
  };

  const handlePercentage = () => {
    const num = parseFloat(currentVal);
    if (!isNaN(num)) {
      setCurrentVal(String(num / 100));
    }
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(currentVal);

    if (prevVal === null) {
      setPrevVal(currentVal);
      setOperator(op);
      setCurrentVal('0');
    } else if (operator) {
      const result = calculate(parseFloat(prevVal), current, operator);
      setPrevVal(String(result));
      setOperator(op);
      setCurrentVal('0');
    }
    setIsEquationFinished(false);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b === 0 ? 0 : a / b;
      default:
        return b;
    }
  };

  const handleEqual = () => {
    if (!operator || prevVal === null) return;
    const a = parseFloat(prevVal);
    const b = parseFloat(currentVal);
    const result = calculate(a, b, operator);

    // Limit decimal precision dynamically
    let formattedResult = String(result);
    if (formattedResult.includes('.') && formattedResult.length > 10) {
      formattedResult = String(Number(result.toFixed(8)));
    }

    setCurrentVal(formattedResult);
    setPrevVal(null);
    setOperator(null);
    setIsEquationFinished(true);
  };

  // Render Display formula helper
  const getFormula = () => {
    if (prevVal !== null && operator) {
      return `${prevVal} ${operator} ${currentVal === '0' ? '' : currentVal}`;
    }
    return '';
  };

  const renderButton = (
    label: string | React.ReactNode,
    onPress: () => void,
    isAccent = false,
    isDouble = false
  ) => {
    return (
      <TouchableOpacity
        style={[
          styles.btn,
          {
            backgroundColor: isAccent ? accentColor : btnBg,
            borderColor,
            width: isDouble ? (btnWidth * 2) + 12 : btnWidth,
          },
        ]}
        onPress={onPress}
      >
        {typeof label === 'string' ? (
          <Text
            style={[
              styles.btnText,
              {
                color: isAccent ? '#FFF' : textBtnColor,
              },
            ]}
          >
            {label}
          </Text>
        ) : (
          label
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: canvasBg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={shell.appTextPrimary} size={24} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>Máy tính</Text>
      </View>

      <View style={styles.mainContainer}>
        {/* Calculator Display Screen */}
        <View style={[styles.displayCard, { backgroundColor: displayBg, borderColor }]}>
          <Text style={[styles.formulaText, { color: shell.appTextSecondary }]} numberOfLines={1}>
            {getFormula()}
          </Text>
          <Text style={[styles.displayText, { color: shell.appTextPrimary }]} numberOfLines={1}>
            {currentVal}
          </Text>
        </View>

        {/* Buttons Grid Layout */}
        <View style={styles.grid}>
          <View style={styles.row}>
            {renderButton('AC', handleClear)}
            {renderButton('+/-', handleToggleSign)}
            {renderButton('%', handlePercentage)}
            {renderButton('÷', () => handleOperator('÷'), true)}
          </View>
          <View style={styles.row}>
            {renderButton('7', () => handleNumber('7'))}
            {renderButton('8', () => handleNumber('8'))}
            {renderButton('9', () => handleNumber('9'))}
            {renderButton('×', () => handleOperator('×'), true)}
          </View>
          <View style={styles.row}>
            {renderButton('4', () => handleNumber('4'))}
            {renderButton('5', () => handleNumber('5'))}
            {renderButton('6', () => handleNumber('6'))}
            {renderButton('-', () => handleOperator('-'), true)}
          </View>
          <View style={styles.row}>
            {renderButton('1', () => handleNumber('1'))}
            {renderButton('2', () => handleNumber('2'))}
            {renderButton('3', () => handleNumber('3'))}
            {renderButton('+', () => handleOperator('+'), true)}
          </View>
          <View style={styles.row}>
            {renderButton('0', () => handleNumber('0'), false, true)}
            {renderButton('.', handleDecimal)}
            {renderButton(
              <Delete color={dark ? shell.appError || '#EE8990' : '#B44449'} size={20} {...IC} />,
              handleBackspace
            )}
            {renderButton('=', handleEqual, true)}
          </View>
        </View>
      </View>
    </View>
  );
}

const screenWidth = Dimensions.get('window').width;
const padding = 16;
// Grid gap is 12. There are 4 buttons in a row, so 3 gaps.
const totalGap = 12 * 3;
const gridWidth = screenWidth - (padding * 2);
const btnWidth = Math.floor((gridWidth - totalGap) / 4);

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
  mainContainer: {
    flex: 1,
    padding: padding,
    justifyContent: 'flex-end',
  },
  displayCard: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  formulaText: {
    fontSize: 14.5,
    fontWeight: '500',
    marginBottom: 8,
  },
  displayText: {
    fontSize: 36,
    fontWeight: '800',
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    height: btnWidth,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 18,
    fontWeight: '800',
  },
});
