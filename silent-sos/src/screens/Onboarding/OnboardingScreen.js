import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card, SettingRow, Badge } from '../../components/UIElements';
import { StepProgressIndicator } from '../../components/StepProgressIndicator';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '../../constants/theme';
import { REGIONS } from '../../constants/resources';
import { requestLocationPermission, requestAudioPermission } from '../../services/sosService';

const { width } = Dimensions.get('window');

/**
 * Onboarding step definition list.
 */
const STEPS = [
  { key: 'welcome', title: 'Welcome' },
  { key: 'shake', title: 'Shake Trigger' },
  { key: 'contacts', title: 'Trusted Contacts' },
  { key: 'message', title: 'SOS Message' },
  { key: 'toggles', title: 'Alert Options' },
  { key: 'permissions', title: 'Permissions' },
  { key: 'decoy', title: 'Stealth Decoy' },
  { key: 'region', title: 'Your Region' },
  { key: 'review', title: 'Profile Review' },
];

/**
 * Predefined quick SOS message templates for user convenience.
 */
const MESSAGE_TEMPLATES = [
  "I need help. Please contact me immediately.",
  "Emergency! Cannot speak safely. Please track my location.",
  "Discreet SOS: Please check in on me now or call emergency services.",
];

/**
 * OnboardingScreen Component
 *
 * Comprehensive, accessible multi-step setup wizard for Silent SOS.
 * Guides users through trigger configuration, emergency contacts, alert options,
 * permissions, stealth disguise, and regional assistance.
 */
export default function OnboardingScreen() {
  const { settings, saveSettings, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Local state for all settings during onboarding
  const [sosMessage, setSosMessage] = useState(settings.sosMessage || 'I need help. Please contact me.');
  const [includeLocation, setIncludeLocation] = useState(settings.includeLocation ?? true);
  const [includeAudio, setIncludeAudio] = useState(settings.includeAudio ?? false);
  const [requestCallback, setRequestCallback] = useState(settings.requestCallback ?? false);
  const [countdownDuration, setCountdownDuration] = useState(String(settings.countdownDuration || 5));
  const [calculatorDecoyEnabled, setCalculatorDecoyEnabled] = useState(settings.calculatorDecoyEnabled ?? false);
  const [launchIntoDecoy, setLaunchIntoDecoy] = useState(settings.launchIntoDecoy ?? false);
  const [selectedRegion, setSelectedRegion] = useState(settings.selectedRegion || 'US');

  // Contact creation state
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [contactError, setContactError] = useState('');

  // Permission states
  const [locationGranted, setLocationGranted] = useState(false);
  const [audioGranted, setAudioGranted] = useState(false);

  /**
   * Smoothly transitions to next/previous step with horizontal slide and opacity fade.
   */
  const animateTo = useCallback((nextStep) => {
    Keyboard.dismiss();
    const dir = nextStep > step ? -width * 0.4 : width * 0.4;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: dir,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(-dir);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 85,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [step, slideAnim, fadeAnim]);

  const goNext = () => {
    if (step < STEPS.length - 1) {
      animateTo(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      animateTo(step - 1);
    }
  };

  const skipToEnd = () => {
    Alert.alert(
      'Skip Configuration?',
      'Default safety options will be used. You can adjust all settings anytime in the Settings tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip to Review', onPress: () => animateTo(STEPS.length - 1) },
      ]
    );
  };

  /**
   * Finalize onboarding and persist configuration atomically.
   */
  const handleFinish = async () => {
    setIsFinishing(true);
    const finalData = {
      sosMessage: sosMessage.trim(),
      includeLocation,
      includeAudio,
      requestCallback,
      countdownDuration: parseInt(countdownDuration, 10) || 5,
      calculatorDecoyEnabled,
      launchIntoDecoy,
      selectedRegion,
      onboardingComplete: true,
    };

    if (completeOnboarding) {
      await completeOnboarding(finalData);
    } else {
      await saveSettings(finalData);
    }
    setIsFinishing(false);
  };

  /**
   * Add a new emergency contact with validation.
   */
  const handleAddContact = async () => {
    setContactError('');
    const trimmedName = newContact.name.trim();
    const trimmedPhone = newContact.phone.trim();

    if (!trimmedName) {
      setContactError('Please enter the contact name.');
      return;
    }
    if (!trimmedPhone || trimmedPhone.replace(/\D/g, '').length < 7) {
      setContactError('Please enter a valid phone number (at least 7 digits).');
      return;
    }

    const updated = [
      ...settings.contacts,
      {
        id: Date.now().toString(),
        name: trimmedName,
        phone: trimmedPhone,
        selectedForSOS: true,
      },
    ];

    await saveSettings({ contacts: updated });
    setNewContact({ name: '', phone: '' });
  };

  /**
   * Remove an emergency contact during onboarding.
   */
  const handleDeleteContact = async (id) => {
    const updated = settings.contacts.filter(c => c.id !== id);
    await saveSettings({ contacts: updated });
  };

  /**
   * Toggle emergency alert inclusion for a contact.
   */
  const handleToggleContactSOS = async (id) => {
    const updated = settings.contacts.map(c =>
      c.id === id ? { ...c, selectedForSOS: !c.selectedForSOS } : c
    );
    await saveSettings({ contacts: updated });
  };

  /**
   * Renders the active sub-step view.
   */
  const renderStep = () => {
    switch (STEPS[step].key) {
      case 'welcome':
        return <WelcomeStep />;
      case 'shake':
        return <ShakeStep countdownDuration={countdownDuration} />;
      case 'contacts':
        return (
          <ContactsStep
            contacts={settings.contacts}
            newContact={newContact}
            setNewContact={setNewContact}
            onAdd={handleAddContact}
            onDelete={handleDeleteContact}
            onToggleSOS={handleToggleContactSOS}
            contactError={contactError}
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
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg0} />
      <LinearGradient colors={[COLORS.bg0, COLORS.bg1, COLORS.bg2]} style={StyleSheet.absoluteFillObject} />

      {/* Progress Indicator */}
      <StepProgressIndicator
        currentStep={step}
        totalSteps={STEPS.length}
        currentStepTitle={STEPS[step].title}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View
            style={[
              styles.stepContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {renderStep()}
            </ScrollView>
          </Animated.View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Navigation Footer */}
      <View style={styles.navBar}>
        {step > 0 ? (
          <Button
            title="Back"
            onPress={goBack}
            variant="ghost"
            size="md"
            accessibilityLabel="Back to previous step"
          />
        ) : (
          <View style={styles.navSpacer} />
        )}

        {step < STEPS.length - 1 ? (
          <View style={styles.navRight}>
            <TouchableOpacity
              onPress={skipToEnd}
              style={styles.skipBtn}
              accessibilityRole="button"
              accessibilityLabel="Skip to review"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>Skip setup</Text>
            </TouchableOpacity>
            <Button
              title="Next →"
              onPress={goNext}
              size="md"
              accessibilityLabel="Proceed to next step"
            />
          </View>
        ) : (
          <Button
            title="✓  Activate Profile"
            onPress={handleFinish}
            loading={isFinishing}
            disabled={isFinishing}
            size="md"
            variant="safe"
            accessibilityLabel="Complete onboarding and activate safety profile"
          />
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Step Components
// ─────────────────────────────────────────────────────────────

/**
 * Step 1: Welcome & Safety Architecture Overview
 */
const WelcomeStep = () => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>🛡️</Text>
    </View>
    <Text style={styles.stepTitle}>Set Up Your Safety Profile</Text>
    <Text style={styles.stepDesc}>
      Silent SOS is engineered for emergency discretion. Your private settings, contacts, and trigger parameters are stored exclusively on this device.
    </Text>

    <Card style={styles.infoCard} variant="elevated">
      <Text style={styles.infoTitle}>What we will configure together:</Text>
      {[
        '📳  Emergency Shake Trigger (3 shakes = instant SOS)',
        '👥  Trusted Contacts (broadcast recipients)',
        '✉️  Customizable SOS Alert Message',
        '📍  GPS Location & Silent Audio Evidence',
        '🧮  Calculator Stealth Decoy',
        '🌍  Regional Helplines & Emergency Numbers',
      ].map(item => (
        <View key={item} style={styles.featureRow}>
          <Text style={styles.featureBullet}>•</Text>
          <Text style={styles.infoItem}>{item}</Text>
        </View>
      ))}
    </Card>

    <View style={styles.guaranteeBox}>
      <Text style={styles.guaranteeIcon}>🔒</Text>
      <Text style={styles.guaranteeText}>
        Zero telemetry, zero cloud tracking. Your safety is confidential.
      </Text>
    </View>
  </View>
);

/**
 * Step 2: Shake Trigger Tutorial & Hardware Sensor
 */
const ShakeStep = ({ countdownDuration }) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>📳</Text>
    </View>
    <Text style={styles.stepTitle}>Emergency Shake Trigger</Text>
    <Text style={styles.stepDesc}>
      The primary trigger mechanism works without unlocking your screen or opening buttons.
    </Text>

    <Card style={styles.infoCard} variant="highlight">
      <Text style={styles.infoTitle}>How the Shake Sensor Works:</Text>
      <View style={styles.tutorialStep}>
        <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>1</Text></View>
        <Text style={styles.tutorialText}>
          Shake your phone firmly <Text style={styles.boldText}>3 times within 3 seconds</Text>.
        </Text>
      </View>
      <View style={styles.tutorialStep}>
        <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>2</Text></View>
        <Text style={styles.tutorialText}>
          The phone triggers haptic feedback and starts a <Text style={styles.boldText}>{countdownDuration}s safety countdown</Text>.
        </Text>
      </View>
      <View style={styles.tutorialStep}>
        <View style={styles.stepNumberBadge}><Text style={styles.stepNumberText}>3</Text></View>
        <Text style={styles.tutorialText}>
          If not cancelled, emergency SMS alerts and live GPS link are dispatched immediately.
        </Text>
      </View>
    </Card>

    <Card style={[styles.infoCard, { marginTop: SPACING.base }]}>
      <Text style={styles.infoTitle}>🛡️ Anti-False Alarm Protection</Text>
      <Text style={styles.stepDescSmall}>
        A calibrated 10-second cooldown activates after every alert to prevent repeated accidental triggers when running or walking.
      </Text>
    </Card>
  </View>
);

/**
 * Step 3: Trusted Contacts
 */
const ContactsStep = ({
  contacts,
  newContact,
  setNewContact,
  onAdd,
  onDelete,
  onToggleSOS,
  contactError,
}) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>👥</Text>
    </View>
    <Text style={styles.stepTitle}>Trusted Contacts</Text>
    <Text style={styles.stepDesc}>
      Add family members, trusted colleagues, or emergency advocates who will receive your SOS alerts.
    </Text>

    <Card style={{ marginBottom: SPACING.base }}>
      <Text style={styles.infoTitle}>Add New Contact</Text>
      <Input
        label="Contact Name"
        placeholder="e.g. Alex Smith"
        value={newContact.name}
        onChangeText={v => setNewContact(p => ({ ...p, name: v }))}
        returnKeyType="next"
        autoCapitalize="words"
      />
      <Input
        label="Phone Number"
        placeholder="e.g. +1 555 123 4567"
        value={newContact.phone}
        onChangeText={v => setNewContact(p => ({ ...p, phone: v }))}
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={onAdd}
        error={contactError}
      />
      <Button
        title="+ Add to Emergency List"
        onPress={onAdd}
        variant="secondary"
        size="md"
      />
    </Card>

    {contacts.length > 0 ? (
      <Card style={{ marginTop: SPACING.sm }} variant="elevated">
        <View style={styles.contactListHeader}>
          <Text style={styles.infoTitle}>Added Contacts ({contacts.length})</Text>
          <Badge label="Active for SOS" color={COLORS.safeLight} />
        </View>
        {contacts.map((c) => (
          <View key={c.id} style={styles.contactItemRow}>
            <TouchableOpacity
              onPress={() => onToggleSOS(c.id)}
              style={styles.contactInfoCol}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: c.selectedForSOS }}
              accessibilityLabel={`Toggle SOS for ${c.name}`}
            >
              <Text style={styles.contactCheckbox}>
                {c.selectedForSOS ? '✅' : '⬜️'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDelete(c.id)}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel={`Delete contact ${c.name}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}
      </Card>
    ) : (
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          ⚠️ No contacts added yet. You can still proceed and add contacts later in the Contacts tab. Without contacts, SMS broadcasts cannot be sent.
        </Text>
      </View>
    )}
  </View>
);

/**
 * Step 4: SOS Message Customization
 */
const MessageStep = ({ sosMessage, setSosMessage }) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>✉️</Text>
    </View>
    <Text style={styles.stepTitle}>SOS Alert Message</Text>
    <Text style={styles.stepDesc}>
      This text will be sent to your trusted contacts along with your GPS coordinates.
    </Text>

    <Card style={{ marginBottom: SPACING.base }}>
      <Input
        label="Custom SOS Message"
        value={sosMessage}
        onChangeText={setSosMessage}
        multiline
        numberOfLines={3}
        placeholder="I need help. Please contact me."
        hint="Under 160 characters ensures single-part SMS delivery without carrier splitting"
      />
      <Text
        style={[
          styles.charCount,
          sosMessage.length > 160 && styles.charCountWarning,
        ]}
      >
        {sosMessage.length}/160 characters
      </Text>

      <Text style={[styles.infoTitle, { marginTop: SPACING.sm, fontSize: TYPOGRAPHY.size.xs + 1 }]}>
        QUICK TEMPLATES:
      </Text>
      <View style={styles.templateChipsRow}>
        {MESSAGE_TEMPLATES.map((tpl, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSosMessage(tpl)}
            style={[
              styles.templateChip,
              sosMessage === tpl && styles.templateChipActive,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Use template: ${tpl}`}
          >
            <Text
              style={[
                styles.templateChipText,
                sosMessage === tpl && styles.templateChipTextActive,
              ]}
              numberOfLines={2}
            >
              "{tpl}"
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>

    <Card style={styles.infoCard}>
      <Text style={styles.infoTitle}>💡 AI Message Assistant Available</Text>
      <Text style={styles.stepDescSmall}>
        In the Settings tab, you can use our built-in Gemma AI Assistant to generate customized, discreet alert messages for specific covert scenarios.
      </Text>
    </Card>
  </View>
);

/**
 * Step 5: Alert Options & Countdown
 */
const TogglesStep = ({
  includeLocation, setIncludeLocation,
  includeAudio, setIncludeAudio,
  requestCallback, setRequestCallback,
  countdownDuration, setCountdownDuration,
}) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>⚙️</Text>
    </View>
    <Text style={styles.stepTitle}>Alert Options</Text>
    <Text style={styles.stepDesc}>
      Fine-tune what evidence and instructions are attached to your emergency broadcast.
    </Text>

    <Card style={{ marginBottom: SPACING.base }}>
      <SettingRow
        icon="📍"
        title="Include GPS Location"
        subtitle="Appends your precise Google Maps link to the alert"
        value={includeLocation}
        onValueChange={setIncludeLocation}
      />
      <SettingRow
        icon="🎤"
        title="Record Silent Audio"
        subtitle="Silently captures 30s ambient evidence after countdown"
        value={includeAudio}
        onValueChange={setIncludeAudio}
      />
      <SettingRow
        icon="📞"
        title="Request Immediate Callback"
        subtitle="Includes an urgent request for contacts to ring your phone"
        value={requestCallback}
        onValueChange={setRequestCallback}
      />
    </Card>

    <Card variant="elevated">
      <Text style={styles.infoTitle}>Safety Countdown Duration</Text>
      <Text style={styles.stepDescSmall}>
        How many seconds you have to cancel a false trigger before messages are dispatched:
      </Text>
      <View style={styles.countdownRow}>
        {['3', '5', '10', '15'].map(n => (
          <TouchableOpacity
            key={n}
            style={[
              styles.countdownBtn,
              String(countdownDuration) === n && styles.countdownBtnActive,
            ]}
            onPress={() => setCountdownDuration(n)}
            accessibilityRole="button"
            accessibilityLabel={`Set countdown to ${n} seconds`}
            accessibilityState={{ selected: String(countdownDuration) === n }}
          >
            <Text
              style={[
                styles.countdownText,
                String(countdownDuration) === n && styles.countdownTextActive,
              ]}
            >
              {n}s
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  </View>
);

/**
 * Step 6: Permissions
 */
const PermissionsStep = ({
  includeLocation,
  includeAudio,
  locationGranted,
  audioGranted,
  onRequestLocation,
  onRequestAudio,
}) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>🔐</Text>
    </View>
    <Text style={styles.stepTitle}>Device Permissions</Text>
    <Text style={styles.stepDesc}>
      Silent SOS requests permissions strictly for features you have enabled.
    </Text>

    {includeLocation && (
      <Card style={{ marginBottom: SPACING.base }}>
        <View style={styles.permHeaderRow}>
          <Text style={styles.permTitle}>📍  Location Access</Text>
          {locationGranted && <Badge label="Granted" color={COLORS.safeLight} />}
        </View>
        <Text style={styles.permDesc}>
          Required to fetch GPS coordinates when SOS is triggered. Location is never tracked or queried in the background.
        </Text>
        {locationGranted ? (
          <Text style={styles.grantedText}>✅  Permission granted and verified</Text>
        ) : (
          <Button
            title="Grant Location Permission"
            onPress={onRequestLocation}
            variant="secondary"
            size="md"
            style={{ marginTop: SPACING.md }}
          />
        )}
      </Card>
    )}

    {includeAudio && (
      <Card style={{ marginBottom: SPACING.base }}>
        <View style={styles.permHeaderRow}>
          <Text style={styles.permTitle}>🎤  Microphone Access</Text>
          {audioGranted && <Badge label="Granted" color={COLORS.safeLight} />}
        </View>
        <Text style={styles.permDesc}>
          Required to record ambient audio evidence when an SOS countdown completes.
        </Text>
        {audioGranted ? (
          <Text style={styles.grantedText}>✅  Permission granted and verified</Text>
        ) : (
          <Button
            title="Grant Microphone Permission"
            onPress={onRequestAudio}
            variant="secondary"
            size="md"
            style={{ marginTop: SPACING.md }}
          />
        )}
      </Card>
    )}

    {!includeLocation && !includeAudio && (
      <Card>
        <Text style={styles.permDesc}>
          You have not enabled GPS location or audio recording, so no native device permissions are required at this time.
        </Text>
      </Card>
    )}
  </View>
);

/**
 * Step 7: Calculator Stealth Decoy
 */
const DecoyStep = ({
  calculatorDecoyEnabled, setCalculatorDecoyEnabled,
  launchIntoDecoy, setLaunchIntoDecoy,
}) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>🧮</Text>
    </View>
    <Text style={styles.stepTitle}>Stealth Disguise</Text>
    <Text style={styles.stepDesc}>
      The app can disguise itself as a fully functional calculator to protect your privacy if someone inspects your screen.
    </Text>

    <Card style={{ marginBottom: SPACING.base }}>
      <SettingRow
        icon="🧮"
        title="Calculator Decoy Front"
        subtitle="Renders a standard working calculator"
        value={calculatorDecoyEnabled}
        onValueChange={setCalculatorDecoyEnabled}
      />
      {calculatorDecoyEnabled && (
        <SettingRow
          icon="🚀"
          title="Launch Directly into Calculator"
          subtitle="Always opens calculator first upon app launch"
          value={launchIntoDecoy}
          onValueChange={setLaunchIntoDecoy}
        />
      )}
    </Card>

    {calculatorDecoyEnabled ? (
      <Card variant="highlight">
        <Text style={styles.infoTitle}>🤫 Secret Return Gesture</Text>
        <Text style={styles.tutorialText}>
          To return to the safety interface, <Text style={styles.boldText}>long-press the "C" button for 3 seconds</Text>.
        </Text>
        <Text style={[styles.tutorialText, { marginTop: SPACING.xs }]}>
          Alternatively, simply shake the device 3 times — the emergency shake sensor remains active even inside the calculator!
        </Text>
      </Card>
    ) : null}
  </View>
);

/**
 * Step 8: Region Selection
 */
const RegionStep = ({ selectedRegion, setSelectedRegion }) => (
  <View style={styles.stepContent}>
    <View style={styles.iconCircle}>
      <Text style={styles.bigIcon}>🌍</Text>
    </View>
    <Text style={styles.stepTitle}>Emergency Region</Text>
    <Text style={styles.stepDesc}>
      Select your primary geographic region to display verified local emergency numbers (e.g., 911, 999, 112) and offline hotlines.
    </Text>

    <View style={styles.regionGrid}>
      {REGIONS.map((r) => {
        const isSelected = selectedRegion === r.code;
        return (
          <TouchableOpacity
            key={r.code}
            style={[
              styles.regionBtn,
              isSelected && styles.regionBtnActive,
            ]}
            onPress={() => setSelectedRegion(r.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Select region ${r.label}`}
          >
            <Text style={styles.regionFlag}>{r.flag}</Text>
            <Text style={[styles.regionLabel, isSelected && styles.regionLabelActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

/**
 * Step 9: Final Safety Profile Review
 */
const ReviewStep = ({
  sosMessage,
  includeLocation,
  includeAudio,
  requestCallback,
  countdownDuration,
  calculatorDecoyEnabled,
  selectedRegion,
  contactCount,
}) => {
  const region = REGIONS.find(r => r.code === selectedRegion);

  return (
    <View style={styles.stepContent}>
      <View style={styles.iconCircle}>
        <Text style={styles.bigIcon}>✅</Text>
      </View>
      <Text style={styles.stepTitle}>Configuration Summary</Text>
      <Text style={styles.stepDesc}>
        Your emergency configuration is finalized and ready to activate.
      </Text>

      {/* Shake Trigger Status */}
      <Card style={[styles.infoCard, { marginBottom: SPACING.base }]} variant="highlight">
        <Text style={styles.infoTitle}>📳 Shake Sensor: ACTIVE</Text>
        <Text style={styles.tutorialText}>
          Shake 3× within 3 seconds triggers instant SOS with a {countdownDuration}s cancellation window.
        </Text>
      </Card>

      {/* Summary table */}
      <Card style={{ marginBottom: SPACING.base }} variant="elevated">
        <Text style={styles.infoTitle}>Active Parameters</Text>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Trusted Contacts:</Text>
          <Text style={styles.summaryValue}>{contactCount} selected for alert</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>GPS Coordinates:</Text>
          <Text style={styles.summaryValue}>{includeLocation ? 'Enabled' : 'Disabled'}</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Audio Recording:</Text>
          <Text style={styles.summaryValue}>{includeAudio ? 'Enabled (30s)' : 'Disabled'}</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Callback Request:</Text>
          <Text style={styles.summaryValue}>{requestCallback ? 'Requested' : 'Off'}</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Countdown Timer:</Text>
          <Text style={styles.summaryValue}>{countdownDuration} seconds</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Disguise Front:</Text>
          <Text style={styles.summaryValue}>{calculatorDecoyEnabled ? 'Calculator Mode' : 'Standard'}</Text>
        </View>
        <View style={styles.summaryItemRow}>
          <Text style={styles.summaryLabel}>Selected Region:</Text>
          <Text style={styles.summaryValue}>{region?.flag} {region?.label}</Text>
        </View>
      </Card>

      {/* Safety Legal Warning */}
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          ⚠️  Delivery depends on cell service, SMS reception, and OS permissions. In situations of immediate life-threatening danger, contact local emergency services (e.g., 911, 999, 112) directly whenever safe to do so.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg0,
  },
  flex: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  stepContent: {
    paddingTop: SPACING.base,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(74, 144, 217, 0.1)',
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight + '44',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    ...SHADOWS.primary,
  },
  bigIcon: {
    fontSize: 40,
  },
  stepTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.4,
  },
  stepDesc: {
    fontSize: TYPOGRAPHY.size.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  stepDescSmall: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: SPACING.base,
  },
  infoTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  featureBullet: {
    color: COLORS.primaryLight,
    fontSize: 16,
    marginRight: SPACING.sm,
    lineHeight: 20,
  },
  infoItem: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  guaranteeIcon: {
    fontSize: 20,
    marginRight: SPACING.sm,
  },
  guaranteeText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xs + 1,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  tutorialStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: 'bold',
  },
  tutorialText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  boldText: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
  },
  contactListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  contactInfoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactCheckbox: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  contactName: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  contactPhone: {
    fontSize: TYPOGRAPHY.size.xs + 1,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  deleteBtn: {
    padding: SPACING.sm,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.xs,
    textAlign: 'right',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.base,
  },
  charCountWarning: {
    color: COLORS.warningLight,
    fontWeight: 'bold',
  },
  templateChipsRow: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  templateChip: {
    backgroundColor: COLORS.bg3,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  templateChipText: {
    fontSize: TYPOGRAPHY.size.xs + 1,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  templateChipTextActive: {
    color: COLORS.primaryLight,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  countdownRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  countdownBtn: {
    flex: 1,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  countdownText: {
    fontSize: TYPOGRAPHY.size.lg,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  countdownTextActive: {
    color: COLORS.primaryLight,
  },
  permHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  permTitle: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  permDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  grantedText: {
    color: COLORS.safeLight,
    fontSize: TYPOGRAPHY.size.sm,
    marginTop: SPACING.md,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
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
  regionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  regionFlag: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  regionLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  regionLabelActive: {
    color: COLORS.primaryLight,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  warningCard: {
    backgroundColor: COLORS.warningDim,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.warning + '44',
    marginTop: SPACING.base,
  },
  warningText: {
    color: COLORS.warningLight,
    fontSize: TYPOGRAPHY.size.xs + 1,
    lineHeight: 18,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg1,
  },
  navSpacer: {
    width: 70,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
  },
  skipBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.sm,
  },
});
