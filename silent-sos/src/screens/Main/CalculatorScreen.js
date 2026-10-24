import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';

const BUTTONS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

export default function CalculatorScreen({ navigation }) {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');

  // Secret long-press on ÷ to return to app
  const divLongPressTimer = useRef(null);
  const divPressAnim = useRef(new Animated.Value(1)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  const handleButtonPress = (btn) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (btn === 'C') return handleClear();
    if (btn === '⌫') return handleDelete();
    if (btn === '±') return handleToggleSign();
    if (btn === '%') return handlePercent();
    if (btn === '=') return handleEquals();
    if (['÷', '×', '−', '+'].includes(btn)) return handleOperator(btn);
    handleDigit(btn);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setExpression('');
  };

  const handleDelete = () => {
    if (display.length <= 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleToggleSign = () => {
    const num = parseFloat(display);
    setDisplay(String(-num));
  };

  const handlePercent = () => {
    const num = parseFloat(display);
    setDisplay(String(num / 100));
  };

  const handleDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit === '.' ? '0.' : digit);
      setWaitingForOperand(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(display === '0' && digit !== '.' ? digit : display + digit);
    }
  };

  const handleOperator = (op) => {
    const current = parseFloat(display);
    if (prevValue !== null && !waitingForOperand) {
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(result);
      setExpression(`${result} ${op}`);
    } else {
      setPrevValue(current);
      setExpression(`${current} ${op}`);
    }
    setOperator(op);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (!operator || waitingForOperand) return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, operator);
    setExpression(`${prevValue} ${operator} ${current} =`);
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case '÷': return b !== 0 ? parseFloat((a / b).toFixed(10)) : 'Error';
      case '×': return parseFloat((a * b).toFixed(10));
      case '−': return parseFloat((a - b).toFixed(10));
      case '+': return parseFloat((a + b).toFixed(10));
      default: return b;
    }
  };

  // ─── Secret return gesture ──────────────────────────────

  const onDivPressIn = () => {
    Animated.timing(divPressAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }).start();
    divLongPressTimer.current = setTimeout(() => {
      // Reveal the escape
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Vibration.vibrate(300);
      Animated.timing(revealAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          navigation.navigate('MainApp');
        }, 800);
      });
    }, 2000);
  };

  const onDivPressOut = () => {
    Animated.timing(divPressAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    clearTimeout(divLongPressTimer.current);
  };

  const isOperatorBtn = (btn) => ['÷', '×', '−', '+', '='].includes(btn);
  const isFuncBtn = (btn) => ['C', '±', '%'].includes(btn);

  const getButtonStyle = (btn) => {
    if (btn === '=' || (operator === btn)) return styles.operatorBtnActive;
    if (isOperatorBtn(btn)) return styles.operatorBtn;
    if (isFuncBtn(btn)) return styles.funcBtn;
    if (btn === '0') return styles.zeroBtn;
    return styles.numberBtn;
  };

  const getTextStyle = (btn) => {
    if (btn === '=' || isOperatorBtn(btn)) return styles.operatorText;
    if (isFuncBtn(btn)) return styles.funcText;
    return styles.numberText;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFillObject} />

      {/* Secret reveal overlay */}
      <Animated.View style={[styles.revealOverlay, { opacity: revealAnim }]}>
        <Text style={styles.revealText}>🛡️{'\n'}Returning to app…</Text>
      </Animated.View>

      {/* Display */}
      <View style={styles.displayArea}>
        <Text style={styles.expression} numberOfLines={1}>{expression}</Text>
        <Text
          style={styles.display}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {display}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsArea}>
        {BUTTONS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(btn => {
              const isDivide = btn === '÷';
              if (btn === '0') {
                return (
                  <TouchableOpacity
                    key={btn}
                    style={[styles.buttonBase, styles.zeroBtn]}
                    onPress={() => handleButtonPress(btn)}
                    accessibilityLabel={btn === '⌫' ? 'Delete' : btn}
                  >
                    <Text style={styles.numberText}>{btn}</Text>
                  </TouchableOpacity>
                );
              }
              return isDivide ? (
                <Animated.View key={btn} style={[styles.buttonBase, styles.operatorBtn, { transform: [{ scale: divPressAnim }] }]}>
                  <TouchableOpacity
                    style={styles.touchFill}
                    onPress={() => handleButtonPress(btn)}
                    onPressIn={onDivPressIn}
                    onPressOut={onDivPressOut}
                    accessibilityLabel="Divide (long press for 2 seconds to return to safety app)"
                    delayLongPress={2000}
                  >
                    <Text style={styles.operatorText}>{btn}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ) : (
                <TouchableOpacity
                  key={btn}
                  style={[styles.buttonBase, getButtonStyle(btn)]}
                  onPress={() => handleButtonPress(btn)}
                  accessibilityLabel={btn === '⌫' ? 'Delete' : btn}
                >
                  <Text style={getTextStyle(btn)}>{btn}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const BTN = 76;
const GAP = 10;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  displayArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  expression: {
    fontSize: 18,
    color: '#666',
    textAlign: 'right',
    marginBottom: 4,
  },
  display: {
    fontSize: 72,
    fontWeight: '200',
    color: '#fff',
    textAlign: 'right',
  },
  buttonsArea: {
    padding: 16,
    paddingBottom: 40,
    gap: GAP,
  },
  row: { flexDirection: 'row', gap: GAP, justifyContent: 'space-between' },
  buttonBase: {
    width: BTN, height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  touchFill: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  numberBtn: { backgroundColor: '#333' },
  funcBtn: { backgroundColor: '#a5a5a5' },
  operatorBtn: { backgroundColor: '#ff9f0a' },
  operatorBtnActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff9f0a' },
  zeroBtn: {
    width: BTN * 2 + GAP,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: '#333',
    paddingLeft: BTN * 0.4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  numberText: { fontSize: 28, color: '#fff', fontWeight: '400' },
  funcText: { fontSize: 26, color: '#000', fontWeight: '500' },
  operatorText: { fontSize: 28, color: '#fff', fontWeight: '400' },
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0C10',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealText: {
    fontSize: 36,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 50,
  },
});
