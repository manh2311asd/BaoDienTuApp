import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Delete, History } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/useAppStore';
import { appTheme } from '../../theme/colors';
import {
  BinaryOperator,
  calculateBinary,
  formatCalculatorValue,
  normalizeCalculatorResult,
} from './calculatorUi';

const F_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
});
const IC = { strokeWidth: 2 } as const;
const MAX_INPUT_DIGITS = 15;

interface HistoryEntry {
  id: number;
  expression: string;
  result: string;
}

type KeyTone = 'number' | 'function' | 'operator' | 'equals';

export default function QuickCalculatorScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const themeMode = useAppStore((state) => state.themeMode);
  const shell = appTheme[themeMode];

  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOperator, setPendingOperator] =
    useState<BinaryOperator | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [justCalculated, setJustCalculated] = useState(false);
  const [lastOperator, setLastOperator] =
    useState<BinaryOperator | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [memory, setMemory] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  const formattedDisplay = useMemo(
    () => formatCalculatorValue(display),
    [display]
  );
  const displayFontSize =
    formattedDisplay.length > 18 ? 30 : formattedDisplay.length > 12 ? 38 : 48;

  const resetAll = () => {
    setDisplay('0');
    setExpression('');
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(false);
    setJustCalculated(false);
    setLastOperator(null);
    setLastOperand(null);
  };

  const setError = (message = 'Không thể tính') => {
    setDisplay(message);
    setExpression('');
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(true);
    setJustCalculated(true);
  };

  const readDisplay = () => {
    const value = Number(display);
    return Number.isFinite(value) ? value : null;
  };

  const writeResult = (value: number) => {
    const normalized = normalizeCalculatorResult(value);
    if (normalized == null) {
      setError();
      return null;
    }
    const next = String(normalized);
    setDisplay(next);
    return next;
  };

  const handleDigit = (digit: string) => {
    const digitCount = display.replace(/[-.]/g, '').length;
    if (waitingForOperand || justCalculated || !Number.isFinite(Number(display))) {
      setDisplay(digit);
      setWaitingForOperand(false);
      if (justCalculated) setExpression('');
      setJustCalculated(false);
      return;
    }
    if (digitCount >= MAX_INPUT_DIGITS) return;
    setDisplay(display === '0' ? digit : display + digit);
  };

  const handleDecimal = () => {
    if (waitingForOperand || justCalculated || !Number.isFinite(Number(display))) {
      setDisplay('0.');
      setWaitingForOperand(false);
      if (justCalculated) setExpression('');
      setJustCalculated(false);
      return;
    }
    if (!display.includes('.')) setDisplay(`${display}.`);
  };

  const handleBackspace = () => {
    if (waitingForOperand || justCalculated || !Number.isFinite(Number(display))) {
      setDisplay('0');
      setJustCalculated(false);
      return;
    }
    const next = display.slice(0, -1);
    setDisplay(next && next !== '-' ? next : '0');
  };

  const clearEntry = () => {
    setDisplay('0');
    setWaitingForOperand(false);
    setJustCalculated(false);
  };

  const handleOperator = (operator: BinaryOperator) => {
    const input = readDisplay();
    if (input == null) {
      resetAll();
      return;
    }

    if (pendingOperator && accumulator != null && !waitingForOperand) {
      const result = calculateBinary(accumulator, input, pendingOperator);
      if (result == null) {
        setError('Không thể chia cho 0');
        return;
      }
      const written = writeResult(result);
      if (written == null) return;
      setAccumulator(result);
      setExpression(`${formatCalculatorValue(written)} ${operator}`);
    } else {
      setAccumulator(input);
      setExpression(`${formatCalculatorValue(String(input))} ${operator}`);
    }

    setPendingOperator(operator);
    setWaitingForOperand(true);
    setJustCalculated(false);
  };

  const handleEqual = () => {
    let operator = pendingOperator;
    let left = accumulator;
    let right = readDisplay();

    if (!operator && justCalculated && lastOperator && lastOperand != null) {
      operator = lastOperator;
      left = right;
      right = lastOperand;
    }
    if (!operator || left == null || right == null) return;

    const result = calculateBinary(left, right, operator);
    if (result == null) {
      setError('Không thể chia cho 0');
      return;
    }
    const resultText = writeResult(result);
    if (resultText == null) return;

    const calculation = `${formatCalculatorValue(String(left))} ${operator} ${formatCalculatorValue(String(right))} =`;
    setExpression(calculation);
    setHistory((current) => [
      {
        id: Date.now(),
        expression: calculation,
        result: resultText,
      },
      ...current,
    ].slice(0, 20));
    setLastOperator(operator);
    setLastOperand(right);
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(true);
    setJustCalculated(true);
  };

  const handleToggleSign = () => {
    const value = readDisplay();
    if (value == null || value === 0) return;
    setDisplay(String(-value));
  };

  const handlePercent = () => {
    const value = readDisplay();
    if (value == null) return;
    const percent =
      accumulator != null && (pendingOperator === '+' || pendingOperator === '-')
        ? (accumulator * value) / 100
        : value / 100;
    const written = writeResult(percent);
    if (written) {
      setExpression(`${formatCalculatorValue(String(value))}%`);
      setWaitingForOperand(false);
      setJustCalculated(false);
    }
  };

  const handleUnary = (kind: 'reciprocal' | 'square' | 'sqrt') => {
    const value = readDisplay();
    if (value == null) return;
    if (kind === 'reciprocal' && value === 0) {
      setError('Không thể chia cho 0');
      return;
    }
    if (kind === 'sqrt' && value < 0) {
      setError('Đầu vào không hợp lệ');
      return;
    }

    const result =
      kind === 'reciprocal'
        ? 1 / value
        : kind === 'square'
          ? value * value
          : Math.sqrt(value);
    const label =
      kind === 'reciprocal'
        ? `1/(${formatCalculatorValue(String(value))})`
        : kind === 'square'
          ? `sqr(${formatCalculatorValue(String(value))})`
          : `√(${formatCalculatorValue(String(value))})`;
    const written = writeResult(result);
    if (!written) return;
    setExpression(`${label} =`);
    setWaitingForOperand(true);
    setJustCalculated(pendingOperator == null);
  };

  const recallMemory = () => {
    if (memory == null) return;
    setDisplay(String(memory));
    setWaitingForOperand(false);
    setJustCalculated(false);
  };

  const updateMemory = (mode: 'add' | 'subtract' | 'store') => {
    const value = readDisplay();
    if (value == null) return;
    const next =
      mode === 'store'
        ? value
        : mode === 'add'
          ? (memory ?? 0) + value
          : (memory ?? 0) - value;
    setMemory(normalizeCalculatorResult(next));
  };

  const restoreHistory = (entry: HistoryEntry) => {
    setDisplay(entry.result);
    setExpression(entry.expression);
    setAccumulator(null);
    setPendingOperator(null);
    setWaitingForOperand(true);
    setJustCalculated(true);
    setHistoryVisible(false);
  };

  const renderKey = (
    label: string | React.ReactNode,
    onPress: () => void,
    tone: KeyTone = 'number',
    selected = false
  ) => {
    const backgroundColor =
      tone === 'equals'
        ? shell.appPrimary
        : selected
          ? shell.appPrimary
          : tone === 'operator'
            ? shell.appPrimaryContainer
            : tone === 'function'
              ? shell.appSurfaceMuted
              : shell.appSurface;
    const color =
      tone === 'equals' || selected
        ? shell.appOnPrimary
        : tone === 'operator'
          ? shell.appPrimary
          : shell.appTextPrimary;

    return (
      <TouchableOpacity
        activeOpacity={0.72}
        accessibilityRole="button"
        style={[styles.key, { backgroundColor, borderColor: shell.appBorder }]}
        onPress={onPress}
      >
        {typeof label === 'string' ? (
          <Text style={[styles.keyText, { color }]}>{label}</Text>
        ) : (
          label
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: shell.appBackground, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: shell.appBorder }]}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={shell.appTextPrimary} size={23} {...IC} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: shell.appTextPrimary }]}>Máy tính</Text>
        <TouchableOpacity
          accessibilityLabel="Mở lịch sử tính toán"
          style={styles.headerButton}
          onPress={() => setHistoryVisible(true)}
        >
          <History color={shell.appTextPrimary} size={21} {...IC} />
          {history.length > 0 ? (
            <View style={[styles.historyBadge, { backgroundColor: shell.appPrimary }]}>
              <Text style={styles.historyBadgeText}>{history.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <View style={[styles.main, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.modeRow}>
          <View>
            <Text style={[styles.modeTitle, { color: shell.appTextPrimary }]}>Tiêu chuẩn</Text>
            <Text style={[styles.modeHint, { color: shell.appTextMuted }]}>Tính toán cơ bản</Text>
          </View>
          {memory != null ? (
            <View style={[styles.memoryBadge, { backgroundColor: shell.appSecondaryContainer }]}>
              <Text style={[styles.memoryBadgeText, { color: shell.appSuccess }]}>M</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.displayCard, { backgroundColor: shell.appSurface, borderColor: shell.appBorder }]}>
          <Text
            numberOfLines={1}
            style={[styles.expressionText, { color: shell.appTextSecondary }]}
          >
            {expression || ' '}
          </Text>
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.6}
            style={[
              styles.displayText,
              { color: shell.appTextPrimary, fontSize: displayFontSize },
            ]}
          >
            {formattedDisplay}
          </Text>
        </View>

        <View style={styles.memoryRow}>
          {['MC', 'MR', 'M+', 'M−', 'MS'].map((label) => {
            const disabled = (label === 'MC' || label === 'MR') && memory == null;
            const action =
              label === 'MC'
                ? () => setMemory(null)
                : label === 'MR'
                  ? recallMemory
                  : label === 'M+'
                    ? () => updateMemory('add')
                    : label === 'M−'
                      ? () => updateMemory('subtract')
                      : () => updateMemory('store');
            return (
              <TouchableOpacity
                key={label}
                disabled={disabled}
                style={styles.memoryKey}
                onPress={action}
              >
                <Text
                  style={[
                    styles.memoryKeyText,
                    { color: disabled ? shell.appTextMuted : shell.appTextPrimary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.keypad}>
          <View style={styles.keyRow}>
            {renderKey('%', handlePercent, 'function')}
            {renderKey('CE', clearEntry, 'function')}
            {renderKey('C', resetAll, 'function')}
            {renderKey(
              <Delete color={shell.appTextPrimary} size={20} {...IC} />,
              handleBackspace,
              'function'
            )}
          </View>
          <View style={styles.keyRow}>
            {renderKey('1/x', () => handleUnary('reciprocal'), 'function')}
            {renderKey('x²', () => handleUnary('square'), 'function')}
            {renderKey('√x', () => handleUnary('sqrt'), 'function')}
            {renderKey('÷', () => handleOperator('÷'), 'operator', pendingOperator === '÷' && waitingForOperand)}
          </View>
          <View style={styles.keyRow}>
            {renderKey('7', () => handleDigit('7'))}
            {renderKey('8', () => handleDigit('8'))}
            {renderKey('9', () => handleDigit('9'))}
            {renderKey('×', () => handleOperator('×'), 'operator', pendingOperator === '×' && waitingForOperand)}
          </View>
          <View style={styles.keyRow}>
            {renderKey('4', () => handleDigit('4'))}
            {renderKey('5', () => handleDigit('5'))}
            {renderKey('6', () => handleDigit('6'))}
            {renderKey('−', () => handleOperator('-'), 'operator', pendingOperator === '-' && waitingForOperand)}
          </View>
          <View style={styles.keyRow}>
            {renderKey('1', () => handleDigit('1'))}
            {renderKey('2', () => handleDigit('2'))}
            {renderKey('3', () => handleDigit('3'))}
            {renderKey('+', () => handleOperator('+'), 'operator', pendingOperator === '+' && waitingForOperand)}
          </View>
          <View style={styles.keyRow}>
            {renderKey('±', handleToggleSign)}
            {renderKey('0', () => handleDigit('0'))}
            {renderKey(',', handleDecimal)}
            {renderKey('=', handleEqual, 'equals')}
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={historyVisible}
        onRequestClose={() => setHistoryVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: shell.appOverlay }]}
          onPress={() => setHistoryVisible(false)}
        >
          <Pressable
            style={[
              styles.historyPanel,
              {
                backgroundColor: shell.appSurface,
                borderColor: shell.appBorder,
                marginTop: insets.top + 58,
              },
            ]}
            onPress={() => undefined}
          >
            <View style={styles.historyHeader}>
              <View>
                <Text style={[styles.historyTitle, { color: shell.appTextPrimary }]}>Lịch sử</Text>
                <Text style={[styles.historyHint, { color: shell.appTextMuted }]}>20 phép tính gần nhất</Text>
              </View>
              {history.length > 0 ? (
                <TouchableOpacity onPress={() => setHistory([])}>
                  <Text style={[styles.clearHistory, { color: shell.appPrimary }]}>Xóa tất cả</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={[styles.emptyHistoryTitle, { color: shell.appTextPrimary }]}>Chưa có phép tính</Text>
                <Text style={[styles.emptyHistoryHint, { color: shell.appTextMuted }]}>Kết quả sau khi nhấn dấu bằng sẽ xuất hiện tại đây.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {history.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={[styles.historyItem, { borderTopColor: shell.appDivider }]}
                    onPress={() => restoreHistory(entry)}
                  >
                    <Text style={[styles.historyExpression, { color: shell.appTextSecondary }]}>{entry.expression}</Text>
                    <Text style={[styles.historyResult, { color: shell.appTextPrimary }]}>= {formatCalculatorValue(entry.result)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 4,
    fontFamily: F_SERIF,
    fontSize: 19,
    fontWeight: '700',
  },
  historyBadge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  historyBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  main: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  modeRow: {
    minHeight: 42,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeTitle: { fontSize: 16, fontWeight: '700' },
  modeHint: { marginTop: 1, fontSize: 10 },
  memoryBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  memoryBadgeText: { fontSize: 12, fontWeight: '800' },
  displayCard: {
    minHeight: 124,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderRadius: 12,
  },
  expressionText: { minHeight: 21, fontSize: 14, fontWeight: '500' },
  displayText: { marginTop: 8, fontWeight: '700', letterSpacing: -1 },
  memoryRow: {
    height: 38,
    marginVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memoryKey: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' },
  memoryKeyText: { fontSize: 12, fontWeight: '700' },
  keypad: {
    flex: 1,
    minHeight: 334,
    maxHeight: 460,
    paddingBottom: 2,
    gap: 7,
  },
  keyRow: { flex: 1, flexDirection: 'row', gap: 7 },
  key: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 7,
  },
  keyText: { fontSize: 18, fontWeight: '600' },
  modalBackdrop: { flex: 1, paddingHorizontal: 12, alignItems: 'flex-end' },
  historyPanel: {
    width: '100%',
    maxWidth: 440,
    maxHeight: 420,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 12,
  },
  historyHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: { fontFamily: F_SERIF, fontSize: 21, fontWeight: '700' },
  historyHint: { marginTop: 2, fontSize: 10 },
  clearHistory: { paddingVertical: 7, fontSize: 12, fontWeight: '700' },
  emptyHistory: { paddingHorizontal: 28, paddingVertical: 42, alignItems: 'center' },
  emptyHistoryTitle: { fontFamily: F_SERIF, fontSize: 17, fontWeight: '700' },
  emptyHistoryHint: { marginTop: 6, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  historyItem: { paddingHorizontal: 18, paddingVertical: 14, alignItems: 'flex-end', borderTopWidth: 1 },
  historyExpression: { fontSize: 12 },
  historyResult: { marginTop: 5, fontSize: 21, fontWeight: '700' },
});
