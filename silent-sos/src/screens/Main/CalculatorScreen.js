import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';
import { useShake } from '../../context/ShakeContext';

const BUTTONS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

// Secret: long-press 'C' for 3 seconds to reveal the safety app
const C_LONG_PRESS_MS = 3000;

export default function CalculatorScreen({ navigation }) {
  const { shakeStatus } = useShake();
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');

  // C button long-press state
  const cPressTimer = useRef(null);
  const cPressAnim = useRef(new Animated.Value(1)).current;
  const cFillAnim = useRef(new Animated.Value(0)).current;  // progress fill
  const cFillAnimation = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const [cHeld, setCHeld] = useState(false);

  // Cooldown badge pulse
  const cooldownPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (shakeStatus.inCooldown) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cooldownPulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(cooldownPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      cooldownPulse.setValue(1);
    }
  }, [shakeStatus.inCooldown]);

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
  const handleDelete = () => setDisplay(d => d.length <= 1 ? '0' : d.slice(0, -1));
  const handleToggleSign = () => setDisplay(d => String(-parseFloat(d)));
  const handlePercent = () => setDisplay(d => String(parseFloat(d) / 100));

  const handleDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(digit === '.' ? '0.' : digit);
      setWaitingForOperand(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(d => d === '0' && digit !== '.' ? digit : d + digit);
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

  // ─── Secret C long-press escape ──────────────────────────

  const onCPressIn = () => {
    setCHeld(true);
    Animated.spring(cPressAnim, { toValue: 0.9, useNativeDriver: true }).start();

    // Animate the fill progress
    cFillAnim.setValue(0);
    cFillAnimation.current = Animated.timing(cFillAnim, {
      toValue: 1,
      duration: C_LONG_PRESS_MS,
      useNativeDriver: false,
    });
    cFillAnimation.current.start(({ finished }) => {
      if (finished) revealAndReturn();
    });

    cPressTimer.current = setTimeout(revealAndReturn, C_LONG_PRESS_MS);
  };

  const onCPressOut = () => {
    if (!cHeld) return;
    setCHeld(false);
    clearTimeout(cPressTimer.current);
    if (cFillAnimation.current) cFillAnimation.current.stop();
    Animated.timing(cFillAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    Animated.spring(cPressAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const revealAndReturn = () => {
    clearTimeout(cPressTimer.current);
    setCHeld(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Vibration.vibrate(300);
    Animated.timing(revealAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() => {
      setTimeout(() => navigation.navigate('MainApp'), 600);
    });
  };

  // ─── Button style helpers ─────────────────────────────────
  const isOperator = (btn) => ['÷', '×', '−', '+', '='].includes(btn);
  const isFunc = (btn) => ['C', '±', '%'].includes(btn);

  const getBtnStyle = (btn) => {
    if (btn === '=' || (operator === btn)) return styles.operatorBtnActive;
    if (isOperator(btn)) return styles.operatorBtn;
    if (isFunc(btn)) return styles.funcBtn;
    return styles.numberBtn;
  };
  const getTxtStyle = (btn) => {
    if (btn === '=' || isOperator(btn)) return styles.operatorText;
    if (isFunc(btn)) return styles.funcText;
    return styles.numberText;
  };

  // Shake dot: shows 1–3 dots as the user shakes
  const shakeDots = Array.from({ length: 3 }).map((_, i) => (
    <View
      key={i}
      style={[
        styles.shakeDot,
        { backgroundColor: i < shakeStatus.shakesDetected ? '#ff9f0a' : '#333' },
      ]}
    />
  ));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFillObject} />

      {/* Reveal overlay */}
      <Animated.View style={[styles.revealOverlay, { opacity: revealAnim }]}>
        <Text style={styles.revealText}>🛡️{'\n'}Opening safety app…</Text>
      </Animated.View>

      {/* Shake progress indicator (subtle — top-right corner) */}
      {shakeStatus.shakesDetected > 0 && (
        <View style={styles.shakeIndicator}>
          {shakeDots}
        </View>
      )}

      {/* Cooldown badge */}
      {shakeStatus.inCooldown && (
        <Animated.View style={[styles.cooldownBadge, { transform: [{ scale: cooldownPulse }] }]}>
          <Text style={styles.cooldownText}>⏳</Text>
        </Animated.View>
      )}

      {/* Display */}
      <View style={styles.displayArea}>
        <Text style={styles.expression} numberOfLines={1}>{expression}</Text>
        <Text style={styles.display} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
          {display}
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsArea}>
        {BUTTONS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map(btn => {
              const isC = btn === 'C';
              const isZero = btn === '0';

              if (isZero) {
                return (
                  <TouchableOpacity
                    key={btn}
                    style={[styles.buttonBase, styles.zeroBtn]}
                    onPress={() => handleButtonPress(btn)}
                    accessibilityLabel="Zero"
                  >
                    <Text style={styles.numberText}>{btn}</Text>
                  </TouchableOpacity>
                );
              }

              if (isC) {
                // Special C button: normal tap = clear, long press 3s = escape
                const fillWidth = cFillAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                });
                return (
                  <Animated.View
                    key={btn}
                    style={[styles.buttonBase, styles.funcBtn, styles.cBtnWrapper, { transform: [{ scale: cPressAnim }] }]}
                  >
                    {/* Press-and-hold fill ring */}
                    {cHeld && (
                      <Animated.View style={[styles.cFillBg, { width: fillWidth }]} />
                    )}
                    <TouchableOpacity
                      style={styles.touchFill}
                      onPress={() => { if (!cHeld) handleClear(); }}
                      onPressIn={onCPressIn}
                      onPressOut={onCPressOut}
                      accessibilityLabel="Clear (long-press 3 seconds to return to safety app)"
                    >
                      <Text style={styles.funcText}>{btn}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }

              return (
                <TouchableOpacity
                  key={btn}
                  style={[styles.buttonBase, getBtnStyle(btn)]}
                  onPress={() => handleButtonPress(btn)}
                  accessibilityLabel={btn === '⌫' ? 'Delete' : btn}
                >
                  <Text style={getTxtStyle(btn)}>{btn}</Text>
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
  expression: { fontSize: 18, color: '#666', textAlign: 'right', marginBottom: 4 },
  display: { fontSize: 72, fontWeight: '200', color: '#fff', textAlign: 'right' },
  buttonsArea: { padding: 16, paddingBottom: 40, gap: GAP },
  row: { flexDirection: 'row', gap: GAP, justifyContent: 'space-between' },
  buttonBase: {
    width: BTN, height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  touchFill: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  cBtnWrapper: { position: 'relative', overflow: 'hidden' },
  cFillBg: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 0,
  },
  numberBtn: { backgroundColor: '#333' },
  funcBtn: { backgroundColor: '#a5a5a5' },
  operatorBtn: { backgroundColor: '#ff9f0a' },
  operatorBtnActive: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ff9f0a' },
  zeroBtn: {
    width: BTN * 2 + GAP, height: BTN,
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
    alignItems: 'center', justifyContent: 'center',
  },
  revealText: { fontSize: 36, color: '#fff', textAlign: 'center', lineHeight: 52 },
  // Shake indicator
  shakeIndicator: {
    position: 'absolute',
    top: 52, right: 20,
    flexDirection: 'row',
    gap: 5,
    zIndex: 10,
  },
  shakeDot: {
    width: 9, height: 9,
    borderRadius: 5,
  },
  cooldownBadge: {
    position: 'absolute',
    top: 52, right: 20,
    zIndex: 10,
  },
  cooldownText: { fontSize: 18 },
});
