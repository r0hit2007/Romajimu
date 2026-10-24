import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) return;
    // Demo: just show success state (no real backend)
    setSubmitted(true);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>

          {!submitted ? (
            <View style={styles.form}>
              <Text style={styles.icon}>🔑</Text>
              <Text style={styles.heading}>Reset Password</Text>
              <Text style={styles.subheading}>
                Enter your email address and we'll send you a reset link.
              </Text>
              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button title="Send Reset Link" onPress={handleSubmit} size="lg" style={{ marginTop: SPACING.base }} />
            </View>
          ) : (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                If an account exists for {email}, you'll receive a reset link shortly. Check your spam folder too.
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => navigation.navigate('Login')}
                variant="secondary"
                size="lg"
                style={{ marginTop: SPACING.xl }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xl, paddingTop: 70, paddingBottom: 40 },
  backBtn: { marginBottom: SPACING.xl },
  backText: { color: COLORS.primary, fontSize: TYPOGRAPHY.size.base },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: { fontSize: 40, textAlign: 'center', marginBottom: SPACING.lg },
  heading: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.safe + '44',
    alignItems: 'center',
  },
  successIcon: { fontSize: 48, marginBottom: SPACING.lg },
  successTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
