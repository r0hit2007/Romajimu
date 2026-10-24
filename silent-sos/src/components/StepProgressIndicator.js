import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

/**
 * StepProgressIndicator Component
 *
 * Renders an accessible, smoothly animated horizontal progress bar and
 * step indicator pills for multi-step flows like onboarding.
 *
 * @param {Object} props
 * @param {number} props.currentStep - Current active step index (0-indexed).
 * @param {number} props.totalSteps - Total number of steps in sequence.
 * @param {string} [props.currentStepTitle] - Title or label of current step.
 * @param {Object} [props.style] - Container style override.
 */
export const StepProgressIndicator = ({
  currentStep,
  totalSteps,
  currentStepTitle,
  style,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const targetPercentage = totalSteps > 1
    ? (currentStep / (totalSteps - 1)) * 100
    : 100;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: targetPercentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [targetPercentage]);

  const widthInterpolation = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 1,
        max: totalSteps,
        now: currentStep + 1,
        text: `Step ${currentStep + 1} of ${totalSteps}`,
      }}
    >
      <View style={styles.metaRow}>
        {currentStepTitle ? (
          <Text style={styles.stepTitle}>{currentStepTitle}</Text>
        ) : (
          <View />
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>
      </View>

      {/* Progress Track and Animated Bar */}
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            { width: widthInterpolation },
          ]}
        />
      </View>

      {/* Discrete step dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                isCompleted && styles.dotCompleted,
                isActive && styles.dotActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 54,
    paddingBottom: SPACING.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.size.xs + 1,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  track: {
    height: 6,
    backgroundColor: COLORS.bg3,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  dotCompleted: {
    backgroundColor: COLORS.primaryLight,
  },
  dotActive: {
    width: 14,
    backgroundColor: COLORS.primary,
  },
});
