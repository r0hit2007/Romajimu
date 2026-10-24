import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { Button } from './Button';

/**
 * SuccessAnimation Component
 *
 * Renders an animated celebratory checkmark with expanding halo pulse,
 * title, description, and action button.
 *
 * @param {Object} props
 * @param {string} props.title - Success title text.
 * @param {string} props.description - Detailed explanation message.
 * @param {string} [props.buttonTitle] - Optional action button title.
 * @param {Function} [props.onButtonPress] - Action button click handler.
 * @param {string} [props.icon='✓'] - Success symbol.
 * @param {React.ReactNode} [props.extraContent] - Optional extra children below text.
 * @param {Object} [props.style] - Override container style.
 */
export const SuccessAnimation = ({
  title,
  description,
  buttonTitle,
  onButtonPress,
  icon = '✓',
  extraContent,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const haloAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(haloAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(haloAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconWrapper}>
        <Animated.View
          style={[
            styles.haloRing,
            {
              transform: [{ scale: haloAnim }],
              opacity: haloAnim.interpolate({
                inputRange: [0.4, 1],
                outputRange: [0.3, 0.8],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.iconText}>{icon}</Text>
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {extraContent}

      {buttonTitle && onButtonPress ? (
        <Button
          title={buttonTitle}
          onPress={onButtonPress}
          variant="primary"
          size="lg"
          style={styles.actionButton}
        />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.safe + '44',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  haloRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.safeDim,
    borderWidth: 2,
    borderColor: COLORS.safeLight + '66',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.safe,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  iconText: {
    fontSize: 34,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.sm,
  },
  actionButton: {
    marginTop: SPACING.xl,
    width: '100%',
  },
});
