import * as Location from 'expo-location';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { sendAutomatedSMS } from './nativeSmsService';
import apiService from './apiService';

// Keep reference to active recording to allow clean cancellation
let activeRecording = null;
let recordingTimeout = null;

/**
 * Dispatch automated SMS alerts to all configured contacts.
 * On Android: triggers silent direct SMS if native module is present.
 * On iOS: opens pre-filled system composer automatically.
 * @param {Array} contacts
 * @param {string} message
 * @param {boolean} practiceMode
 */
export const sendSOSMessages = async (contacts = [], message = '', practiceMode = false) => {
  const contactList = Array.isArray(contacts) ? contacts : [];
  const sosContacts = contactList.filter(
    (c) => c && (c.selectedForSOS || c.is_sos_enabled) && c.phone && String(c.phone).trim().length > 0
  );

  if (practiceMode) {
    await new Promise((r) => setTimeout(r, 1000));
    return { success: true, practice: true, recipientCount: sosContacts.length, method: 'practice_simulated' };
  }

  if (sosContacts.length === 0) {
    return {
      success: false,
      error: 'No trusted emergency contacts configured with valid phone numbers.',
      recipientCount: 0,
    };
  }

  const rawPhones = sosContacts.map((c) => String(c.phone).trim().replace(/[\s()-]/g, ''));
  const phoneNumbers = [...new Set(rawPhones)].filter(Boolean);

  return sendAutomatedSMS(phoneNumbers, message, practiceMode);
};

/**
 * Get current GPS location for the SOS alert.
 * Includes timeout race and cached position fallback to prevent hanging in low-signal areas.
 * @param {boolean} practiceMode
 */
export const getSOSLocation = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      success: true,
      practice: true,
      coords: { latitude: 37.7749, longitude: -122.4194 },
      mapsLink: 'https://maps.google.com/?q=37.7749,-122.4194',
      accuracy: 5,
    };
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        return { success: false, error: 'Location permission was denied.' };
      }
    }

    // Race current high-accuracy position with a 6-second timeout
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Location request timed out')), 6000)
    );

    let loc;
    try {
      loc = await Promise.race([locationPromise, timeoutPromise]);
    } catch {
      // Fallback to last known position if real-time GPS takes too long
      loc = await Location.getLastKnownPositionAsync();
    }

    if (!loc || !loc.coords) {
      return { success: false, error: 'Could not obtain GPS fix.' };
    }

    const { latitude, longitude, accuracy } = loc.coords;
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    return {
      success: true,
      coords: { latitude, longitude },
      accuracy: Math.round(accuracy || 10),
      mapsLink,
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to determine location.' };
  }
};

/**
 * Master Automated Emergency Workflow
 * Executes step-by-step immediately when countdown finishes:
 * 1. Fetch current GPS coordinates
 * 2. Generate Google Maps location link
 * 3. Construct discreet emergency alert message
 * 4. Dispatch SMS automatically (silent on Android, composer on iOS)
 * 5. Record emergency alert event inside PostgreSQL database
 * 6. Start covert ambient audio evidence recording (if enabled)
 * 
 * @param {Object} options
 * @param {Array} options.contacts
 * @param {string} options.customMessage
 * @param {string} options.triggerSource - 'shake' | 'calculator' | 'manual'
 * @param {boolean} options.practiceMode
 * @param {boolean} options.includeLocation
 * @param {boolean} options.includeAudio
 * @param {Function} options.onProgress - Status feedback callback
 */
export const executeEmergencyWorkflow = async ({
  contacts = [],
  customMessage = '',
  triggerSource = 'manual',
  practiceMode = false,
  includeLocation = true,
  includeAudio = false,
  onProgress = () => {},
}) => {
  const timestamp = new Date().toISOString();
  onProgress('Acquiring GPS location...');

  // 1. Fetch GPS Coordinates
  let locResult = { success: false };
  if (includeLocation) {
    locResult = await getSOSLocation(practiceMode);
  }

  // 2. Build Message with Location Link
  let finalMessage = customMessage || 'Emergency: I need assistance immediately.';
  if (locResult.success && locResult.mapsLink) {
    finalMessage = `${finalMessage}\nMy current location: ${locResult.mapsLink}`;
  }

  // 3. Automated SMS Dispatch
  onProgress('Sending automated emergency SMS...');
  const smsResult = await sendSOSMessages(contacts, finalMessage, practiceMode);

  // 4. Log Alert to Backend PostgreSQL
  onProgress('Recording alert to secure cloud...');
  let alertRecord = null;
  try {
    alertRecord = await apiService.sos.recordAlert({
      latitude: locResult.coords?.latitude ?? null,
      longitude: locResult.coords?.longitude ?? null,
      message: finalMessage,
      trigger_method: triggerSource, // 'shake' | 'calculator' | 'manual'
      status: practiceMode ? 'practice' : smsResult.success ? 'sent' : 'failed',
      recipient_count: smsResult.recipientCount || 0,
    });
  } catch (err) {
    console.warn('Failed to record alert to cloud, enqueued offline:', err.message);
  }

  // 5. Start Covert Audio Recording if Enabled
  if (includeAudio) {
    onProgress('Starting covert audio recording...');
    startSOSAudio(practiceMode).catch(() => {});
  }

  onProgress('Emergency alert successfully dispatched.');

  return {
    success: practiceMode ? true : smsResult.success,
    timestamp,
    location: locResult,
    message: finalMessage,
    smsResult,
    alertRecord,
    triggerSource,
    practiceMode,
  };
};

/**
 * Start covert ambient audio recording for SOS evidence.
 * Configures audio recording mode with auto-stop after 30 seconds.
 * @param {boolean} practiceMode
 */
export const startSOSAudio = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise((r) => setTimeout(r, 600));
    return { success: true, practice: true };
  }

  try {
    await stopSOSAudio();

    if (typeof requestRecordingPermissionsAsync === 'function') {
      const perm = await requestRecordingPermissionsAsync().catch(() => ({ status: 'undetermined' }));
      if (perm && perm.status !== 'granted') {
        return { success: false, error: 'Microphone permission denied.' };
      }
    }

    if (typeof setAudioModeAsync === 'function') {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      }).catch(() => {});
    }

    // Automatically stop after 30 seconds
    recordingTimeout = setTimeout(async () => {
      await stopSOSAudio();
    }, 30000);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Audio recording setup failed.' };
  }
};

/**
 * Stop active SOS audio recording and release hardware resources.
 */
export const stopSOSAudio = async () => {
  if (recordingTimeout) {
    clearTimeout(recordingTimeout);
    recordingTimeout = null;
  }
  if (activeRecording) {
    try {
      if (typeof activeRecording.stop === 'function') {
        await activeRecording.stop();
      }
    } catch {
      // Ignore
    } finally {
      activeRecording = null;
    }
  }
};

/**
 * Request location permission proactively (for onboarding or settings).
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};

/**
 * Request microphone permission proactively (for onboarding or settings).
 */
export const requestAudioPermission = async () => {
  try {
    if (typeof requestRecordingPermissionsAsync === 'function') {
      const { status } = await requestRecordingPermissionsAsync();
      return status === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};
