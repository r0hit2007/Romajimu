import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Vibration, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';

const ShakeContext = createContext(null);

const SHAKE_THRESHOLD = 1.5;       // g-force threshold per axis
const SHAKE_WINDOW_MS = 3000;       // 3-second window to register 3 shakes
const REQUIRED_SHAKES = 3;          // number of shakes required
const COOLDOWN_MS = 10000;          // 10-second cooldown after trigger
const ACCELEROMETER_INTERVAL = 100; // polling interval (ms)

/**
 * Global ShakeProvider — wraps the entire app.
 * When 3 shakes occur within 3 seconds, it calls the registered onShake callback.
 */
export const ShakeProvider = ({ children, navigationRef }) => {
  const [isActive, setIsActive] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const [cooldown, setCooldown] = useState(false);

  const shakeTimestamps = useRef([]);
  const lastMagnitude = useRef(0);
  const cooldownTimer = useRef(null);
  const subscription = useRef(null);

  // Expose shake status to consumers
  const [shakeStatus, setShakeStatus] = useState({
    enabled: true,
    shakesDetected: 0,
    inCooldown: false,
  });

  useEffect(() => {
    startListening();
    return () => stopListening();
  }, []);

  const startListening = () => {
    Accelerometer.setUpdateInterval(ACCELEROMETER_INTERVAL);
    subscription.current = Accelerometer.addListener(handleAccelerometer);
    setIsActive(true);
  };

  const stopListening = () => {
    if (subscription.current) {
      subscription.current.remove();
      subscription.current = null;
    }
    setIsActive(false);
  };

  const handleAccelerometer = ({ x, y, z }) => {
    if (cooldown) return;

    // Calculate net magnitude (subtract gravity)
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(magnitude - lastMagnitude.current);
    lastMagnitude.current = magnitude;

    // Detect a shake: sudden magnitude change above threshold
    if (magnitude > SHAKE_THRESHOLD && delta > 0.5) {
      const now = Date.now();

      // Add timestamp
      shakeTimestamps.current.push(now);

      // Purge timestamps older than the window
      shakeTimestamps.current = shakeTimestamps.current.filter(
        t => now - t <= SHAKE_WINDOW_MS
      );

      const count = shakeTimestamps.current.length;
      setShakeCount(count);
      setShakeStatus(s => ({ ...s, shakesDetected: count }));

      // Trigger SOS if threshold met
      if (count >= REQUIRED_SHAKES) {
        triggerSOS();
      }
    }
  };

  const triggerSOS = () => {
    // Reset shake history immediately
    shakeTimestamps.current = [];
    setShakeCount(0);

    // Start cooldown
    setCooldown(true);
    setShakeStatus(s => ({ ...s, inCooldown: true, shakesDetected: 0 }));
    Vibration.vibrate([0, 200, 100, 200, 100, 200]);

    // Navigate to Help screen
    if (navigationRef?.current?.isReady()) {
      try {
        navigationRef.current.navigate('MainApp', { screen: 'Help' });
      } catch (err) {
        // Navigation may not be ready (e.g. on auth screens) — silently skip
        console.warn('ShakeProvider: Could not navigate —', err.message);
      }
    }

    // Clear cooldown after 10 seconds
    cooldownTimer.current = setTimeout(() => {
      setCooldown(false);
      setShakeStatus(s => ({ ...s, inCooldown: false }));
    }, COOLDOWN_MS);
  };

  // Manual trigger for testing
  const manualTrigger = () => {
    if (!cooldown) triggerSOS();
  };

  return (
    <ShakeContext.Provider value={{
      isActive,
      shakeCount,
      cooldown,
      shakeStatus,
      startListening,
      stopListening,
      manualTrigger,
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
