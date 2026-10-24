import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Vibration } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

const ShakeContext = createContext(null);

// Tuned for high real-world accuracy and zero false positives
const SHAKE_ACCEL_THRESHOLD = 1.85;     // Dynamic G-force threshold beyond gravity
const SHAKE_WINDOW_MS = 3200;           // 3.2-second window to register 3 distinct shakes
const MIN_SHAKE_INTERVAL_MS = 220;      // Debounce window between shakes (prevents 1 jerk = 3 counts)
const REQUIRED_SHAKES = 3;              // Exact 3 firm shakes required
const COOLDOWN_MS = 8000;               // 8-second cooldown after activation
const ACCELEROMETER_INTERVAL = 40;      // 40ms polling interval (25Hz) for sharp peak capture

/**
 * Global ShakeProvider — wraps the entire application.
 * Listens to physical phone shakes with anti-jitter debouncing,
 * progressive tactile haptic feedback, and automatic navigation to the Help screen.
 */
export const ShakeProvider = ({ children, navigationRef }) => {
  const [isActive, setIsActive] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  const shakeTimestamps = useRef([]);
  const lastShakeTime = useRef(0);
  const cooldownTimer = useRef(null);
  const subscription = useRef(null);

  // Expose status to consumers
  const [shakeStatus, setShakeStatus] = useState({
    enabled: true,
    shakesDetected: 0,
    inCooldown: false,
  });

  const stopListening = useCallback(() => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    setIsActive(false);
  }, []);

  const triggerSOS = useCallback(() => {
    // Reset shake history immediately
    shakeTimestamps.current = [];
    setShakeCount(0);
    setCooldown(true);
    setShakeStatus(s => ({ ...s, inCooldown: true, shakesDetected: 0 }));

    // Distinct triple emergency vibration pattern
    Vibration.vibrate([0, 180, 80, 180, 80, 250]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    // Navigate smoothly to Help screen
    if (navigationRef?.current?.isReady()) {
      try {
        navigationRef.current.navigate('MainApp', {
          screen: 'Help',
          params: { triggerSource: 'shake' },
        });
      } catch (err) {
        console.warn('ShakeProvider: Navigation failed —', err.message);
      }
    }

    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    cooldownTimer.current = setTimeout(() => {
      setCooldown(false);
      setShakeStatus(s => ({ ...s, inCooldown: false }));
    }, COOLDOWN_MS);
  }, [navigationRef]);

  const handleAccelerometer = useCallback(({ x, y, z }) => {
    if (cooldown) return;

    // Total net magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    // Dynamic acceleration: deviation from 1.0G Earth gravity
    const dynamicG = Math.abs(magnitude - 1.0);

    const now = Date.now();

    // Must exceed threshold and satisfy minimum interval (debounce) from previous shake
    if (dynamicG > SHAKE_ACCEL_THRESHOLD && (now - lastShakeTime.current >= MIN_SHAKE_INTERVAL_MS)) {
      lastShakeTime.current = now;

      // Add timestamp
      shakeTimestamps.current.push(now);

      // Filter out timestamps that occurred outside the sliding time window
      shakeTimestamps.current = shakeTimestamps.current.filter(
        t => now - t <= SHAKE_WINDOW_MS
      );

      const count = shakeTimestamps.current.length;
      setShakeCount(count);
      setShakeStatus(s => ({ ...s, shakesDetected: count }));

      // Subtle tactile confirmation per registered shake (pocket feedback)
      if (count === 1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (count === 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }

      // If required shakes registered within window, trigger SOS
      if (count >= REQUIRED_SHAKES) {
        triggerSOS();
      }
    }
  }, [cooldown, triggerSOS]);

  const startListening = useCallback(async () => {
    stopListening();
    try {
      const isAvailable = await Accelerometer.isAvailableAsync().catch(() => false);
      if (!isAvailable) {
        setIsActive(false);
        return;
      }
      Accelerometer.setUpdateInterval(ACCELEROMETER_INTERVAL);
      subscription.current = Accelerometer.addListener(handleAccelerometer);
      setIsActive(true);
    } catch {
      setIsActive(false);
    }
  }, [handleAccelerometer, stopListening]);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, [startListening, stopListening]);

  // Manual trigger for testing and button simulation
  const manualTrigger = useCallback(() => {
    if (!cooldown) triggerSOS();
  }, [cooldown, triggerSOS]);

  const resetShake = useCallback(() => {
    shakeTimestamps.current = [];
    setShakeCount(0);
    setShakeStatus(s => ({ ...s, shakesDetected: 0 }));
  }, []);

  return (
    <ShakeContext.Provider value={{
      isActive,
      shakeCount,
      cooldown,
      shakeStatus,
      startListening,
      stopListening,
      manualTrigger,
      resetShake,
    }}>
      {children}
    </ShakeContext.Provider>
  );
};

export const useShake = () => {
  const ctx = useContext(ShakeContext);
  if (!ctx) throw new Error('useShake must be used within ShakeProvider');
  return ctx;
};
