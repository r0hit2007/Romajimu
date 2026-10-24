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
import { PasswordStrengthIndicator, calculatePasswordStrength } from '../../components/PasswordStrengthIndicator';
import { SuccessAnimation } from '../../components/SuccessAnimation';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

/**
 * SignupScreen Component
 *
 * Registration interface for new Silent SOS users.
 * Features live password strength analysis, real-time confirm password validation,
 * smooth keyboard focus chaining, loading states, success animations,
 * and comprehensive accessibility labels.
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation navigation prop.
 */
export default function SignupScreen({ navigation }) {
  const { signup } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Field-level error messages
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Field refs for auto-focus chaining
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

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
   * Validate full name.
   */
  const validateName = (val) => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      setNameError('Full name is required.');
      return false;
    }
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return false;
    }
    setNameError('');
    return true;
  };

  /**
   * Validate email address.
   */
  const validateEmail = (val) => {
    const trimmed = (val || '').trim();
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
   * Validate password criteria.
   */
  const validatePassword = (val) => {
    if (!val) {
      setPasswordError('Password is required.');
      return false;
    }
    if (val.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return false;
    }
    setPasswordError('');

    // Revalidate confirm password if already entered
    if (confirmPassword) {
      validateConfirmPassword(confirmPassword, val);
    }
    return true;
  };

  /**
   * Validate confirm password against primary password.
   */
  const validateConfirmPassword = (val, primaryPass = password) => {
    if (!val) {
      setConfirmPasswordError('Please confirm your password.');
      return false;
    }
    if (val !== primaryPass) {
      setConfirmPasswordError('Passwords do not match.');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  /**
   * Handle user signup submission.
   */
  const handleSignup = async () => {
    Keyboard.dismiss();
    setGeneralError('');

    const isNameOk = validateName(name);
    const isEmailOk = validateEmail(email);
    const isPassOk = validatePassword(password);
    const isConfirmOk = validateConfirmPassword(confirmPassword);

    if (!isNameOk || !isEmailOk || !isPassOk || !isConfirmOk) {
      return;
    }

    setLoading(true);
    try {
      const result = await signup(name.trim(), email.trim().toLowerCase(), password);
      if (result.success) {
        setIsSuccess(true);
        // RootNavigator detects settings.isAuthenticated and navigates to Onboarding
      } else {
        setGeneralError(result.error || 'Failed to create account. Please try again.');
      }
    } catch {
      setGeneralError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Live validity indicators
  const isEmailValid = email.length > 0 && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameValid = name.trim().length >= 2 && !nameError;
  const isPasswordsMatching = confirmPassword.length > 0 && confirmPassword === password && !confirmPasswordError;

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
              {/* Back navigation */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back to previous screen"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                disabled={loading || isSuccess}
              >
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              {/* Header */}
              <AuthHeader
                compact
                title="Create Account"
                subtitle="Your emergency data stays encrypted on your device"
              />

              {isSuccess ? (
                <SuccessAnimation
                  title="Account Created!"
                  description={`Welcome to Silent SOS, ${name}. Your profile is ready. Let's set up your emergency contacts and discreet SOS trigger.`}
                  style={styles.successBox}
                />
              ) : (
                <AuthCard
                  title="Get Started"
                  subtitle="Configure your offline safety profile in under 2 minutes."
                  error={generalError}
                >
                  {/* Full Name */}
                  <Input
                    label="Full Name"
                    placeholder="e.g. Jane Doe"
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (nameError) validateName(val);
                      if (generalError) setGeneralError('');
                    }}
                    onBlur={() => validateName(name)}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    blurOnSubmit={false}
                    error={nameError}
                    isValid={isNameValid}
                    editable={!loading}
                    accessibilityLabel="Full name input"
                    accessibilityHint="Enter your first and last name"
                  />

                  {/* Email */}
                  <Input
                    ref={emailRef}
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
                    isValid={isEmailValid}
                    editable={!loading}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address"
                  />

                  {/* Password */}
                  <Input
                    ref={passwordRef}
                    label="Password"
                    placeholder="Min. 8 characters recommended"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      if (passwordError) validatePassword(val);
                      if (confirmPassword) validateConfirmPassword(confirmPassword, val);
                      if (generalError) setGeneralError('');
                    }}
                    onBlur={() => validatePassword(password)}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                    rightIcon={showPassword ? '🙈' : '👁'}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                    rightIconAccessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    error={passwordError}
                    editable={!loading}
                    accessibilityLabel="Password input"
                    accessibilityHint="Enter a strong password"
                  />

                  {/* Real-time Password Strength Indicator */}
                  <PasswordStrengthIndicator password={password} />

                  {/* Confirm Password */}
                  <Input
                    ref={confirmPasswordRef}
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      if (confirmPasswordError) validateConfirmPassword(val, password);
                      if (generalError) setGeneralError('');
                    }}
                    onBlur={() => validateConfirmPassword(confirmPassword)}
                    secureTextEntry={!showConfirmPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSignup}
                    rightIcon={showConfirmPassword ? '🙈' : '👁'}
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    rightIconAccessibilityLabel={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                    error={confirmPasswordError}
                    isValid={isPasswordsMatching}
                    hint={isPasswordsMatching ? 'Passwords match perfectly.' : undefined}
                    editable={!loading}
                    accessibilityLabel="Confirm password input"
                    accessibilityHint="Re-enter your password to confirm match"
                  />

                  {/* Device-Only Privacy Guarantee */}
                  <View style={styles.privacyNote}>
                    <Text style={styles.privacyIcon}>🔒</Text>
                    <Text style={styles.privacyText}>
                      Zero cloud exposure: Your contacts and safety configuration are stored exclusively on this device.
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <Button
                    title="Create Account"
                    onPress={handleSignup}
                    loading={loading}
                    disabled={loading}
                    size="lg"
                    style={styles.submitBtn}
                    accessibilityLabel="Create account button"
                    accessibilityHint="Registers your account and proceeds to onboarding"
                  />

                  {/* Sign In Link */}
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    style={styles.loginLink}
                    accessibilityRole="link"
                    accessibilityLabel="Already have an account? Sign in"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    disabled={loading}
                  >
                    <Text style={styles.loginLinkText}>
                      Already have an account? <Text style={styles.signInSpan}>Sign in</Text>
                    </Text>
                  </TouchableOpacity>
                </AuthCard>
              )}
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
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: SPACING.xxxl,
  },
  content: {
    flex: 1,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  backText: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  privacyIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  privacyText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs + 1,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.base,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  loginLinkText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.size.sm,
  },
  signInSpan: {
    color: COLORS.primaryLight,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  successBox: {
    marginTop: SPACING.md,
  },
});
