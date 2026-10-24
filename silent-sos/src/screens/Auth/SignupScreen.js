import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  KeyboardAvoidingView, Platform, StatusBar, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

export default function SignupScreen({ navigation }) {
  const { signup } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
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

  const handleSignup = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    const result = await signup(name.trim(), email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) setError(result.error);
    // Navigation handled by root navigator detecting isAuthenticated
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <View style={styles.headerArea}>
              <Text style={styles.heading}>Create your account</Text>
              <Text style={styles.subheading}>
                Your data stays on your device. We don't share or sell your information.
              </Text>
            </View>

            <View style={styles.form}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>⚠️  {error}</Text>
                </View>
              ) : null}

              <Input label="Full Name" placeholder="Jane Doe" value={name} onChangeText={setName} />
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
                placeholder="Min. 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                rightIcon={showPass ? '🙈' : '👁'}
                onRightIconPress={() => setShowPass(!showPass)}
                hint="Must be at least 6 characters"
              />
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPass}
                onChangeText={setConfirmPass}
                secureTextEntry={!showPass}
              />

              <View style={styles.privacyNote}>
                <Text style={styles.privacyIcon}>🔒</Text>
                <Text style={styles.privacyText}>
                  All your settings and contacts are stored locally on your device only. We cannot access your data.
                </Text>
              </View>

              <Button
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                size="lg"
                style={{ marginTop: SPACING.base }}
              />

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.loginLink}
              >
                <Text style={styles.loginLinkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: 60, paddingBottom: 40 },
  content: { flex: 1 },
  backBtn: { marginBottom: SPACING.xl },
  backText: { color: COLORS.primary, fontSize: TYPOGRAPHY.size.base },
  headerArea: { marginBottom: SPACING.xl },
  heading: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  subheading: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, lineHeight: 20 },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.primary + '33',
  },
  privacyIcon: { fontSize: 16, marginRight: SPACING.sm },
  privacyText: { flex: 1, fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, lineHeight: 18 },
  loginLink: { alignItems: 'center', marginTop: SPACING.xl },
  loginLinkText: { color: COLORS.primary, fontSize: TYPOGRAPHY.size.sm },
});
