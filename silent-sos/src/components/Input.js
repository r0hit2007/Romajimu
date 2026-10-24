import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

/**
 * Enhanced Input Component for Silent SOS.
 *
 * Supports animated focus transitions, inline error messaging,
 * password toggle icons, isValid checkmarks, next-field focus chaining via forwardRef,
 * and comprehensive accessibility attributes.
 */
export const Input = forwardRef(({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = false,
  returnKeyType = 'default',
  onSubmitEditing,
  blurOnSubmit = true,
  error,
  hint,
  isValid = false,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  rightIconAccessibilityLabel,
  editable = true,
  accessibilityLabel,
  accessibilityHint,
  testID,
}, ref) => {
  const internalInputRef = useRef(null);
  const borderAnim = useRef(new Animated.Value(0)).current;

  // Expose focus/blur methods to external ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      internalInputRef.current?.focus();
    },
    blur: () => {
      internalInputRef.current?.blur();
    },
    clear: () => {
      internalInputRef.current?.clear();
    },
    isFocused: () => {
      return internalInputRef.current?.isFocused() || false;
    },
  }));

  const onFocus = () => {
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const onBlur = () => {
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const getBorderColor = () => {
    if (error) {
      return borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.danger, COLORS.dangerLight],
      });
    }
    if (isValid) {
      return borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLORS.safe, COLORS.safeLight],
      });
    }
    return borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.border, COLORS.primary],
    });
  };

  const borderColor = getBorderColor();

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {isValid && !error && <Text style={styles.validBadge}>✓ Valid</Text>}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor },
          !editable && styles.disabledWrapper,
          error && styles.errorWrapper,
        ]}
      >
        {leftIcon ? <Text style={styles.leftIconText}>{leftIcon}</Text> : null}

        <TextInput
          ref={internalInputRef}
          style={[
            styles.input,
            multiline && {
              height: Math.max(88, numberOfLines * 24),
              textAlignVertical: 'top',
              paddingTop: SPACING.sm,
            },
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityHint={accessibilityHint}
          accessibilityInvalid={!!error}
          testID={testID}
        />

        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole={onRightIconPress ? 'button' : 'text'}
            accessibilityLabel={rightIconAccessibilityLabel || 'Input icon'}
          >
            <Text style={styles.rightIconText}>{rightIcon}</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {error ? (
        <View style={styles.messageRow}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <View style={styles.messageRow}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.base,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs + 1,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  validBadge: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.safeLight,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    minHeight: 50,
  },
  disabledWrapper: {
    backgroundColor: COLORS.bg2,
    opacity: 0.6,
  },
  errorWrapper: {
    backgroundColor: 'rgba(192, 84, 74, 0.05)',
  },
  leftIconText: {
    fontSize: TYPOGRAPHY.size.base,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.regular,
    paddingVertical: SPACING.sm,
  },
  rightIcon: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconText: {
    fontSize: TYPOGRAPHY.size.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs + 2,
    paddingHorizontal: SPACING.xs,
  },
  errorIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.dangerLight,
    fontWeight: TYPOGRAPHY.weight.medium,
    flex: 1,
  },
  hintText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
});
