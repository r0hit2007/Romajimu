import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

/**
 * Universal Card Component
 *
 * Provides a structured surface container with optional touch feedback,
 * selection outline, and elevation variants.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} [props.style]
 * @param {Function} [props.onPress]
 * @param {boolean} [props.selected=false]
 * @param {'default' | 'highlight' | 'elevated'} [props.variant='default']
 */
export const Card = ({
  children,
  style,
  onPress,
  selected = false,
  variant = 'default',
  ...props
}) => {
  const variantStyle = {
    default: styles.cardDefault,
    highlight: styles.cardHighlight,
    elevated: styles.cardElevated,
  }[variant] || styles.cardDefault;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.card,
          variantStyle,
          selected && styles.cardSelected,
          style,
        ]}
        accessibilityRole="button"
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.card,
        variantStyle,
        selected && styles.cardSelected,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * SettingRow Component
 *
 * Configurable row item with icon, title, subtitle, and right-aligned control (toggle switch or custom).
 */
export const SettingRow = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  type = 'toggle', // toggle | info | navigate
  rightElement,
  disabled = false,
}) => (
  <View style={[styles.settingRow, disabled && styles.settingDisabled]}>
    {icon && <Text style={styles.settingIcon}>{icon}</Text>}
    <View style={styles.settingText}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {type === 'toggle' && (
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={value ? COLORS.white : COLORS.textSecondary}
        ios_backgroundColor={COLORS.border}
        accessibilityRole="switch"
        accessibilityLabel={`Toggle ${title}`}
        accessibilityState={{ checked: value, disabled }}
      />
    )}
    {rightElement && rightElement}
  </View>
);

/**
 * SectionHeader Component
 */
export const SectionHeader = ({ title, subtitle, rightElement, style }) => (
  <View style={[styles.sectionHeaderRow, style]}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement && rightElement}
  </View>
);

/**
 * Badge Component
 */
export const Badge = ({ label, color = COLORS.primary, icon, style, textStyle }) => (
  <View
    style={[
      styles.badge,
      { backgroundColor: color + '22', borderColor: color + '55' },
      style,
    ]}
  >
    {icon && <Text style={styles.badgeIcon}>{icon}</Text>}
    <Text style={[styles.badgeText, { color }, textStyle]}>{label}</Text>
  </View>
);

/**
 * Divider Component
 */
export const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

/**
 * StatusDot Component
 */
export const StatusDot = ({ status = 'idle', size = 8 }) => {
  const colors = {
    idle: COLORS.textMuted,
    pending: COLORS.warning,
    sent: COLORS.safe,
    failed: COLORS.danger,
  };
  return (
    <View
      style={[
        styles.statusDot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors[status] || COLORS.textMuted,
        },
      ]}
      accessibilityLabel={`Status: ${status}`}
    />
  );
};

/**
 * Modern SearchInput with search icon, clear button, and animated active state.
 */
export const SearchInput = ({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
  style,
  autoCapitalize = 'none',
}) => {
  const isFocused = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    Animated.timing(isFocused, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    Animated.timing(isFocused, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = isFocused.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <Animated.View style={[styles.searchContainer, { borderColor }, style]}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
      />
      {value?.length > 0 && (
        <TouchableOpacity
          onPress={onClear || (() => onChangeText(''))}
          style={styles.searchClearBtn}
          accessibilityLabel="Clear search text"
        >
          <Text style={styles.searchClearText}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

/**
 * Filter Chip with active state indicator.
 */
export const Chip = ({
  label,
  icon,
  active = false,
  onPress,
  color = COLORS.primary,
  style,
}) => (
  <TouchableOpacity
    style={[
      styles.chip,
      active && { backgroundColor: color + '22', borderColor: color },
      style,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    {icon && <Text style={styles.chipIcon}>{icon}</Text>}
    <Text style={[styles.chipText, active && { color, fontWeight: '700' }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/**
 * Shimmering skeleton loader for card placeholders.
 */
export const SkeletonCard = ({ height = 110, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.75, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        { height, opacity: shimmerAnim },
        style,
      ]}
    >
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLineFull} />
      <View style={styles.skeletonLineHalf} />
    </Animated.View>
  );
};

/**
 * Rich Empty State display.
 */
export const EmptyState = ({
  icon = '🔍',
  title,
  message,
  actionButton,
  style,
}) => (
  <View style={[styles.emptyStateContainer, style]}>
    <View style={styles.emptyIconCircle}>
      <Text style={styles.emptyStateIcon}>{icon}</Text>
    </View>
    <Text style={styles.emptyStateTitle}>{title}</Text>
    {message ? <Text style={styles.emptyStateMessage}>{message}</Text> : null}
    {actionButton && <View style={styles.emptyActionWrapper}>{actionButton}</View>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardDefault: {
    backgroundColor: COLORS.surface,
  },
  cardHighlight: {
    backgroundColor: COLORS.surfaceHighlight,
    borderColor: COLORS.primary + '55',
  },
  cardElevated: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingDisabled: {
    opacity: 0.5,
  },
  settingIcon: {
    fontSize: 22,
    marginRight: SPACING.md,
    width: 32,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.base,
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.bold,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  statusDot: {
    marginRight: SPACING.sm,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginVertical: SPACING.sm,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: SPACING.sm,
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  searchClearBtn: {
    padding: SPACING.xs,
  },
  searchClearText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  // Chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-around',
  },
  skeletonLineShort: {
    width: '45%',
    height: 16,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  skeletonLineFull: {
    width: '92%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  skeletonLineHalf: {
    width: '60%',
    height: 12,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
  },
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyStateIcon: {
    fontSize: 38,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  emptyActionWrapper: {
    marginTop: SPACING.xl,
  },
});
