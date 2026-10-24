import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import * as Audio from 'expo-av';

/**
 * Attempt to send SMS to all SOS-selected contacts.
 * @param {Array} contacts
 * @param {string} message
 * @param {boolean} practiceMode
 */
export const sendSOSMessages = async (contacts, message, practiceMode = false) => {
  const sosContacts = contacts.filter(c => c.selectedForSOS && c.phone);
  
  if (practiceMode) {
    // Simulate a 1.5s delay in practice mode
    await new Promise(r => setTimeout(r, 1500));
    return { success: true, practice: true };
  }

  if (sosContacts.length === 0) {
    return { success: false, error: 'No SOS contacts with phone numbers configured.' };
  }

  try {
    const available = await SMS.isAvailableAsync();
    if (!available) {
      return { success: false, error: 'SMS is not available on this device.' };
    }

    const phoneNumbers = sosContacts.map(c => c.phone);
    const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
    return { success: result === 'sent', result };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Get current location for the SOS alert.
 * @param {boolean} practiceMode
 */
export const getSOSLocation = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise(r => setTimeout(r, 1200));
    return {
      success: true,
      practice: true,
      coords: { latitude: 37.7749, longitude: -122.4194 },
      mapsLink: 'https://maps.google.com/?q=37.7749,-122.4194',
    };
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
      if (newStatus !== 'granted') {
        return { success: false, error: 'Location permission denied.' };
      }
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = loc.coords;
    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    return { success: true, coords: { latitude, longitude }, mapsLink };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Start audio recording for SOS evidence.
 * @param {boolean} practiceMode
 */
export const startSOSAudio = async (practiceMode = false) => {
  if (practiceMode) {
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, practice: true };
  }

  try {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Microphone permission denied.' };
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    
    // Stop after 30 seconds automatically
    setTimeout(async () => {
      try { await recording.stopAndUnloadAsync(); } catch {}
    }, 30000);

    return { success: true, recording };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Request location permission proactively (for onboarding).
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
 * Request microphone permission proactively (for onboarding).
 */
export const requestAudioPermission = async () => {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
};
