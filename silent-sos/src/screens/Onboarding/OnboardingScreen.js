import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  Dimensions, StatusBar, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, SettingRow } from '../../components/UIElements';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { REGIONS } from '../../constants/resources';
import { requestLocationPermission, requestAudioPermission } from '../../services/sosService';

const { width } = Dimensions.get('window');

const STEPS = [
  'welcome',
  'contacts',
  'message',
  'toggles',
  'permissions',
  'decoy',
  'region',
  'review',
];

export default function OnboardingScreen() {
  const { settings, saveSettings } = useApp();
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Local state for all settings during onboarding
  const [sosMessage, setSosMessage] = useState(settings.sosMessage);
  const [includeLocation, setIncludeLocation] = useState(settings.includeLocation);
  const [includeAudio, setIncludeAudio] = useState(settings.includeAudio);
  const [requestCallback, setRequestCallback] = useState(settings.requestCallback);
  const [countdownDuration, setCountdownDuration] = useState(String(settings.countdownDuration));
  const [calculatorDecoyEnabled, setCalculatorDecoyEnabled] = useState(settings.calculatorDecoyEnabled);
  const [launchIntoDecoy, setLaunchIntoDecoy] = useState(settings.launchIntoDecoy);
  const [selectedRegion, setSelectedRegion] = useState(settings.selectedRegion);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [locationGranted, setLocationGranted] = useState(false);
  const [audioGranted, setAudioGranted] = useState(false);

  const goNext = () => {
    if (step < STEPS.length - 1) animateTo(step + 1);
  };

  const goBack = () => {
    if (step > 0) animateTo(step - 1);
  };

  const animateTo = (nextStep) => {
    const dir = nextStep > step ? -width : width;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(-dir);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    });
  };

  const handleFinish = async () => {
    await saveSettings({
      sosMessage,
      includeLocation,
      includeAudio,
      requestCallback,
      countdownDuration: parseInt(countdownDuration) || 5,
      calculatorDecoyEnabled,
      launchIntoDecoy,
      selectedRegion,
      onboardingComplete: true,
    });
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Missing Info', 'Please enter both name and phone number.');
      return;
    }
    await saveSettings({
      contacts: [
        ...settings.contacts,
        { ...newContact, id: Date.now().toString(), selectedForSOS: true },
      ],
    });
    setNewContact({ name: '', phone: '' });
  };

  const progress = (step / (STEPS.length - 1)) * 100;

  const renderStep = () => {
    switch (STEPS[step]) {
      case 'welcome':
        return <WelcomeStep />;
      case 'contacts':
        return (
          <ContactsStep
            contacts={settings.contacts}
            newContact={newContact}
            setNewContact={setNewContact}
            onAdd={handleAddContact}
          />
        );
      case 'message':
        return (
          <MessageStep
            sosMessage={sosMessage}
            setSosMessage={setSosMessage}
          />
        );
      case 'toggles':
        return (
          <TogglesStep
            includeLocation={includeLocation}
            setIncludeLocation={setIncludeLocation}
            includeAudio={includeAudio}
            setIncludeAudio={setIncludeAudio}
            requestCallback={requestCallback}
            setRequestCallback={setRequestCallback}
            countdownDuration={countdownDuration}
            setCountdownDuration={setCountdownDuration}
          />
        );
      case 'permissions':
        return (
          <PermissionsStep
            includeLocation={includeLocation}
            includeAudio={includeAudio}
            locationGranted={locationGranted}
            audioGranted={audioGranted}
            onRequestLocation={async () => {
              const ok = await requestLocationPermission();
              setLocationGranted(ok);
            }}
            onRequestAudio={async () => {
              const ok = await requestAudioPermission();
              setAudioGranted(ok);
            }}
          />
        );
      case 'decoy':
        return (
          <DecoyStep
            calculatorDecoyEnabled={calculatorDecoyEnabled}
            setCalculatorDecoyEnabled={setCalculatorDecoyEnabled}
            launchIntoDecoy={launchIntoDecoy}
            setLaunchIntoDecoy={setLaunchIntoDecoy}
          />
        );
      case 'region':
        return (
          <RegionStep
            selectedRegion={selectedRegion}
            setSelectedRegion={setSelectedRegion}
          />
        );
      case 'review':
        return (
          <ReviewStep
            sosMessage={sosMessage}
            includeLocation={includeLocation}
            includeAudio={includeAudio}
            requestCallback={requestCallback}
            countdownDuration={countdownDuration}
            calculatorDecoyEnabled={calculatorDecoyEnabled}
            selectedRegion={selectedRegion}
            contactCount={settings.contacts.filter(c => c.selectedForSOS).length}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1]} style={StyleSheet.absoluteFillObject} />

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
      </View>

      <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      </Animated.View>

      {/* Navigation buttons */}
      <View style={styles.navBar}>
        {step > 0 ? (
          <Button title="Back" onPress={goBack} variant="ghost" size="md" />
        ) : (
          <View style={styles.navSpacer} />
        )}

        {step < STEPS.length - 1 ? (
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => setStep(STEPS.length - 1)} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip all</Text>
            </TouchableOpacity>
            <Button title="Next →" onPress={goNext} size="md" />
          </View>
        ) : (
          <Button title="✓  I'm ready" onPress={handleFinish} size="md" variant="safe" />
        )}
      </View>
    </View>
  );
}

// ─── Sub-steps ───────────────────────────────────────────────

const WelcomeStep = () => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>🛡️</Text>
    <Text style={styles.stepTitle}>Let's set up your safety profile</Text>
    <Text style={styles.stepDesc}>
      This takes about 3 minutes. We'll walk you through everything step by step.
      {'\n\n'}
      Your data stays on your device — nothing is ever uploaded or shared without your explicit action.
    </Text>
    <Card style={styles.infoCard}>
      <Text style={styles.infoTitle}>What you'll configure:</Text>
      {['✉️  SOS Message', '📞  Trusted Contacts', '📍  Location Sharing', '🧮  Calculator Decoy', '🌍  Support Region'].map(item => (
        <Text key={item} style={styles.infoItem}>{item}</Text>
      ))}
    </Card>
  </View>
);

const ContactsStep = ({ contacts, newContact, setNewContact, onAdd }) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>👥</Text>
    <Text style={styles.stepTitle}>Trusted Contacts</Text>
    <Text style={styles.stepDesc}>
      Add people who will receive your SOS alert. They'll get your message and location (if enabled).
    </Text>
    <Input
      label="Name"
      placeholder="Contact name"
      value={newContact.name}
      onChangeText={v => setNewContact(p => ({ ...p, name: v }))}
    />
    <Input
      label="Phone Number"
      placeholder="+1 555 000 0000"
      value={newContact.phone}
      onChangeText={v => setNewContact(p => ({ ...p, phone: v }))}
      keyboardType="phone-pad"
    />
    <Button title="+ Add Contact" onPress={onAdd} variant="secondary" size="md" style={{ marginBottom: SPACING.lg }} />
    {contacts.length > 0 && (
      <Card>
        <Text style={styles.contactsTitle}>Added contacts:</Text>
        {contacts.map(c => (
          <Text key={c.id} style={styles.contactItem}>✅  {c.name}  ({c.phone})</Text>
        ))}
      </Card>
    )}
    {contacts.length === 0 && (
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>⚠️  You can skip this and add contacts later in the Contacts tab. Without contacts, SOS messages cannot be sent.</Text>
      </View>
    )}
  </View>
);

const MessageStep = ({ sosMessage, setSosMessage }) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>✉️</Text>
    <Text style={styles.stepTitle}>Your SOS Message</Text>
    <Text style={styles.stepDesc}>
      This message will be sent to your trusted contacts. Keep it clear but discreet.
    </Text>
    <Input
      label="SOS Message"
      value={sosMessage}
      onChangeText={setSosMessage}
      multiline
      numberOfLines={4}
      placeholder="I need help. Please contact me."
      hint="Keep under 160 characters for SMS compatibility"
    />
    <Text style={styles.charCount}>{sosMessage.length}/160 characters</Text>
    <Card style={styles.infoCard}>
      <Text style={styles.infoTitle}>💡 Tip</Text>
      <Text style={styles.stepDesc}>
        Consider using the AI message assistant in Settings later to generate a discreet message with Gemma AI.
      </Text>
    </Card>
  </View>
);

const TogglesStep = ({
  includeLocation, setIncludeLocation,
  includeAudio, setIncludeAudio,
  requestCallback, setRequestCallback,
  countdownDuration, setCountdownDuration,
}) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>⚙️</Text>
    <Text style={styles.stepTitle}>Alert Options</Text>
    <Text style={styles.stepDesc}>Customize what happens when you trigger an SOS alert.</Text>
    <Card>
      <SettingRow
        icon="📍" title="Include Location"
        subtitle="Appends a Google Maps link to your message"
        value={includeLocation} onValueChange={setIncludeLocation}
      />
      <SettingRow
        icon="🎤" title="Record Audio"
        subtitle="Silently records ambient audio as evidence"
        value={includeAudio} onValueChange={setIncludeAudio}
      />
      <SettingRow
        icon="📞" title="Request Callback"
        subtitle="Adds a callback request to your SOS message"
        value={requestCallback} onValueChange={setRequestCallback}
      />
    </Card>

    <Text style={[styles.stepTitle, { fontSize: TYPOGRAPHY.size.base, marginTop: SPACING.xl }]}>
      Confirmation countdown
    </Text>
    <Text style={styles.stepDesc}>
      How many seconds before the SOS is sent after pressing the button?
    </Text>
    <View style={styles.countdownRow}>
      {['3', '5', '10', '15'].map(n => (
        <TouchableOpacity
          key={n}
          style={[styles.countdownBtn, countdownDuration === n && styles.countdownBtnActive]}
          onPress={() => setCountdownDuration(n)}
          accessibilityLabel={`Set countdown to ${n} seconds`}
        >
          <Text style={[styles.countdownText, countdownDuration === n && styles.countdownTextActive]}>
            {n}s
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const PermissionsStep = ({
  includeLocation, includeAudio,
  locationGranted, audioGranted,
  onRequestLocation, onRequestAudio,
}) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>🔐</Text>
    <Text style={styles.stepTitle}>Permissions</Text>
    <Text style={styles.stepDesc}>
      We only request permissions you've chosen to use. You can change these anytime.
    </Text>

    {includeLocation && (
      <Card style={{ marginBottom: SPACING.base }}>
        <Text style={styles.permTitle}>📍  Location Access</Text>
        <Text style={styles.permDesc}>
          Why: To include your precise location in the SOS alert message.
          {'\n'}Your location is only accessed when you trigger SOS — never in the background.
        </Text>
        {locationGranted ? (
          <Text style={styles.grantedText}>✅  Location permission granted</Text>
        ) : (
          <Button title="Grant Location Access" onPress={onRequestLocation} variant="secondary" size="md" style={{ marginTop: SPACING.md }} />
        )}
      </Card>
    )}

    {includeAudio && (
      <Card style={{ marginBottom: SPACING.base }}>
        <Text style={styles.permTitle}>🎤  Microphone Access</Text>
        <Text style={styles.permDesc}>
          Why: To record audio evidence if you've enabled audio in your alert options.
          {'\n'}Recording only starts when you confirm an SOS — never silently in the background.
        </Text>
        {audioGranted ? (
          <Text style={styles.grantedText}>✅  Microphone permission granted</Text>
        ) : (
          <Button title="Grant Microphone Access" onPress={onRequestAudio} variant="secondary" size="md" style={{ marginTop: SPACING.md }} />
        )}
      </Card>
    )}

    {!includeLocation && !includeAudio && (
      <Card>
        <Text style={styles.permDesc}>
          You haven't enabled location or audio, so no special permissions are needed right now.
          {'\n\n'}You can enable these features anytime in Settings.
        </Text>
      </Card>
    )}
  </View>
);

const DecoyStep = ({
  calculatorDecoyEnabled, setCalculatorDecoyEnabled,
  launchIntoDecoy, setLaunchIntoDecoy,
}) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>🧮</Text>
    <Text style={styles.stepTitle}>Calculator Decoy</Text>
    <Text style={styles.stepDesc}>
      The app can appear as a fully working calculator. Use a hidden gesture to return to the safety app.
    </Text>
    <Card>
      <SettingRow
        icon="🧮" title="Enable Calculator Decoy"
        subtitle="Shows a working calculator as the app's 'front'"
        value={calculatorDecoyEnabled} onValueChange={setCalculatorDecoyEnabled}
      />
      {calculatorDecoyEnabled && (
        <SettingRow
          icon="🚀" title="Launch into Calculator"
          subtitle="App opens directly in calculator mode"
          value={launchIntoDecoy} onValueChange={setLaunchIntoDecoy}
        />
      )}
    </Card>
    {calculatorDecoyEnabled && (
      <Card style={[styles.infoCard, { marginTop: SPACING.base }]}>
        <Text style={styles.infoTitle}>🤫 Secret Return Gesture</Text>
        <Text style={styles.stepDesc}>
          Long-press the <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>÷</Text> button for 2 seconds to return to the safety app.
        </Text>
      </Card>
    )}
  </View>
);

const RegionStep = ({ selectedRegion, setSelectedRegion }) => (
  <View style={styles.stepContent}>
    <Text style={styles.bigIcon}>🌍</Text>
    <Text style={styles.stepTitle}>Your Region</Text>
    <Text style={styles.stepDesc}>
      We'll show you verified support resources and emergency numbers for your region.
    </Text>
    <View style={styles.regionGrid}>
      {REGIONS.map(r => (
        <TouchableOpacity
          key={r.code}
          style={[styles.regionBtn, selectedRegion === r.code && styles.regionBtnActive]}
          onPress={() => setSelectedRegion(r.code)}
          accessibilityLabel={`Select region ${r.label}`}
        >
          <Text style={styles.regionFlag}>{r.flag}</Text>
          <Text style={[styles.regionLabel, selectedRegion === r.code && styles.regionLabelActive]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const ReviewStep = ({
  sosMessage, includeLocation, includeAudio, requestCallback,
  countdownDuration, calculatorDecoyEnabled, selectedRegion, contactCount,
}) => {
  const region = REGIONS.find(r => r.code === selectedRegion);
  return (
    <View style={styles.stepContent}>
      <Text style={styles.bigIcon}>✅</Text>
      <Text style={styles.stepTitle}>Your SOS Profile</Text>
      <Text style={styles.stepDesc}>
        Here's what happens when you trigger SOS:
      </Text>
      <Card style={{ marginBottom: SPACING.base }}>
        <Text style={styles.reviewRow}>📨  Message sent to <Text style={styles.reviewValue}>{contactCount}</Text> contact{contactCount !== 1 ? 's' : ''}</Text>
        <Text style={styles.reviewRow}>✉️  Message: <Text style={styles.reviewValue}>"{sosMessage.substring(0, 50)}{sosMessage.length > 50 ? '...' : ''}"</Text></Text>
        <Text style={styles.reviewRow}>⏱  Countdown: <Text style={styles.reviewValue}>{countdownDuration} seconds</Text></Text>
        <Text style={styles.reviewRow}>📍  Location: <Text style={styles.reviewValue}>{includeLocation ? 'Will be included' : 'Not included'}</Text></Text>
        <Text style={styles.reviewRow}>🎤  Audio: <Text style={styles.reviewValue}>{includeAudio ? 'Will be recorded' : 'Not recorded'}</Text></Text>
        <Text style={styles.reviewRow}>📞  Callback: <Text style={styles.reviewValue}>{requestCallback ? 'Requested' : 'Not requested'}</Text></Text>
        <Text style={styles.reviewRow}>🧮  Decoy: <Text style={styles.reviewValue}>{calculatorDecoyEnabled ? 'Enabled' : 'Disabled'}</Text></Text>
        <Text style={styles.reviewRow}>🌍  Region: <Text style={styles.reviewValue}>{region?.flag} {region?.label}</Text></Text>
      </Card>
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          ⚠️  We cannot guarantee message delivery in all circumstances. Always have a backup plan. In immediate danger, call emergency services directly.
        </Text>
      </View>
    </View>
  );
};

// ─── Shared Styles ─────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg0 },
  progressContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.base,
  },
  progressBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  stepLabel: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.xs,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  stepContainer: { flex: 1 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },
  stepContent: { paddingTop: SPACING.xl },
  bigIcon: { fontSize: 56, textAlign: 'center', marginBottom: SPACING.base },
  stepTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  stepDesc: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  infoCard: { marginTop: SPACING.base },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoItem: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    paddingVertical: SPACING.xs,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg1,
  },
  navSpacer: { width: 80 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  skipBtn: { paddingHorizontal: SPACING.md },
  skipText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.sm },
  countdownRow: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center' },
  countdownBtn: {
    width: 64, height: 64, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  countdownBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  countdownText: { fontSize: TYPOGRAPHY.size.lg, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weight.bold },
  countdownTextActive: { color: COLORS.primary },
  charCount: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.size.xs, textAlign: 'right', marginTop: -SPACING.md, marginBottom: SPACING.lg },
  warningCard: {
    backgroundColor: COLORS.warningDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
    marginTop: SPACING.base,
  },
  warningText: { color: COLORS.warningLight, fontSize: TYPOGRAPHY.size.sm, lineHeight: 20 },
  permTitle: { fontSize: TYPOGRAPHY.size.base, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.text, marginBottom: SPACING.sm },
  permDesc: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, lineHeight: 20 },
  grantedText: { color: COLORS.safeLight, fontSize: TYPOGRAPHY.size.sm, marginTop: SPACING.md, fontWeight: TYPOGRAPHY.weight.medium },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  regionBtn: {
    width: (width - SPACING.xl * 2 - SPACING.md) / 2,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  regionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  regionFlag: { fontSize: 36, marginBottom: SPACING.sm },
  regionLabel: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, textAlign: 'center', fontWeight: TYPOGRAPHY.weight.medium },
  regionLabelActive: { color: COLORS.primaryLight },
  reviewRow: { fontSize: TYPOGRAPHY.size.sm, color: COLORS.textSecondary, paddingVertical: 6, lineHeight: 22 },
  reviewValue: { color: COLORS.text, fontWeight: TYPOGRAPHY.weight.semibold },
  contactsTitle: { fontSize: TYPOGRAPHY.size.sm, fontWeight: TYPOGRAPHY.weight.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  contactItem: { fontSize: TYPOGRAPHY.size.base, color: COLORS.text, paddingVertical: 4 },
});
