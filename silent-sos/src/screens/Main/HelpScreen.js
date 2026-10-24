import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Pressable,
  StatusBar, Alert, Vibration, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Card, StatusDot, Divider } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { sendSOSMessages, getSOSLocation, startSOSAudio } from '../../services/sosService';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.65, 260);

export default function HelpScreen() {
  const { settings, sosActive, setSosActive, sosStatus, setSosStatus, resetSosStatus } = useApp();

  const [phase, setPhase] = useState('idle'); // idle | countdown | sending | sent | cancelled
  const [countdown, setCountdown] = useState(settings.countdownDuration || 5);
  const [practiceMode, setPracticeMode] = useState(false);
  const [buttonHeld, setButtonHeld] = useState(false);
  const [accidentalMsg, setAccidentalMsg] = useState(false);

  // Animations
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const countdownOpacity = useRef(new Animated.Value(0)).current;
  const holdProgressAnim = useRef(new Animated.Value(0)).current;
  const holdTimeout = useRef(null);
  const countdownInterval = useRef(null);
  const pulseLoop = useRef(null);

  // Idle pulse animation
  useEffect(() => {
    startIdlePulse();
    return () => {
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, []);

  const startIdlePulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopIdlePulse = () => {
    if (pulseLoop.current) pulseLoop.current.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  // ─── Hold to activate ────────────────────────────────────────

  const onPressIn = () => {
    if (phase !== 'idle') return;
    setButtonHeld(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Animated.timing(holdProgressAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        startCountdown();
      }
    });

    Animated.spring(buttonScale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 200,
    }).start();
  };

  const onPressOut = () => {
    if (!buttonHeld) return;
    setButtonHeld(false);
    if (phase === 'idle') {
      // Released before countdown started
      holdProgressAnim.stopAnimation();
      Animated.timing(holdProgressAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
      Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    }
  };

  const startCountdown = () => {
    if (phase !== 'idle') return;
    stopIdlePulse();
    setPhase('countdown');
    setSosActive(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    Animated.timing(countdownOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Glow pulse during countdown
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    let c = settings.countdownDuration || 5;
    setCountdown(c);

    countdownInterval.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (c <= 0) {
        clearInterval(countdownInterval.current);
        triggerSOS();
      }
    }, 1000);
  };

  const cancelSOS = () => {
    clearInterval(countdownInterval.current);
    holdProgressAnim.setValue(0);
    glowAnim.stopAnimation();
    glowAnim.setValue(0);
    countdownOpacity.setValue(0);
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    setPhase('cancelled');
    setSosActive(false);
    setAccidentalMsg(true);
    startIdlePulse();
    setTimeout(() => {
      setPhase('idle');
      setAccidentalMsg(false);
      setCountdown(settings.countdownDuration || 5);
    }, 3000);
  };

  const sendNow = () => {
    clearInterval(countdownInterval.current);
    setCountdown(0);
    triggerSOS();
  };

  const triggerSOS = async () => {
    setPhase('sending');
    glowAnim.stopAnimation();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    Vibration.vibrate([0, 200, 100, 200]);

    const pm = practiceMode;
    const newStatus = { sms: 'pending', location: 'idle', audio: 'idle' };
    setSosStatus({ ...newStatus });

    // Build message
    let message = settings.sosMessage || 'I need help. Please contact me.';
    if (settings.requestCallback) message += ' Please call me back.';

    // 1. Get location
    if (settings.includeLocation) {
      setSosStatus(s => ({ ...s, location: 'pending' }));
      const locResult = await getSOSLocation(pm);
      if (locResult.success) {
        message += `\n\nMy location: ${locResult.mapsLink}`;
        setSosStatus(s => ({ ...s, location: 'sent' }));
      } else {
        setSosStatus(s => ({ ...s, location: 'failed' }));
      }
    }

    // 2. Send SMS
    setSosStatus(s => ({ ...s, sms: 'pending' }));
    const smsResult = await sendSOSMessages(settings.contacts, message, pm);
    setSosStatus(s => ({ ...s, sms: smsResult.success ? 'sent' : 'failed' }));

    // 3. Start audio
    if (settings.includeAudio) {
      setSosStatus(s => ({ ...s, audio: 'pending' }));
      const audioResult = await startSOSAudio(pm);
      setSosStatus(s => ({ ...s, audio: audioResult.success ? 'sent' : 'failed' }));
    }

    setPhase('sent');
  };

  const resetAll = () => {
    resetSosStatus();
    holdProgressAnim.setValue(0);
    buttonScale.setValue(1);
    countdownOpacity.setValue(0);
    glowAnim.setValue(0);
    setPhase('idle');
    setCountdown(settings.countdownDuration || 5);
    startIdlePulse();
  };

  // ─── Render ────────────────────────────────────────────────

  const holdProgress = holdProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.7],
  });

  if (phase === 'sent') {
    return <SOSSentView sosStatus={sosStatus} practiceMode={practiceMode} onReset={resetAll} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety</Text>
        <TouchableOpacity
          style={[styles.practiceToggle, practiceMode && styles.practiceToggleActive]}
          onPress={() => setPracticeMode(!practiceMode)}
          accessibilityLabel={`${practiceMode ? 'Disable' : 'Enable'} practice mode`}
        >
          <Text style={[styles.practiceText, practiceMode && styles.practiceTextActive]}>
            {practiceMode ? '🔵 Practice Mode' : '⚪ Practice Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {practiceMode && (
        <View style={styles.practiceBanner}>
          <Text style={styles.practiceBannerText}>
            🔵  Practice Mode — No real alerts will be sent
          </Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Countdown overlay */}
        {phase === 'countdown' && (
          <Animated.View style={[styles.countdownContainer, { opacity: countdownOpacity }]}>
            <Text style={styles.countdownLabel}>Sending in</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </Animated.View>
        )}

        {/* SOS Button */}
        <View style={styles.buttonArea}>
          <Animated.View style={[
            styles.glowRing,
            {
              opacity: phase === 'countdown' ? glowOpacity : 0.15,
              transform: [{ scale: pulseAnim }],
            }
          ]} />

          <Animated.View style={[styles.outerRing, { transform: [{ scale: buttonScale }] }]}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.sosButton}
              accessibilityLabel="Hold to request help"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={phase === 'countdown'
                  ? [COLORS.primary, COLORS.primaryDark, COLORS.sosMid]
                  : [COLORS.bg3, COLORS.sosMid, COLORS.sosEnd]}
                style={styles.sosGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              >
                {phase === 'idle' && (
                  <>
                    <Text style={styles.sosShieldIcon}>🛡</Text>
                    <Text style={styles.sosMainText}>Hold to ask{'\n'}for help</Text>
                    {/* Hold progress bar */}
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
                    <Text style={styles.sosCountdownText}>Sending{'\n'}soon…</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>

        {/* Cancel / Send Now buttons */}
        {phase === 'countdown' && (
          <View style={styles.actionRow}>
            <Button
              title="✕  Cancel"
              onPress={cancelSOS}
              variant="secondary"
              size="lg"
              style={styles.cancelBtn}
            />
            <Button
              title="Send now"
              onPress={sendNow}
              variant="primary"
              size="lg"
              style={styles.sendNowBtn}
            />
          </View>
        )}

        {/* Accidental activation */}
        {accidentalMsg && (
          <View style={styles.accidentalBanner}>
            <Text style={styles.accidentalText}>
              👍  No worries — that was cancelled safely. You can try again whenever you need.
            </Text>
          </View>
        )}

        {/* Status info */}
        {phase === 'idle' && (
          <View style={styles.statusInfo}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, {
                backgroundColor: settings.contacts?.filter(c => c.selectedForSOS).length > 0
                  ? COLORS.safe : COLORS.warning
              }]} />
              <Text style={styles.statusText}>
                {settings.contacts?.filter(c => c.selectedForSOS).length || 0} contact{settings.contacts?.filter(c => c.selectedForSOS).length !== 1 ? 's' : ''} configured
              </Text>
            </View>
            {settings.includeLocation && (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.statusText}>Location enabled</Text>
              </View>
            )}
            {settings.includeAudio && (
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.statusText}>Audio recording enabled</Text>
              </View>
            )}
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
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const statusLabel = { idle: '—', pending: 'Attempting…', sent: 'Sent ✓', failed: 'Failed ✗' };
  const statusColor = { idle: COLORS.textMuted, pending: COLORS.warning, sent: COLORS.safe, failed: COLORS.danger };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />
      <Animated.View style={[styles.sentContainer, { opacity: fadeAnim }]}>
        <Text style={styles.sentIcon}>{practiceMode ? '🔵' : '✅'}</Text>
        <Text style={styles.sentTitle}>
          {practiceMode ? 'Practice complete' : 'Alert sent'}
        </Text>
        <Text style={styles.sentSubtitle}>
          {practiceMode
            ? 'This was a simulation. No real messages were sent.'
            : 'We attempted to notify your trusted contacts. Stay safe.'}
        </Text>

        <Card style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>Action Status</Text>
          {['sms', 'location', 'audio'].map(action => (
            sosStatus[action] !== 'idle' ? (
              <View key={action} style={styles.statusActionRow}>
                <Text style={styles.statusActionName}>
                  {action === 'sms' ? '📨 Message' : action === 'location' ? '📍 Location' : '🎤 Audio'}
                </Text>
                <Text style={[styles.statusActionStatus, { color: statusColor[sosStatus[action]] }]}>
                  {statusLabel[sosStatus[action]]}
                </Text>
              </View>
            ) : null
          ))}
        </Card>

        {!practiceMode && (
          <View style={styles.emergencyNote}>
            <Text style={styles.emergencyNoteText}>
              If you are in immediate danger, call emergency services (911, 999, 112) directly.
            </Text>
          </View>
        )}

        <Button
          title="← Return to safety screen"
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
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.base,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },
  practiceToggle: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  practiceToggleActive: { borderColor: COLORS.primary + '66', backgroundColor: COLORS.primaryGlow },
  practiceText: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weight.medium },
  practiceTextActive: { color: COLORS.primaryLight },
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
  buttonArea: { alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl },
  glowRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 80,
    height: BUTTON_SIZE + 80,
    borderRadius: (BUTTON_SIZE + 80) / 2,
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
  sosShieldIcon: { fontSize: 42, marginBottom: SPACING.sm },
  sosMainText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  sosCountdownText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  holdProgress: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  holdProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  countdownContainer: {
    position: 'absolute',
    top: -60,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  countdownNumber: {
    fontSize: TYPOGRAPHY.size.display,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.primaryLight,
    lineHeight: 56,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.base,
  },
  cancelBtn: { flex: 1 },
  sendNowBtn: { flex: 1 },
  accidentalBanner: {
    backgroundColor: COLORS.safeDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.safe + '44',
    marginTop: SPACING.lg,
  },
  accidentalText: { color: COLORS.safeLight, fontSize: TYPOGRAPHY.size.sm, textAlign: 'center', lineHeight: 20 },
  statusInfo: { marginTop: SPACING.xl, gap: SPACING.sm, alignItems: 'flex-start', width: '100%' },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.sm },
  statusText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.size.sm },
  // Sent view
  sentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
    alignItems: 'center',
  },
  sentIcon: { fontSize: 72, marginBottom: SPACING.lg },
  sentTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    marginBottom: SPACING.md,
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
