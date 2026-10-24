import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity, Animated } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

export const Card = ({ children, style, ...props }) => (
  <View style={[styles.card, style]} {...props}>
    {children}
  </View>
);

export const SettingRow = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  type = 'toggle', // toggle | info | navigate
  rightElement,
}) => (
  <View style={styles.settingRow}>
    {icon && <Text style={styles.settingIcon}>{icon}</Text>}
    <View style={styles.settingText}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {type === 'toggle' && (
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.border, true: COLORS.primary }}
        thumbColor={value ? COLORS.white : COLORS.textMuted}
        ios_backgroundColor={COLORS.border}
        accessibilityLabel={`Toggle ${title}`}
      />
    )}
    {rightElement && rightElement}
  </View>
);

export const SectionHeader = ({ title, subtitle, rightElement }) => (
  <View style={styles.sectionHeaderRow}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement && rightElement}
  </View>
);

export const Badge = ({ label, color = COLORS.primary, icon, style }) => (
  <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '44' }, style]}>
    {icon && <Text style={styles.badgeIcon}>{icon}</Text>}
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

export const Divider = ({ style }) => (
  <View style={[styles.divider, style]} />
);

export const StatusDot = ({ status }) => {
  const colors = {
    idle: COLORS.textMuted,
    pending: COLORS.warning,
    sent: COLORS.safe,
    failed: COLORS.danger,
  };
  return (
    <View style={[styles.statusDot, { backgroundColor: colors[status] || COLORS.textMuted }]} />
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
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
    width: 28,
    textAlign: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
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
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
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
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
