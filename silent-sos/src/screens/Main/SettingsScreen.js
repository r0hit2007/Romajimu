import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, SettingRow, SectionHeader, Divider } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants/theme';
import { REGIONS } from '../../constants/resources';
import { draftSOSMessage } from '../../services/aiService';
import { requestLocationPermission, requestAudioPermission } from '../../services/sosService';

export default function SettingsScreen() {
  const { settings, saveSettings, logout, deleteAccount } = useApp();
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  const handleAIDraft = async () => {
    setAiDrafting(true);
    setAiMessage(null);
    const drafted = await draftSOSMessage({
      currentMessage: settings.sosMessage,
      includeLocation: settings.includeLocation,
      includeAudio: settings.includeAudio,
    });
    setAiDrafting(false);
    if (drafted) setAiMessage(drafted);
    else Alert.alert('AI Unavailable', 'Could not connect to Gemma AI. Please check your connection and try again.');
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          setSigningOut(true);
          await logout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account & All Data',
      'This will permanently delete all your contacts, SOS settings, and account data from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
          },
        },
      ]
    );
  };

  const CountdownSelector = () => (
    <View style={styles.countdownRow}>
      {['3', '5', '10', '15'].map(n => (
        <TouchableOpacity
          key={n}
          style={[styles.countdownBtn, String(settings.countdownDuration) === n && styles.countdownBtnActive]}
          onPress={() => saveSettings({ countdownDuration: parseInt(n) })}
          accessibilityLabel={`Set countdown to ${n} seconds`}
        >
          <Text style={[styles.countdownText, String(settings.countdownDuration) === n && styles.countdownTextActive]}>
            {n}s
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>@{settings.userName || settings.userEmail}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* SOS Message */}
        <SectionHeader title="SOS Message" />
        <Card>
          <Input
            label="Your Alert Message"
            value={settings.sosMessage}
            onChangeText={v => saveSettings({ sosMessage: v })}
            multiline
            numberOfLines={3}
            hint="This message is sent to your trusted contacts when you trigger SOS"
          />
          <Text style={styles.charCount}>{(settings.sosMessage || '').length}/160</Text>

          {aiMessage && (
            <View style={styles.aiSuggestion}>
              <Text style={styles.aiSuggestionLabel}>✨ AI suggestion:</Text>
              <Text style={styles.aiSuggestionText}>{aiMessage}</Text>
              <View style={styles.aiSuggestionBtns}>
                <Button
                  title="Use this"
                  onPress={() => { saveSettings({ sosMessage: aiMessage }); setAiMessage(null); }}
                  size="sm"
                  style={{ flex: 1 }}
                />
                <Button
                  title="Discard"
                  onPress={() => setAiMessage(null)}
                  variant="ghost"
                  size="sm"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          <Button
            title={aiDrafting ? 'Drafting with AI…' : '✨ Draft with Gemma AI'}
            onPress={handleAIDraft}
            variant="secondary"
            size="sm"
            loading={aiDrafting}
            disabled={aiDrafting}
            style={{ marginTop: SPACING.sm }}
          />
        </Card>

        {/* Alert Options */}
        <SectionHeader title="Alert Options" />
        <Card>
          <SettingRow
            icon="📍" title="Include Location"
            subtitle="Appends Google Maps link to your SOS message"
            value={settings.includeLocation}
            onValueChange={v => saveSettings({ includeLocation: v })}
          />
          <SettingRow
            icon="🎤" title="Record Audio"
            subtitle="Silently records ambient audio as evidence"
            value={settings.includeAudio}
            onValueChange={async v => {
              if (v) { await requestAudioPermission(); }
              saveSettings({ includeAudio: v });
            }}
          />
          <SettingRow
            icon="📞" title="Request Callback"
            subtitle="Adds callback request to your SOS message"
            value={settings.requestCallback}
            onValueChange={v => saveSettings({ requestCallback: v })}
          />
        </Card>

        {/* Countdown */}
        <SectionHeader title="Confirmation Countdown" subtitle="Seconds before SOS is sent" />
        <Card>
          <CountdownSelector />
        </Card>

        {/* Calculator Decoy */}
        <SectionHeader title="Calculator Decoy" />
        <Card>
          <SettingRow
            icon="🧮" title="Enable Calculator Decoy"
            subtitle="Shows a working calculator as the app front"
            value={settings.calculatorDecoyEnabled}
            onValueChange={v => saveSettings({ calculatorDecoyEnabled: v, launchIntoDecoy: v ? settings.launchIntoDecoy : false })}
          />
          {settings.calculatorDecoyEnabled && (
            <SettingRow
              icon="🚀" title="Launch Directly into Calculator"
              subtitle="App opens calculator mode immediately"
              value={settings.launchIntoDecoy}
              onValueChange={v => saveSettings({ launchIntoDecoy: v })}
            />
          )}
        </Card>
        {settings.calculatorDecoyEnabled && (
          <View style={styles.hintBox}>
            <Text style={styles.hintBoxText}>
              💡 Return from calculator: long-press the <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>÷</Text> button for 2 seconds.
            </Text>
          </View>
        )}

        {/* Region */}
        <SectionHeader title="Support Region" subtitle="Affects resources shown in the Support tab" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionRow}>
          {REGIONS.map(r => (
            <TouchableOpacity
              key={r.code}
              style={[styles.regionChip, settings.selectedRegion === r.code && styles.regionChipActive]}
              onPress={() => saveSettings({ selectedRegion: r.code })}
              accessibilityLabel={`Select ${r.label}`}
            >
              <Text style={styles.regionFlag}>{r.flag}</Text>
              <Text style={[styles.regionLabel, settings.selectedRegion === r.code && styles.regionLabelActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Privacy */}
        <SectionHeader title="Privacy & Data" />
        <Card>
          <View style={styles.privacyNote}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              All data is stored only on this device. Nothing is uploaded to servers. We cannot access your information.
            </Text>
          </View>
          <Divider />
          <Button
            title="Re-run Setup Wizard"
            onPress={() => saveSettings({ onboardingComplete: false })}
            variant="secondary"
            size="md"
            style={{ marginTop: SPACING.md }}
          />
        </Card>

        {/* Account */}
        <SectionHeader title="Account" />
        <Card>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{settings.userName}</Text>
            <Text style={styles.accountEmail}>{settings.userEmail}</Text>
          </View>
          <Divider />
          <Button
            title={signingOut ? 'Signing out…' : 'Sign Out'}
            onPress={handleLogout}
            variant="ghost"
            size="md"
            loading={signingOut}
            style={{ marginTop: SPACING.md }}
          />
          <Button
            title="Delete Account & All Data"
            onPress={handleDeleteAccount}
            variant="danger"
            size="md"
            style={{ marginTop: SPACING.sm }}
          />
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: TYPOGRAPHY.size.xxl, fontWeight: TYPOGRAPHY.weight.bold, color: COLORS.text },
  headerSubtitle: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  charCount: { fontSize: TYPOGRAPHY.size.xs, color: COLORS.textMuted, textAlign: 'right', marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  aiSuggestion: {
    backgroundColor: COLORS.primaryGlow,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '44',
  },
  aiSuggestionLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.primaryLight, fontWeight: TYPOGRAPHY.weight.semibold, marginBottom: 6 },
  aiSuggestionText: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text, lineHeight: 22, marginBottom: SPACING.md },
  aiSuggestionBtns: { flexDirection: 'row', gap: SPACING.sm },
  countdownRow: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center', paddingVertical: SPACING.sm },
  countdownBtn: {
    width: 64, height: 64, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bg3, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countdownBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  countdownText: { fontSize: TYPOGRAPHY.size.lg, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weight.bold },
  countdownTextActive: { color: COLORS.primary },
  hintBox: {
    backgroundColor: COLORS.bg3, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.base,
  },
  hintBoxText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.sm, lineHeight: 20 },
  regionRow: { marginBottom: SPACING.base },
  regionChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    marginRight: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.border, gap: SPACING.xs,
  },
  regionChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  regionFlag: { fontSize: 18 },
  regionLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weight.medium },
  regionLabelActive: { color: COLORS.primaryLight },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  privacyIcon: { fontSize: 20, marginTop: 2 },
  privacyText: { flex: 1, fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, lineHeight: 20 },
  accountInfo: { paddingVertical: SPACING.sm },
  accountName: { fontSize: TYPOGRAPHY.size.lg, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text },
  accountEmail: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, marginTop: 4 },
});
