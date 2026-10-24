import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

/**
 * Reusable AuthCard Container Component
 *
 * Provides a unified dark-mode card enclosure for login, registration,
 * and recovery workflows with optional title, subtitle, and error banner.
 *
 * @param {Object} props
 * @param {string} [props.title] - Section heading.
 * @param {string} [props.subtitle] - Section description/subtitle.
 * @param {string} [props.error] - Top-level alert message string.
 * @param {React.ReactNode} props.children - Form inputs and action buttons.
 * @param {Object} [props.style] - Optional override style.
 */
export const AuthCard = ({
  title,
  subtitle,
  error,
  children,
  style,
}) => {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.heading}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subheading}>{subtitle}</Text> : null}

      {error ? (
        <View
          style={styles.errorBanner}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.md,
  },
  heading: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.danger + '55',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    color: COLORS.dangerLight,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    lineHeight: 18,
  },
});
