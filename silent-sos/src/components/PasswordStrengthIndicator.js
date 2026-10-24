import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

/**
 * Calculates strength score and criterion checklist for a password.
 *
 * @param {string} password - The password string to evaluate.
 * @returns {Object} Score (0-4), label, color, and criteria breakdown.
 */
export const calculatePasswordStrength = (password = '') => {
  if (!password) {
    return {
      score: 0,
      label: 'Enter password',
      color: COLORS.textMuted,
      criteria: [
        { id: 'length', text: 'At least 8 characters', met: false },
        { id: 'mixed', text: 'Uppercase & lowercase letters', met: false },
        { id: 'number', text: 'At least one number (0-9)', met: false },
        { id: 'symbol', text: 'At least one symbol (!@#$%^&*)', met: false },
      ],
    };
  }

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasMixed = hasUpper && hasLower;
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const criteria = [
    { id: 'length', text: 'At least 8 characters', met: hasLength },
    { id: 'mixed', text: 'Uppercase & lowercase letters', met: hasMixed },
    { id: 'number', text: 'At least one number (0-9)', met: hasNumber },
    { id: 'symbol', text: 'At least one symbol (!@#$%^&*)', met: hasSymbol },
  ];

  let score = 0;
  if (hasLength) score++;
  if (hasMixed) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;

  let label = 'Weak';
  let color = COLORS.strengthWeak;

  switch (score) {
    case 1:
      label = 'Weak';
      color = COLORS.strengthWeak;
      break;
    case 2:
      label = 'Fair';
      color = COLORS.strengthFair;
      break;
    case 3:
      label = 'Good';
      color = COLORS.strengthGood;
      break;
    case 4:
      label = 'Strong & Secure';
      color = COLORS.strengthStrong;
      break;
    default:
      label = password.length > 0 ? 'Too short' : 'Enter password';
      color = COLORS.dangerLight;
  }

  return { score, label, color, criteria };
};

/**
 * PasswordStrengthIndicator Component
 *
 * Renders an animated 4-segment meter and a live criteria checklist
 * to provide immediate, actionable feedback on password security.
 *
 * @param {Object} props
 * @param {string} props.password - The current password string.
 * @param {boolean} [props.showCriteria=true] - Whether to render criteria checklist.
 * @param {Object} [props.style] - Optional override style.
 */
export const PasswordStrengthIndicator = ({
  password = '',
  showCriteria = true,
  style,
}) => {
  const { score, label, color, criteria } = useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  // If no password entered yet, don't overwhelm user
  if (!password) {
    return null;
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 4, now: score, text: label }}
      accessibilityLabel={`Password strength: ${label}`}
    >
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Password Strength</Text>
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>

      {/* 4-segment strength bar */}
      <View style={styles.meterRow}>
        {[1, 2, 3, 4].map(segmentIndex => {
          const isFilled = segmentIndex <= score;
          return (
            <View
              key={segmentIndex}
              style={[
                styles.segment,
                isFilled
                  ? { backgroundColor: color }
                  : styles.segmentEmpty,
              ]}
            />
          );
        })}
      </View>

      {/* Criteria Checklist */}
      {showCriteria && (
        <View style={styles.criteriaContainer}>
          {criteria.map(c => (
            <View key={c.id} style={styles.criteriaRow}>
              <Text style={c.met ? styles.checkIconMet : styles.checkIconUnmet}>
                {c.met ? '✓' : '○'}
              </Text>
              <Text style={[styles.criteriaText, c.met && styles.criteriaTextMet]}>
                {c.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  titleText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  statusText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.3,
  },
  meterRow: {
    flexDirection: 'row',
    gap: 6,
    height: 5,
    marginVertical: SPACING.xs,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: RADIUS.full,
  },
  segmentEmpty: {
    backgroundColor: COLORS.border,
  },
  criteriaContainer: {
    marginTop: SPACING.sm,
    gap: 4,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkIconMet: {
    fontSize: 12,
    color: COLORS.safeLight,
    fontWeight: 'bold',
  },
  checkIconUnmet: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  criteriaText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  criteriaTextMet: {
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
});
