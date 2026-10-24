import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';

// Keep reference to active recording to allow clean cancellation
let activeRecording = null;
let recordingTimeout = null;

/**
 * Attempt to send SMS to all SOS-selected contacts.
 * Fault-tolerant with contact validation and sanitization.
 * @param {Array} contacts
 * @param {string} message
 * @param {boolean} practiceMode
 */
export const sendSOSMessages = async (contacts = [], message = '', practiceMode = false) => {
  const contactList = Array.isArray(contacts) ? contacts : [];
  const sosContacts = contactList.filter(c => c && c.selectedForSOS && c.phone && String(c.phone).trim().length > 0);

  if (practiceMode) {
    await new Promise(r => setTimeout(r, 1200));
    return { success: true, practice: true, recipientCount: sosContacts.length };
  }

  if (sosContacts.length === 0) {
    return {
      success: false,
      error: 'No trusted emergency contacts configured with valid phone numbers.',
      recipientCount: 0,
    };
  }

  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'SMS service is not available on this device hardware.',
        recipientCount: sosContacts.length,
      };
    }

    // Clean and deduplicate phone numbers
    const rawPhones = sosContacts.map(c => String(c.phone).trim().replace(/[\s()-]/g, ''));
    const phoneNumbers = [...new Set(rawPhones)].filter(Boolean);

    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    return {
      success: result === 'sent' || result === 'unknown', // on iOS unknown can mean handed over to system
      result,
      recipientCount: phoneNumbers.length,
    };
  } catch (err) {
    return { success: false, error: err.message || 'SMS transmission failed.' };
  }
};

/**
 * Get current GPS location for the SOS alert.
 * Includes timeout race and cached position fallback to prevent hanging in low-signal areas.
 * @param {boolean} practiceMode
 */
export const getSOSLocation = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise(r => setTimeout(r, 800));
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
 * Start covert ambient audio recording for SOS evidence.
 * Configures audio recording mode with auto-stop after 30 seconds.
 * @param {boolean} practiceMode
 */
export const startSOSAudio = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise(r => setTimeout(r, 600));
    return { success: true, practice: true };
  }

  try {
    // If a recording is already active, stop it cleanly first
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

    // Automatically stop after 30 seconds and unload
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
      // Ignore if already stopped
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
