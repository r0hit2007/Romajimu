import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utils/storageService';

/**
 * Default initial settings for Silent SOS application.
 */
const defaultSettings = {
  // Auth state
  isAuthenticated: false,
  userName: '',
  userEmail: '',

  // SOS Configuration
  sosMessage: 'I need help. Please contact me.',
  includeLocation: true,
  includeAudio: false,
  requestCallback: false,
  countdownDuration: 5,

  // Trusted Contacts list
  contacts: [],

  // Discretion & Feature Flags
  calculatorDecoyEnabled: false,
  launchIntoDecoy: false,
  selectedRegion: 'US',

  // Onboarding state
  onboardingComplete: false,
  practiceMode: false,
};

const AppContext = createContext(null);

/**
 * AppProvider Component
 *
 * Manages global application state including authentication, user profile,
 * emergency contacts, stealth settings, and active SOS lifecycle.
 * Optimized with useCallback and useMemo to prevent unnecessary re-renders.
 */
export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [sosStatus, setSosStatus] = useState({
    sms: 'idle',    // idle | pending | sent | failed
    location: 'idle',
    audio: 'idle',
  });

  /**
   * Load stored settings upon initial mount using robust storageService.
   */
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const stored = await getItem(STORAGE_KEYS.SETTINGS, null);
        if (stored && isMounted && typeof stored === 'object') {
          setSettings(prev => ({ ...prev, ...stored }));
        }
      } catch (e) {
        console.warn('[AppContext] Failed to load settings:', e);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Atomically save settings updates to React state and persist.
   * Uses functional state updates to eliminate stale closure race conditions.
   *
   * @param {Object} updates - Key-value map of settings to update.
   * @returns {Promise<boolean>} True if successfully persisted.
   */
  const saveSettings = useCallback(async (updates) => {
    try {
      let mergedSettings;
      setSettings(prev => {
        mergedSettings = { ...prev, ...updates };
        return mergedSettings;
      });
      await setItem(STORAGE_KEYS.SETTINGS, mergedSettings);
      return true;
    } catch (e) {
      console.warn('[AppContext] Failed to save settings:', e);
      return false;
    }
  }, []);

  /**
   * Log into the application with email and password.
   *
   * @param {string} email - User email address.
   * @param {string} password - User password.
   * @param {string} [name=''] - Optional user display name.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const login = useCallback(async (email, password, name = '') => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g., name@example.com).' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const displayName = name.trim() || trimmedEmail.split('@')[0];
    const success = await saveSettings({
      isAuthenticated: true,
      userEmail: trimmedEmail,
      userName: displayName,
    });

    if (success) {
      return { success: true };
    }
    return { success: false, error: 'An unexpected storage error occurred. Please try again.' };
  }, [saveSettings]);

  /**
   * Register a new user account.
   *
   * @param {string} name - User's full name.
   * @param {string} email - User's email address.
   * @param {string} password - User's password.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const signup = useCallback(async (name, email, password) => {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Please enter your name (at least 2 characters).' };
    }
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const success = await saveSettings({
      isAuthenticated: true,
      userEmail: trimmedEmail,
      userName: trimmedName,
      onboardingComplete: false,
    });

    if (success) {
      return { success: true };
    }
    return { success: false, error: 'Failed to create account. Please try again.' };
  }, [saveSettings]);

  /**
   * Send password reset email link (demo flow).
   *
   * @param {string} email - User email address.
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  const resetPassword = useCallback(async (email) => {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      return { success: false, error: 'Please enter your email address.' };
    }
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    return {
      success: true,
      message: `Password reset link has been dispatched to ${trimmedEmail}.`,
    };
  }, []);

  /**
   * Complete onboarding and save all configuration in a single atomic update.
   *
   * @param {Object} onboardingData - User chosen settings during onboarding.
   * @returns {Promise<boolean>}
   */
  const completeOnboarding = useCallback(async (onboardingData = {}) => {
    return await saveSettings({
      ...onboardingData,
      onboardingComplete: true,
    });
  }, [saveSettings]);

  /**
   * Log out of current session.
   */
  const logout = useCallback(async () => {
    await saveSettings({ isAuthenticated: false });
  }, [saveSettings]);

  /**
   * Delete user account and restore factory default settings.
   */
  const deleteAccount = useCallback(async () => {
    try {
      await removeItem(STORAGE_KEYS.SETTINGS);
      setSettings(defaultSettings);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Add a new emergency contact.
   */
  const addContact = useCallback(async (contact) => {
    const newId = contact.id || `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = [...currentList, { ...contact, id: newId, createdAt: contact.createdAt || Date.now(), selectedForSOS: contact.selectedForSOS ?? true }];
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return newId;
  }, [settings]);

  /**
   * Update an existing emergency contact.
   */
  const updateContact = useCallback(async (id, updates) => {
    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c);
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return updated;
  }, [settings]);

  /**
   * Delete an emergency contact by ID.
   */
  const deleteContact = useCallback(async (id) => {
    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.filter(c => c.id !== id);
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return updated;
  }, [settings]);

  /**
   * Toggle SOS alert inclusion for a contact.
   */
  const toggleContactSOS = useCallback(async (id) => {
    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.map(c =>
        c.id === id ? { ...c, selectedForSOS: !c.selectedForSOS, updatedAt: Date.now() } : c
      );
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return updated;
  }, [settings]);

  /**
   * Reset active SOS trigger state.
   */
  const resetSosStatus = useCallback(() => {
    setSosStatus({ sms: 'idle', location: 'idle', audio: 'idle' });
    setSosActive(false);
  }, []);

  const contextValue = useMemo(() => ({
    settings,
    saveSettings,
    isLoading,
    sosActive,
    setSosActive,
    sosStatus,
    setSosStatus,
    resetSosStatus,
    login,
    signup,
    resetPassword,
    completeOnboarding,
    logout,
    deleteAccount,
    addContact,
    updateContact,
    deleteContact,
    toggleContactSOS,
  }), [
    settings,
    saveSettings,
    isLoading,
    sosActive,
    sosStatus,
    resetSosStatus,
    login,
    signup,
    resetPassword,
    completeOnboarding,
    logout,
    deleteAccount,
    addContact,
    updateContact,
    deleteContact,
    toggleContactSOS,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Custom hook to access application context.
 *
 * @throws {Error} if used outside AppProvider.
 * @returns {Object} Application context methods and state.
 */
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
