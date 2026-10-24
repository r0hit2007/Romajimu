/**
 * Native SMS Dispatch Service
 * 
 * Android vs. iOS Platform Architecture:
 * 
 * 1. Android (Automated Silent SMS):
 *    - Uses native android.telephony.SmsManager via DirectSms native bridge when available
 *      (e.g., in Expo Development Build or standalone APK) requiring android.permission.SEND_SMS.
 *    - Sends emergency text messages silently in the background WITHOUT launching the default
 *      SMS app or requiring visual interaction from an abuser in proximity.
 *    - In Expo Go development runtime, gracefully falls back to expo-sms composer.
 * 
 * 2. iOS (Automated Composer Launch):
 *    - Apple's iOS security sandbox explicitly prohibits silent background SMS dispatch
 *      by third-party applications (MFMessageComposeViewController requirement).
 *    - The emergency workflow automatically invokes the pre-filled system composer
 *      with recipients and message populated instantly upon countdown expiration.
 */

import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import * as SMS from 'expo-sms';

const DirectSms = NativeModules.DirectSms || NativeModules.ExpoDirectSms;

/**
 * Request Android runtime SEND_SMS permission
 */
export const requestAndroidSmsPermission = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title: 'Emergency SMS Permission',
        message: 'Silent SOS requires SMS permission to send automated emergency alerts to your trusted contacts.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Grant',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('Failed to request SEND_SMS permission:', err.message);
    return false;
  }
};

/**
 * Dispatch automated SMS across multiple recipients
 * @param {Array<string>} phoneNumbers - Sanitized list of recipient phone numbers
 * @param {string} message - SOS message text with location
 * @param {boolean} practiceMode - If true, simulates dispatch without transmitting
 */
export const sendAutomatedSMS = async (phoneNumbers = [], message = '', practiceMode = false) => {
  const recipients = Array.isArray(phoneNumbers) ? phoneNumbers.filter(Boolean) : [];

  if (practiceMode) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      success: true,
      practice: true,
      recipientCount: recipients.length,
      method: 'practice_simulated',
    };
  }

  if (recipients.length === 0) {
    return {
      success: false,
      error: 'No valid recipient phone numbers provided.',
      recipientCount: 0,
    };
  }

  // ── Android Automated Silent SMS Execution ─────────────────────
  if (Platform.OS === 'android') {
    // Check if native DirectSms module is available in this build (Dev Build / Standalone)
    if (DirectSms && typeof DirectSms.sendDirectSms === 'function') {
      const hasPermission = await requestAndroidSmsPermission();
      if (hasPermission) {
        try {
          const sendPromises = recipients.map((phone) =>
            new Promise((resolve, reject) => {
              DirectSms.sendDirectSms(
                phone,
                message,
                (msgId) => resolve({ phone, success: true, id: msgId }),
                (errMsg) => reject(new Error(errMsg))
              );
            })
          );

          await Promise.allSettled(sendPromises);
          return {
            success: true,
            recipientCount: recipients.length,
            method: 'android_silent_direct',
          };
        } catch (err) {
          console.warn('Direct SMS failed, falling back to system SMS:', err.message);
        }
      }
    }
  }

  // ── Universal Expo / iOS Fallback Execution ─────────────────────
  // On iOS or when DirectSms is unlinked in Expo Go:
  // Automatically open SMS composer with pre-filled recipients and message
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'SMS hardware/service is not available on this device.',
        recipientCount: recipients.length,
      };
    }

    const { result } = await SMS.sendSMSAsync(recipients, message);
    return {
      success: result === 'sent' || result === 'unknown',
      result,
      recipientCount: recipients.length,
      method: Platform.OS === 'ios' ? 'ios_automated_composer' : 'expo_system_composer',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'SMS transmission failed.',
      recipientCount: recipients.length,
    };
  }
};
