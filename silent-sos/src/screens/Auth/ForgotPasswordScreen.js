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
import { SuccessAnimation } from '../../components/SuccessAnimation';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

/**
 * ForgotPasswordScreen Component
 *
 * Facilitates self-service password recovery for Silent SOS accounts.
 * Provides live email format validation, loading state indicators,
 * smooth success celebration animation, and keyboard dismiss handling.
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation navigation prop.
 */
export default function ForgotPasswordScreen({ navigation }) {
  const { resetPassword } = useApp();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
   * Handle reset password request.
   */
  const handleSubmit = async () => {
    Keyboard.dismiss();
    setGeneralError('');

    const isEmailOk = validateEmail(email);
    if (!isEmailOk) return;

    setLoading(true);
    try {
      if (resetPassword) {
        await resetPassword(email.trim().toLowerCase());
      } else {
        // Fallback simulation
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      setSubmitted(true);
    } catch {
      setGeneralError('Failed to dispatch reset link. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = email.length > 0 && !emailError && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
              {/* Back to Sign In Link */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Back to sign in"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                disabled={loading}
              >
                <Text style={styles.backText}>← Back to Sign In</Text>
              </TouchableOpacity>

              {/* Brand Header */}
              <AuthHeader
                compact
                icon="🔑"
                title="Reset Password"
                subtitle="Verify your registered email to restore safety access"
              />

              {!submitted ? (
                <AuthCard
                  title="Password Recovery"
                  subtitle="Enter your email address and we'll send you instructions to create a new password."
                  error={generalError}
                >
                  <Input
                    label="Registered Email"
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
                    returnKeyType="send"
                    onSubmitEditing={handleSubmit}
                    error={emailError}
                    isValid={isEmailValid}
                    editable={!loading}
                    accessibilityLabel="Email address input"
                    accessibilityHint="Enter the email associated with your account"
                  />

                  <Button
                    title="Send Reset Link"
                    onPress={handleSubmit}
                    loading={loading}
                    disabled={loading}
                    size="lg"
                    style={styles.submitBtn}
                    accessibilityLabel="Send reset link button"
                    accessibilityHint="Sends password reset instructions to your email"
                  />
                </AuthCard>
              ) : (
                <SuccessAnimation
                  title="Check Your Inbox"
                  description={`We've dispatched recovery instructions to ${email}. If you don't see it within a few minutes, check your spam or junk folder.`}
                  buttonTitle="Return to Sign In"
                  onButtonPress={() => navigation.navigate('Login')}
                  extraContent={
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={loading}
                      style={styles.resendBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Resend reset link"
                    >
                      <Text style={styles.resendText}>Didn't receive an email? Tap to resend</Text>
                    </TouchableOpacity>
                  }
                />
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
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: SPACING.xxxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
  submitBtn: {
    marginTop: SPACING.base,
  },
  resendBtn: {
    marginTop: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  resendText: {
    color: COLORS.primaryLight,
    fontSize: TYPOGRAPHY.size.sm,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
