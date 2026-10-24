import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary | secondary | ghost | danger
  size = 'md',         // sm | md | lg
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  };

  const variantStyles = {
    primary: {
      button: { backgroundColor: COLORS.primary },
      text: { color: COLORS.white },
    },
    secondary: {
      button: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
      text: { color: COLORS.text },
    },
    ghost: {
      button: { backgroundColor: COLORS.transparent },
      text: { color: COLORS.primary },
    },
    danger: {
      button: { backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: COLORS.danger },
      text: { color: COLORS.dangerLight },
    },
    safe: {
      button: { backgroundColor: COLORS.safeDim, borderWidth: 1, borderColor: COLORS.safe },
      text: { color: COLORS.safeLight },
    },
  };

  const sizeStyles = {
    sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base, borderRadius: RADIUS.md },
    md: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.lg },
    lg: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxl, borderRadius: RADIUS.xl },
  };

  const textSizes = {
    sm: TYPOGRAPHY.size.sm,
    md: TYPOGRAPHY.size.base,
    lg: TYPOGRAPHY.size.md,
  };

  const vs = variantStyles[variant] || variantStyles.primary;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          sizeStyles[size],
          vs.button,
          disabled && styles.disabled,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {loading ? (
          <ActivityIndicator color={vs.text.color} size="small" />
        ) : (
          <Text style={[
            styles.text,
            { fontSize: textSizes[size] },
            vs.text,
            textStyle,
          ]}>
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
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.4,
  },
});
