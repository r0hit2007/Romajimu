import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../constants/theme';

/**
 * Reusable AuthHeader Component
 *
 * Renders the Silent SOS brand emblem with a glowing dual-ring layout,
 * title, and subtitle, featuring a subtle entrance spring animation.
 *
 * @param {Object} props
 * @param {string} [props.title='Silent SOS'] - Main application title.
 * @param {string} [props.subtitle='Your discreet safety companion'] - Subtitle or motto.
 * @param {string} [props.icon='🛡️'] - Shield or lock icon emoji.
 * @param {boolean} [props.compact=false] - Compact mode for screens needing more vertical space.
 * @param {Object} [props.style] - Optional override style.
 */
export const AuthHeader = ({
  title = 'Silent SOS',
  subtitle = 'Your discreet safety companion',
  icon = '🛡️',
  compact = false,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Gentle breathing pulse animation for the shield emblem
    Animated.parallel([
      Animated.spring(pulseAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0.8,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <Animated.View
        style={[
          styles.logoRingOuter,
          compact && styles.logoRingOuterCompact,
          {
            transform: [{ scale: pulseAnim }],
            opacity: glowAnim,
          },
        ]}
      >
        <View style={[styles.logoRingInner, compact && styles.logoRingInnerCompact]}>
          <Text style={[styles.logoIcon, compact && styles.logoIconCompact]}>
            {icon}
          </Text>
        </View>
      </Animated.View>

      <Text style={[styles.appName, compact && styles.appNameCompact]}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={[styles.tagline, compact && styles.taglineCompact]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  containerCompact: {
    marginBottom: SPACING.lg,
  },
  logoRingOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.primaryLight + '55',
    backgroundColor: 'rgba(74, 144, 217, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoRingOuterCompact: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: SPACING.sm,
  },
  logoRingInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight + '44',
  },
  logoRingInnerCompact: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  logoIcon: {
    fontSize: 34,
  },
  logoIconCompact: {
    fontSize: 26,
  },
  appName: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  appNameCompact: {
    fontSize: TYPOGRAPHY.size.xl,
  },
  tagline: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  taglineCompact: {
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: 2,
  },
});
