import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

/**
 * Reusable Button Component for Silent SOS.
 *
 * Supports micro-interactions with physics-based spring scaling,
 * multiple color variants, loading spinners, and accessibility standards.
 *
 * @param {Object} props
 * @param {string} props.title - Text label displayed inside button.
 * @param {Function} props.onPress - Tap handler callback.
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'safe' | 'outline'} [props.variant='primary'] - Visual style variant.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Sizing preset.
 * @param {boolean} [props.loading=false] - When true, shows activity indicator and disables interaction.
 * @param {boolean} [props.disabled=false] - When true, dims button and disables interaction.
 * @param {Object} [props.style] - Optional override style for button container.
 * @param {Object} [props.textStyle] - Optional override style for button text label.
 * @param {string} [props.icon] - Optional emoji or icon string placed before title.
 * @param {string} [props.accessibilityLabel] - Optional custom accessibility label.
 * @param {string} [props.accessibilityHint] - Optional accessibility action hint.
 */
export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 250,
      friction: 12,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 250,
      friction: 12,
    }).start();
  };

  const variantStyles = {
    primary: {
      button: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryLight,
        borderWidth: 1,
        ...SHADOWS.primary,
      },
      text: { color: COLORS.white },
      spinnerColor: COLORS.white,
    },
    secondary: {
      button: {
        backgroundColor: COLORS.surface,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
      },
      text: { color: COLORS.text },
      spinnerColor: COLORS.primaryLight,
    },
    outline: {
      button: {
        backgroundColor: COLORS.transparent,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
      },
      text: { color: COLORS.primaryLight },
      spinnerColor: COLORS.primaryLight,
    },
    ghost: {
      button: {
        backgroundColor: COLORS.transparent,
        borderWidth: 0,
      },
      text: { color: COLORS.primaryLight },
      spinnerColor: COLORS.primaryLight,
    },
    danger: {
      button: {
        backgroundColor: COLORS.dangerDim,
        borderWidth: 1.5,
        borderColor: COLORS.danger,
      },
      text: { color: COLORS.dangerLight },
      spinnerColor: COLORS.dangerLight,
    },
    safe: {
      button: {
        backgroundColor: COLORS.safe,
        borderWidth: 1,
        borderColor: COLORS.safeLight,
        ...SHADOWS.md,
      },
      text: { color: COLORS.white },
      spinnerColor: COLORS.white,
    },
  };

  const sizeStyles = {
    sm: {
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.base,
      borderRadius: RADIUS.md,
      minHeight: 38,
    },
    md: {
      paddingVertical: SPACING.md + 1,
      paddingHorizontal: SPACING.xl,
      borderRadius: RADIUS.lg,
      minHeight: 48,
    },
    lg: {
      paddingVertical: SPACING.base + 2,
      paddingHorizontal: SPACING.xxl,
      borderRadius: RADIUS.xl,
      minHeight: 56,
    },
  };

  const textSizes = {
    sm: TYPOGRAPHY.size.sm,
    md: TYPOGRAPHY.size.base,
    lg: TYPOGRAPHY.size.md,
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const isInteractive = !disabled && !loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={isInteractive ? onPressIn : undefined}
        onPressOut={isInteractive ? onPressOut : undefined}
        disabled={!isInteractive}
        activeOpacity={0.85}
        style={[
          styles.base,
          sizeStyles[size],
          currentVariant.button,
          (disabled || loading) && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: !isInteractive,
          busy: loading,
        }}
      >
        {loading ? (
          <ActivityIndicator
            color={currentVariant.spinnerColor}
            size={size === 'lg' ? 'small' : 'small'}
          />
        ) : (
          <Text
            style={[
              styles.text,
              { fontSize: textSizes[size] },
              currentVariant.text,
              textStyle,
            ]}
          >
            {icon ? `${icon}  ${title}` : title}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: TYPOGRAPHY.weight.semibold,
    letterSpacing: 0.4,
  },
  disabled: {
    opacity: 0.45,
  },
});
