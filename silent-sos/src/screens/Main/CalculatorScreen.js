import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Vibration, PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useShake } from '../../context/ShakeContext';

const BUTTONS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '⌫', '='],
];

// Long-press 'C' duration (2.5s) to reveal safety app
const C_LONG_PRESS_MS = 2500;
// Secret vault PINs entered naturally on the keypad
const SECRET_PINS = ['9119=', '911=', '0000='];

export default function CalculatorScreen({ navigation }) {
  const { shakeStatus } = useShake();
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [expression, setExpression] = useState('');
  const [secretBuffer, setSecretBuffer] = useState('');

  // C button long-press state
  const cPressTimer = useRef(null);
  const cHapticInterval = useRef(null);
  const cPressAnim = useRef(new Animated.Value(1)).current;
  const cFillAnim = useRef(new Animated.Value(0)).current;
  const cFillAnimation = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const [cHeld, setCHeld] = useState(false);

  // Cooldown badge pulse animation
  const cooldownPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (shakeStatus?.inCooldown) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cooldownPulse, { toValue: 1.18, duration: 550, useNativeDriver: true }),
          Animated.timing(cooldownPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
        ])
      ).start();
    } else {
      cooldownPulse.setValue(1);
    }
  }, [shakeStatus?.inCooldown]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (cPressTimer.current) clearTimeout(cPressTimer.current);
      if (cHapticInterval.current) clearInterval(cHapticInterval.current);
    };
  }, []);

  // Format display numbers with commas for thousands
  const formatDisplay = (numStr) => {
    if (numStr === 'Error' || numStr === 'NaN' || numStr === 'Infinity') return 'Error';
    if (!numStr) return '0';

    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Safe floating point precision calculation
  const calculate = (a, b, op) => {
    let result = 0;
    switch (op) {
      case '÷':
        if (b === 0) return 'Error';
        result = a / b;
        break;
      case '×':
        result = a * b;
        break;
      case '−':
        result = a - b;
        break;
      case '+':
        result = a + b;
        break;
      default:
        return b;
    }
    // Clean rounding to avoid 0.30000000000000004
    return Math.round(result * 1000000000) / 1000000000;
  };

  const handleButtonPress = (btn) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Track secret PIN buffer
    const nextBuffer = (secretBuffer + btn).slice(-8);
    setSecretBuffer(nextBuffer);

    // Check if secret PIN was keyed in
    for (const pin of SECRET_PINS) {
      if (nextBuffer.endsWith(pin)) {
        revealAndReturn();
        return;
      }
    }

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
    setDisplay(d => (d.length <= 1 || d === 'Error' ? '0' : d.slice(0, -1)));
  };

  const handleToggleSign = () => {
    if (display === '0' || display === 'Error') return;
    setDisplay(d => (d.startsWith('-') ? d.slice(1) : '-' + d));
  };

  const handlePercent = () => {
    if (display === 'Error') return;
    const current = parseFloat(display);
    const result = Math.round((current / 100) * 1000000000) / 1000000000;
    setDisplay(String(result));
  };

  const handleDigit = (digit) => {
    if (display === 'Error' || waitingForOperand) {
      setDisplay(digit === '.' ? '0.' : digit);
      setWaitingForOperand(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      if (display.length >= 10) return; // Prevent overflow
      setDisplay(d => (d === '0' && digit !== '.' ? digit : d + digit));
    }
  };

  const handleOperator = (nextOperator) => {
    if (display === 'Error') return;
    const current = parseFloat(display);

    // If an operator is already active and user taps another operator, replace it smoothly
    if (operator && waitingForOperand) {
      setOperator(nextOperator);
      setExpression(`${prevValue} ${nextOperator}`);
      return;
    }

    if (prevValue !== null && !waitingForOperand) {
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(result);
      setExpression(`${result} ${nextOperator}`);
    } else {
      setPrevValue(current);
      setExpression(`${current} ${nextOperator}`);
    }

    setOperator(nextOperator);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (!operator || waitingForOperand || display === 'Error') return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, operator);
    setExpression(`${prevValue} ${operator} ${current} =`);
    setDisplay(String(result));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  // ── Swipe-to-delete gesture on display ────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 30) {
          handleDelete();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      },
    })
  ).current;

  // ── Secret C Button Long-Press Escape ─────────────────────
  const onCPressIn = () => {
    setCHeld(true);
    Animated.spring(cPressAnim, { toValue: 0.92, friction: 6, useNativeDriver: true }).start();

    // Fill progress
    cFillAnim.setValue(0);
    cFillAnimation.current = Animated.timing(cFillAnim, {
      toValue: 1,
      duration: C_LONG_PRESS_MS,
      useNativeDriver: false,
    });
    cFillAnimation.current.start(({ finished }) => {
      if (finished) revealAndReturn();
    });

    // Gentle tactile ticks during hold
    let tickCount = 0;
    cHapticInterval.current = setInterval(() => {
      tickCount++;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (tickCount >= 3) clearInterval(cHapticInterval.current);
    }, 700);

    cPressTimer.current = setTimeout(revealAndReturn, C_LONG_PRESS_MS);
  };

  const onCPressOut = () => {
    if (!cHeld) return;
    setCHeld(false);
    if (cPressTimer.current) clearTimeout(cPressTimer.current);
    if (cHapticInterval.current) clearInterval(cHapticInterval.current);
    if (cFillAnimation.current) cFillAnimation.current.stop();

    Animated.timing(cFillAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    Animated.spring(cPressAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  };

  const revealAndReturn = () => {
    if (cPressTimer.current) clearTimeout(cPressTimer.current);
    if (cHapticInterval.current) clearInterval(cHapticInterval.current);
    setCHeld(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Vibration.vibrate([0, 80, 50, 120]);

    Animated.timing(revealAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        navigation.navigate('MainApp', {
          screen: 'Help',
          params: { triggerSource: 'calculator' },
        });
        revealAnim.setValue(0);
      }, 350);
    });
  };

  // Button styles
  const isOperator = (btn) => ['÷', '×', '−', '+', '='].includes(btn);
  const isFunc = (btn) => ['C', '±', '%'].includes(btn);

  const getBtnStyle = (btn) => {
    if (btn === '=' || operator === btn) return styles.operatorBtnActive;
    if (isOperator(btn)) return styles.operatorBtn;
    if (isFunc(btn)) return styles.funcBtn;
    return styles.numberBtn;
  };

  const getTxtStyle = (btn) => {
    if (operator === btn) return styles.operatorActiveText;
    if (btn === '=' || isOperator(btn)) return styles.operatorText;
    if (isFunc(btn)) return styles.funcText;
    return styles.numberText;
  };

  // Dynamic font sizing based on digit length
  const displayFontSize = display.length > 9 ? 42 : display.length > 6 ? 54 : 70;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#181A20', '#0A0C10']} style={StyleSheet.absoluteFillObject} />

      {/* Secret Vault Reveal Overlay */}
      <Animated.View style={[styles.revealOverlay, { opacity: revealAnim }]} pointerEvents="none">
        <Text style={styles.revealIcon}>🛡️</Text>
        <Text style={styles.revealText}>Restoring Guardian Safety Vault…</Text>
      </Animated.View>

      {/* Shake Progress Micro-indicator */}
      {(shakeStatus?.shakesDetected || 0) > 0 && (
        <View style={styles.shakeIndicator}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[
                styles.shakeDot,
                { backgroundColor: i < shakeStatus.shakesDetected ? '#ff9f0a' : '#2A2E39' },
              ]}
            />
          ))}
        </View>
      )}

      {/* Cooldown Micro-badge */}
      {shakeStatus?.inCooldown && (
        <Animated.View style={[styles.cooldownBadge, { transform: [{ scale: cooldownPulse }] }]}>
          <Text style={styles.cooldownText}>⏳</Text>
        </Animated.View>
      )}

      {/* Display Area with Swipe Gestures */}
      <View style={styles.displayArea} {...panResponder.panHandlers}>
        <Text style={styles.expression} numberOfLines={1}>{expression}</Text>
        <Text
          style={[styles.display, { fontSize: displayFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
        >
          {formatDisplay(display)}
        </Text>
      </View>

      {/* Calculator Keypad */}
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
                    activeOpacity={0.8}
                    style={[styles.buttonBase, styles.zeroBtn]}
                    onPress={() => handleButtonPress(btn)}
                    accessibilityLabel="Zero"
                  >
                    <Text style={styles.numberText}>{btn}</Text>
                  </TouchableOpacity>
                );
              }

              if (isC) {
                const fillWidth = cFillAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                });

                return (
                  <Animated.View
                    key={btn}
                    style={[
                      styles.buttonBase,
                      styles.funcBtn,
                      styles.cBtnWrapper,
                      { transform: [{ scale: cPressAnim }] },
                    ]}
                  >
                    {cHeld && (
                      <Animated.View style={[styles.cFillBg, { width: fillWidth }]} />
                    )}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.touchFill}
                      onPress={() => { if (!cHeld) handleClear(); }}
                      onPressIn={onCPressIn}
                      onPressOut={onCPressOut}
                      accessibilityLabel="Clear. Hold 2.5s or type 9119= to open emergency vault"
                    >
                      <Text style={styles.funcText}>{btn}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }

              return (
                <TouchableOpacity
                  key={btn}
                  activeOpacity={0.8}
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

const BTN = 74;
const GAP = 12;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0C10' },
  displayArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 26,
    paddingBottom: 20,
  },
  expression: {
    fontSize: 19,
    color: '#8B95B0',
    textAlign: 'right',
    marginBottom: 6,
    fontWeight: '400',
  },
  display: {
    fontWeight: '200',
    color: '#FFFFFF',
    textAlign: 'right',
    letterSpacing: -1,
  },
  buttonsArea: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    justifyContent: 'space-between',
  },
  buttonBase: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  touchFill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cBtnWrapper: { position: 'relative', overflow: 'hidden' },
  cFillBg: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 0,
  },
  numberBtn: { backgroundColor: '#20242F' },
  funcBtn: { backgroundColor: '#A5ABB8' },
  operatorBtn: { backgroundColor: '#FF9F0A' },
  operatorBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF9F0A',
  },
  zeroBtn: {
    width: BTN * 2 + GAP,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: '#20242F',
    paddingLeft: BTN * 0.38,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  numberText: { fontSize: 28, color: '#FFFFFF', fontWeight: '400' },
  funcText: { fontSize: 26, color: '#0A0C10', fontWeight: '600' },
  operatorText: { fontSize: 30, color: '#FFFFFF', fontWeight: '400' },
  operatorActiveText: { fontSize: 30, color: '#FF9F0A', fontWeight: '600' },
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 16, 0.94)',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  revealIcon: { fontSize: 52, marginBottom: 16 },
  revealText: {
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    lineHeight: 32,
  },
  shakeIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
    padding: 6,
  },
  shakeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  cooldownBadge: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
  },
  cooldownText: { fontSize: 18 },
});
