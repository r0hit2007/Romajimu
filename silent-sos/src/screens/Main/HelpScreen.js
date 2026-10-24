import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Pressable,
  StatusBar, Vibration, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { useShake } from '../../context/ShakeContext';
import { Button } from '../../components/Button';
import { Card } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { sendSOSMessages, getSOSLocation, startSOSAudio, stopSOSAudio } from '../../services/sosService';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.65, 260);

export default function HelpScreen() {
  const { settings, setSosActive, sosStatus, setSosStatus, resetSosStatus } = useApp();
  const { shakeStatus } = useShake();

  const [phase, setPhase] = useState('idle'); // idle | countdown | sending | sent | cancelled
  const [countdown, setCountdown] = useState(settings?.countdownDuration || 5);
  const [practiceMode, setPracticeMode] = useState(false);
  const [buttonHeld, setButtonHeld] = useState(false);
  const [accidentalMsg, setAccidentalMsg] = useState(false);
  const [shakeTriggered, setShakeTriggered] = useState(false);

  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const countdownScale = useRef(new Animated.Value(1)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const shakeRingAnim = useRef(new Animated.Value(0)).current;
  const radarRing1 = useRef(new Animated.Value(1)).current;
  const radarRing2 = useRef(new Animated.Value(1)).current;

  // Refs for timers and loops
  const countdownInterval = useRef(null);
  const autoStartTimer = useRef(null);
  const pulseLoop = useRef(null);
  const radarLoop = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    startIdlePulse();
    return () => {
      isMounted.current = false;
      cleanupTimers();
    };
  }, []);

  const cleanupTimers = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (autoStartTimer.current) clearTimeout(autoStartTimer.current);
    if (pulseLoop.current) pulseLoop.current.stop();
    if (radarLoop.current) radarLoop.current.stop();
  };

  // ── Track if shake brought us here ──────────────────────
  useEffect(() => {
    if (shakeStatus?.inCooldown && phase === 'idle') {
      setShakeTriggered(true);
      // Flash the shake indicator ring
      Animated.sequence([
        Animated.timing(shakeRingAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(150),
        Animated.timing(shakeRingAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();

      // Automatically engage countdown
      autoStartTimer.current = setTimeout(() => {
        if (isMounted.current && phase === 'idle') {
          startCountdown();
        }
      }, 600);
    }
  }, [shakeStatus?.inCooldown]);

  // ── Idle Pulse Animation ────────────────────────────────
  const startIdlePulse = () => {
    if (pulseLoop.current) pulseLoop.current.stop();
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopIdlePulse = () => {
    if (pulseLoop.current) pulseLoop.current.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  // ── Radar Waves during Countdown ─────────────────────────
  const startRadarAnimation = () => {
    radarRing1.setValue(1);
    radarRing2.setValue(1);
    radarLoop.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(radarRing1, { toValue: 1.45, duration: 1200, useNativeDriver: true }),
          Animated.timing(radarRing1, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(radarRing2, { toValue: 1.45, duration: 1200, useNativeDriver: true }),
          Animated.timing(radarRing2, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    radarLoop.current.start();
  };

  const stopRadarAnimation = () => {
    if (radarLoop.current) radarLoop.current.stop();
    radarRing1.setValue(1);
    radarRing2.setValue(1);
  };

  // ── Hold to Activate Interaction ─────────────────────────
  const onPressIn = () => {
    if (phase !== 'idle') return;
    setButtonHeld(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Compress button smoothly
    Animated.spring(buttonScale, {
      toValue: 0.93,
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    }).start();

    // 800ms activation progress
    Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && isMounted.current) {
        startCountdown();
      }
    });
  };

  const onPressOut = () => {
    if (!buttonHeld) return;
    setButtonHeld(false);
    if (phase === 'idle') {
      holdProgressAnim.stopAnimation();
      Animated.timing(holdProgressAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
      Animated.spring(buttonScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    }
  };

  // ── Start Countdown ──────────────────────────────────────
  const startCountdown = () => {
    if (phase !== 'idle') return;
    stopIdlePulse();
    startRadarAnimation();
    setPhase('countdown');
    setSosActive(true);
    setShakeTriggered(false);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.timing(countdownOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.25, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    let currentCount = settings?.countdownDuration || 5;
    setCountdown(currentCount);

    if (countdownInterval.current) clearInterval(countdownInterval.current);
    countdownInterval.current = setInterval(() => {
      currentCount -= 1;
      if (!isMounted.current) return;

      setCountdown(currentCount);

      // Pulse countdown number with haptic impact on each tick
      countdownScale.setValue(1.35);
      Animated.spring(countdownScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

      if (currentCount <= 0) {
        clearInterval(countdownInterval.current);
        triggerSOS();
      }
    }, 1000);
  };

  // ── Cancel SOS ───────────────────────────────────────────
  const cancelSOS = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (autoStartTimer.current) clearTimeout(autoStartTimer.current);

    stopRadarAnimation();
    stopSOSAudio().catch(() => {});

    holdProgressAnim.setValue(0);
    glowAnim.stopAnimation();
    glowAnim.setValue(0);
    countdownOpacity.setValue(0);
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPhase('cancelled');
    setSosActive(false);
    setShakeTriggered(false);
    setAccidentalMsg(true);
    startIdlePulse();

    setTimeout(() => {
      if (isMounted.current) {
        setPhase('idle');
        setAccidentalMsg(false);
        setCountdown(settings?.countdownDuration || 5);
      }
    }, 2800);
  };

  const sendNow = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    setCountdown(0);
    triggerSOS();
  };

  // ── Trigger SOS Dispatch ─────────────────────────────────
  const triggerSOS = async () => {
    setPhase('sending');
    stopRadarAnimation();
    glowAnim.stopAnimation();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Vibration.vibrate([0, 220, 100, 220, 100, 300]);

    const pm = practiceMode;
    setSosStatus({ sms: 'pending', location: 'idle', audio: 'idle' });

    let message = settings?.sosMessage || 'I need help. Please contact me immediately.';
    if (settings?.requestCallback) message += ' Please call me back right away.';

    // Safe contacts resolution
    const contacts = Array.isArray(settings?.contacts) ? settings.contacts : [];

    // 1. Parallel Task: Location Acquisition
    let locationTask = Promise.resolve(null);
    if (settings?.includeLocation) {
      setSosStatus(s => ({ ...s, location: 'pending' }));
      locationTask = getSOSLocation(pm).then(locResult => {
        if (locResult && locResult.success) {
          message += `\n\n📍 My Live GPS Location:\n${locResult.mapsLink}`;
          setSosStatus(s => ({ ...s, location: 'sent' }));
        } else {
          setSosStatus(s => ({ ...s, location: 'failed' }));
        }
        return locResult;
      }).catch(() => {
        setSosStatus(s => ({ ...s, location: 'failed' }));
      });
    }

    // 2. Parallel Task: Audio Recording
    let audioTask = Promise.resolve(null);
    if (settings?.includeAudio) {
      setSosStatus(s => ({ ...s, audio: 'pending' }));
      audioTask = startSOSAudio(pm).then(audioResult => {
        setSosStatus(s => ({ ...s, audio: audioResult && audioResult.success ? 'sent' : 'failed' }));
      }).catch(() => {
        setSosStatus(s => ({ ...s, audio: 'failed' }));
      });
    }

    // Await location with quick timeout before sending SMS payload
    await Promise.race([locationTask, new Promise(r => setTimeout(r, 2500))]);

    // 3. Dispatch SMS
    setSosStatus(s => ({ ...s, sms: 'pending' }));
    try {
      const smsResult = await sendSOSMessages(contacts, message, pm);
      setSosStatus(s => ({ ...s, sms: smsResult && smsResult.success ? 'sent' : 'failed' }));
    } catch {
      setSosStatus(s => ({ ...s, sms: 'failed' }));
    }

    // Ensure audio completes setup in background
    await audioTask;

    if (isMounted.current) {
      setPhase('sent');
    }
  };

  const resetAll = () => {
    resetSosStatus();
    cleanupTimers();
    holdProgressAnim.setValue(0);
    buttonScale.setValue(1);
    countdownOpacity.setValue(0);
    glowAnim.setValue(0);
    setPhase('idle');
    setShakeTriggered(false);
    setCountdown(settings?.countdownDuration || 5);
    startIdlePulse();
  };

  // Interpolated Styles
  const holdProgress = holdProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.75],
  });

  const shakeRingOpacity = shakeRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.85],
  });

  const shakeRingScale = shakeRingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });

  const radarOpacity1 = radarRing1.interpolate({
    inputRange: [1, 1.45],
    outputRange: [0.6, 0],
  });

  const radarOpacity2 = radarRing2.interpolate({
    inputRange: [1, 1.45],
    outputRange: [0.6, 0],
  });

  if (phase === 'sent') {
    return <SOSSentView sosStatus={sosStatus} practiceMode={practiceMode} onReset={resetAll} />;
  }

  const activeContactsCount = (settings?.contacts || []).filter(c => c && c.selectedForSOS).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Safety</Text>
          {!shakeStatus?.inCooldown ? (
            <View style={styles.shakeStatusRow}>
              <View style={styles.shakeDotRow}>
                {[0, 1, 2].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.shakeDot,
                      { backgroundColor: i < (shakeStatus?.shakesDetected || 0) ? COLORS.warning : COLORS.border }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.shakeStatusText}>
                {(shakeStatus?.shakesDetected || 0) > 0
                  ? `${shakeStatus.shakesDetected}/3 shakes detected`
                  : 'Shake phone 3× for instant SOS'}
              </Text>
            </View>
          ) : (
            <View style={styles.shakeStatusRow}>
              <Text style={styles.cooldownText}>⏳ Shake cooldown (8s)</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.practiceToggle, practiceMode && styles.practiceToggleActive]}
          onPress={() => setPracticeMode(!practiceMode)}
          accessibilityLabel={`${practiceMode ? 'Disable' : 'Enable'} practice mode`}
        >
          <Text style={[styles.practiceText, practiceMode && styles.practiceTextActive]}>
            {practiceMode ? '🔵 Practice' : '⚪ Practice'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Shake Trigger Notification Banner */}
      {shakeTriggered && (
        <View style={styles.shakeTriggeredBanner}>
          <Text style={styles.shakeTriggeredText}>
            📳 Shake detected — auto-countdown initiated
          </Text>
        </View>
      )}

      {practiceMode && (
        <View style={styles.practiceBanner}>
          <Text style={styles.practiceBannerText}>🔵 Practice Mode — Simulating dispatch (No real SMS sent)</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Animated Countdown Indicator */}
        {phase === 'countdown' && (
          <Animated.View style={[styles.countdownContainer, { opacity: countdownOpacity }]}>
            <Text style={styles.countdownLabel}>DISPATCHING IN</Text>
            <Animated.Text style={[styles.countdownNumber, { transform: [{ scale: countdownScale }] }]}>
              {countdown}
            </Animated.Text>
          </Animated.View>
        )}

        {/* SOS Button Area */}
        <View style={styles.buttonArea}>
          {/* Shake Trigger Flash Ring */}
          <Animated.View
            style={[
              styles.shakeRing,
              { opacity: shakeRingOpacity, transform: [{ scale: shakeRingScale }] }
            ]}
          />

          {/* Radar Beacon Concentric Waves */}
          {phase === 'countdown' && (
            <>
              <Animated.View
                style={[
                  styles.radarRing,
                  { opacity: radarOpacity1, transform: [{ scale: radarRing1 }] }
                ]}
              />
              <Animated.View
                style={[
                  styles.radarRing,
                  { opacity: radarOpacity2, transform: [{ scale: radarRing2 }] }
                ]}
              />
            </>
          )}

          {/* Idle Glow Ring */}
          <Animated.View
            style={[
              styles.glowRing,
              {
                opacity: phase === 'countdown' ? glowOpacity : 0.18,
                transform: [{ scale: pulseAnim }],
              }
            ]}
          />

          {/* Main Button Shell */}
          <Animated.View style={[styles.outerRing, { transform: [{ scale: buttonScale }] }]}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.sosButton}
              accessibilityLabel="Hold to request emergency help"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={phase === 'countdown'
                  ? [COLORS.dangerLight || '#E06A60', COLORS.danger || '#C0544A', '#801A18']
                  : [COLORS.primaryDark, COLORS.sosMid, COLORS.sosEnd]}
                style={styles.sosGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                {phase === 'idle' && (
                  <>
                    <Text style={styles.sosShieldIcon}>🛡</Text>
                    <Text style={styles.sosMainText}>
                      {buttonHeld ? 'Keep holding…' : 'Hold to ask\nfor help'}
                    </Text>
                    {buttonHeld && (
                      <View style={styles.holdProgress}>
                        <Animated.View style={[styles.holdProgressFill, { width: holdProgress }]} />
                      </View>
                    )}
                  </>
                )}
                {phase === 'countdown' && (
                  <>
                    <Text style={styles.sosShieldIcon}>⚡</Text>
                    <Text style={styles.sosCountdownText}>Alerting\ncontacts…</Text>
                  </>
                )}
                {phase === 'sending' && (
                  <>
                    <Text style={styles.sosShieldIcon}>📡</Text>
                    <Text style={styles.sosCountdownText}>Sending\nnow…</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Action Controls during Countdown */}
        {phase === 'countdown' && (
          <View style={styles.actionRow}>
            <Button
              title="✕ Cancel Alert"
              onPress={cancelSOS}
              variant="secondary"
              size="lg"
              style={styles.flex1}
            />
            <Button
              title="Send Now ➔"
              onPress={sendNow}
              variant="primary"
              size="lg"
              style={styles.flex1}
            />
          </View>
        )}

        {/* Accidental Activation Reassurance */}
        {accidentalMsg && (
          <View style={styles.accidentalBanner}>
            <Text style={styles.accidentalText}>
              👍 Safe — Countdown cancelled cleanly. No messages were dispatched.
            </Text>
          </View>
        )}

        {/* Idle System Status */}
        {phase === 'idle' && (
          <View style={styles.statusInfo}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, {
                backgroundColor: activeContactsCount > 0 ? COLORS.safe : COLORS.warning
              }]} />
              <Text style={styles.statusText}>
                {activeContactsCount} emergency contact{activeContactsCount !== 1 ? 's' : ''} armed
              </Text>
            </View>
            {settings?.includeLocation && (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.statusText}>Live GPS location sharing active</Text>
              </View>
            )}
            {settings?.includeAudio && (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.statusText}>
                  Audio evidence recording enabled{' '}
                  <Text style={styles.statusNote}>(silent background)</Text>
                </Text>
              </View>
            )}
            <View style={styles.honestNote}>
              <Text style={styles.honestNoteText}>
                ⚠️ Delivery relies on cellular SMS & GPS. Always dial 112/911 directly if in immediate danger.
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Sent View ─────────────────────────────────────────────
function SOSSentView({ sosStatus, practiceMode, onReset }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const statusLabel = { idle: '—', pending: 'Attempting…', sent: 'Sent ✓', failed: 'Failed ✗' };
  const statusColor = { idle: COLORS.textMuted, pending: COLORS.warning, sent: COLORS.safe, failed: COLORS.danger };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[styles.sentContainer, { opacity: fadeAnim }]}>
        <Text style={styles.sentIcon}>{practiceMode ? '🔵' : '✅'}</Text>
        <Text style={styles.sentTitle}>{practiceMode ? 'Practice Complete' : 'Emergency SOS Sent'}</Text>
        <Text style={styles.sentSubtitle}>
          {practiceMode
            ? 'This was a safe simulation. No live messages were transmitted.'
            : 'Alert transmitted to your emergency circle with coordinates. Stay calm and seek safety.'}
        </Text>

        <Card style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>Dispatch Telemetry</Text>
          {['sms', 'location', 'audio'].map(action =>
            sosStatus && sosStatus[action] !== 'idle' ? (
              <View key={action} style={styles.statusActionRow}>
                <Text style={styles.statusActionName}>
                  {action === 'sms' ? '📨 SMS Transmission' : action === 'location' ? '📍 GPS Coordinates' : '🎙️ Audio Evidence'}
                </Text>
                <Text style={[styles.statusActionStatus, { color: statusColor[sosStatus[action]] || COLORS.text }]}>
                  {statusLabel[sosStatus[action]] || 'Sent'}
                </Text>
              </View>
            ) : null
          )}
        </Card>

        {!practiceMode && (
          <View style={styles.emergencyNote}>
            <Text style={styles.emergencyNoteText}>
              Emergency Services: Call 112 / 911 / 999 directly if you can safely speak.
            </Text>
          </View>
        )}

        <Button
          title="← Return to Safety Center"
          onPress={onReset}
          variant="ghost"
          size="md"
          style={{ marginTop: SPACING.xl }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: 54,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  shakeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  shakeDotRow: { flexDirection: 'row', gap: 4 },
  shakeDot: { width: 8, height: 8, borderRadius: 4 },
  shakeStatusText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted },
  cooldownText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.warning },
  practiceToggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  practiceToggleActive: {
    borderColor: COLORS.primary + '66',
    backgroundColor: COLORS.primaryGlow,
  },
  practiceText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weight.medium },
  practiceTextActive: { color: COLORS.primaryLight },
  shakeTriggeredBanner: {
    backgroundColor: COLORS.warningDim,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
  },
  shakeTriggeredText: { color: COLORS.warningLight, fontSize: TYPOGRAPHY.size.sm, textAlign: 'center', fontWeight: '600' },
  practiceBanner: {
    backgroundColor: COLORS.primaryGlow,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
  },
  practiceBannerText: { color: COLORS.primaryLight, fontSize: TYPOGRAPHY.size.sm, textAlign: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  buttonArea: { alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl, position: 'relative' },
  shakeRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 130,
    height: BUTTON_SIZE + 130,
    borderRadius: (BUTTON_SIZE + 130) / 2,
    backgroundColor: COLORS.warning,
  },
  radarRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 110,
    height: BUTTON_SIZE + 110,
    borderRadius: (BUTTON_SIZE + 110) / 2,
    borderWidth: 2,
    borderColor: COLORS.dangerLight || '#E06A60',
  },
  glowRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 75,
    height: BUTTON_SIZE + 75,
    borderRadius: (BUTTON_SIZE + 75) / 2,
    backgroundColor: COLORS.primary,
  },
  outerRing: {
    width: BUTTON_SIZE + 16,
    height: BUTTON_SIZE + 16,
    borderRadius: (BUTTON_SIZE + 16) / 2,
    backgroundColor: COLORS.bg3,
    borderWidth: 2,
    borderColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sos,
  },
  sosButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primary + '55',
  },
  sosGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BUTTON_SIZE / 2,
  },
  sosShieldIcon: { fontSize: 44, marginBottom: SPACING.sm },
  sosMainText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 25,
  },
  sosCountdownText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 28,
  },
  holdProgress: {
    position: 'absolute',
    bottom: 22,
    left: 30,
    right: 30,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  holdProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
  },
  countdownContainer: {
    position: 'absolute',
    top: -72,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    letterSpacing: 2,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  countdownNumber: {
    fontSize: 54,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: '#FF7B72',
    lineHeight: 62,
    fontFamily: TYPOGRAPHY.fontFamily.mono || 'System',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.base,
    width: '100%',
  },
  flex1: { flex: 1 },
  accidentalBanner: {
    backgroundColor: COLORS.safeDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.safe + '44',
    marginTop: SPACING.lg,
  },
  accidentalText: {
    color: COLORS.safeLight,
    fontSize: TYPOGRAPHY.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  statusInfo: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    alignItems: 'flex-start',
    width: '100%',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
  statusText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.size.sm },
  statusNote: { color: COLORS.textMuted, fontStyle: 'italic' },
  honestNote: {
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    width: '100%',
  },
  honestNoteText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.xs, lineHeight: 18 },
  sentContainer: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: 70, alignItems: 'center' },
  sentIcon: { fontSize: 68, marginBottom: SPACING.lg },
  sentTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  sentSubtitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  statusCard: { width: '100%', marginBottom: SPACING.base },
  statusCardTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  statusActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusActionName: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text },
  statusActionStatus: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold },
  emergencyNote: {
    backgroundColor: COLORS.warningDim,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
    width: '100%',
  },
  emergencyNoteText: { color: COLORS.warningLight, fontSize: TYPOGRAPHY.size.sm, textAlign: 'center', lineHeight: 20 },
});
