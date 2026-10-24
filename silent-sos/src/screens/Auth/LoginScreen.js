import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { AuthHeader } from '../../components/AuthHeader';
import { AuthCard } from '../../components/AuthCard';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

/**
 * LoginScreen Component
 *
 * Provides a secure, polished authentication gateway for existing Silent SOS users.
 * Features inline email/password validation, auto-focus chaining,
 * keyboard dismissal handling, loading states, and dark theme consistency.
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation navigation prop.
 */
export default function LoginScreen({ navigation }) {
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Field-specific validation error messages
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Refs for keyboard next-field chaining
  const passwordRef = useRef(null);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /**
   * Validate email format and set inline error.
   */
  const validateEmail = (value) => {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      setEmailError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Please enter a valid email address (e.g., name@example.com).');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Validate password format and set inline error.
   */
  const validatePassword = (value) => {
    if (!value) {
      setPasswordError('Password is required.');
      return false;
    }
    if (value.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  /**
   * Execute login submission with validation guards and async state management.
   */
  const handleLogin = async () => {
    Keyboard.dismiss();
    setGeneralError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (!result.success) {
        setGeneralError(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setGeneralError('A connection error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailFormatValid = email.length > 0 && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg0} />
      <LinearGradient
        colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Brand Header */}
              <AuthHeader />

              {/* Login Form Card */}
              <AuthCard
                title="Welcome Back"
                subtitle="Sign in to manage your emergency settings and trusted contacts."
                error={generalError}
              >
                {/* Email Input */}
                <Input
                  label="Email Address"
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (emailError) validateEmail(val);
                    if (generalError) setGeneralError('');
                  }}
                  onBlur={() => validateEmail(email)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  error={emailError}
                  isValid={isEmailFormatValid}
                  editable={!loading}
                  accessibilityLabel="Email input"
                  accessibilityHint="Enter your account email address"
                />

                {/* Password Input */}
                <Input
                  ref={passwordRef}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (passwordError) validatePassword(val);
                    if (generalError) setGeneralError('');
                  }}
                  onBlur={() => validatePassword(password)}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  rightIcon={showPassword ? '🙈' : '👁'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                  rightIconAccessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  error={passwordError}
                  editable={!loading}
                  accessibilityLabel="Password input"
                  accessibilityHint="Enter your password"
                />

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotLink}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password? Tap to reset."
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={loading}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <Button
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  size="lg"
                  style={styles.signInBtn}
                  accessibilityLabel="Sign in button"
                  accessibilityHint="Logs into your account"
                />

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.divLine} />
                  <Text style={styles.divText}>or</Text>
                  <View style={styles.divLine} />
                </View>

                {/* Create Account Button */}
                <Button
                  title="Create an Account"
                  onPress={() => navigation.navigate('Signup')}
                  variant="secondary"
                  size="lg"
                  disabled={loading}
                  accessibilityLabel="Create account button"
                  accessibilityHint="Navigates to account registration screen"
                />

                {/* Emergency Resources / Guest Link */}
                <View style={styles.guestRow}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Support')}
                    style={styles.guestTouchable}
                    accessibilityRole="link"
                    accessibilityLabel="Access support resources without an account"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.guestText}>
                      Access emergency resources without account →
                    </Text>
                  </TouchableOpacity>
                </View>
              </AuthCard>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg0,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.xxxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
    marginTop: -SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  forgotText: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  signInBtn: {
    marginBottom: SPACING.base,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.base,
  },
  divLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  divText: {
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.size.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  guestRow: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  guestTouchable: {
    paddingVertical: SPACING.xs,
  },
  guestText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
