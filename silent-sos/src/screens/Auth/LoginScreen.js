import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) setError(result.error);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Logo area */}
            <View style={styles.logoArea}>
              <View style={styles.logoRing}>
                <View style={styles.logoInner}>
                  <Text style={styles.logoIcon}>🛡</Text>
                </View>
              </View>
              <Text style={styles.appName}>Silent SOS</Text>
              <Text style={styles.tagline}>Your discreet safety companion</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Text style={styles.heading}>Welcome back</Text>
              <Text style={styles.subheading}>Sign in to access your safety settings</Text>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️  {error}</Text>
                </View>
              ) : null}

              <Input
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                rightIcon={showPass ? '🙈' : '👁'}
                onRightIconPress={() => setShowPass(!showPass)}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.forgotLink}
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={styles.signInBtn}
              />

              <View style={styles.dividerRow}>
                <View style={styles.divLine} />
                <Text style={styles.divText}>or</Text>
                <View style={styles.divLine} />
              </View>

              <Button
                title="Create an Account"
                onPress={() => navigation.navigate('Signup')}
                variant="secondary"
                size="lg"
              />

              <View style={styles.guestRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Support')}
                  accessibilityLabel="Access support resources without account"
                >
                  <Text style={styles.guestText}>Access support resources without account →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: 60, paddingBottom: 40 },
  content: { flex: 1 },
  logoArea: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logoRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: COLORS.primary + '55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.base,
  },
  logoInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: COLORS.bg3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '33',
  },
  logoIcon: { fontSize: 36 },
  appName: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.extrabold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heading: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 6,
  },
  subheading: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  errorBanner: {
    backgroundColor: COLORS.dangerDim,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.danger + '44',
  },
  errorText: { color: COLORS.dangerLight, fontSize: TYPOGRAPHY.size.sm },
  forgotLink: { alignSelf: 'flex-end', marginBottom: SPACING.lg, marginTop: -SPACING.sm },
  forgotText: { color: COLORS.primary, fontSize: TYPOGRAPHY.size.sm },
  signInBtn: { marginBottom: SPACING.lg },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.base },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { color: COLORS.textMuted, marginHorizontal: SPACING.md, fontSize: TYPOGRAPHY.size.sm },
  guestRow: { alignItems: 'center', marginTop: SPACING.lg },
  guestText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.size.sm, textDecorationLine: 'underline' },
});
