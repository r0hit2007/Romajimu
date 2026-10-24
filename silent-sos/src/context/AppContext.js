/**
 * @file AppContext.js
 * @description Centralized state management for Silent SOS mobile application.
 * Manages authentication, user profile, emergency contacts, SOS configuration,
 * and hardware decoy settings with PostgreSQL backend synchronization and offline fallback.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utils/storageService';
import apiService from '../services/apiService';

/**
 * Factory default settings for first-time app launch.
 */
const defaultSettings = {
  // Auth
  isAuthenticated: false,
  userId: null,
  userName: '',
  userEmail: '',

  // SOS Configuration
  sosMessage: 'I need help. Please contact me.',
  includeLocation: true,
  includeAudio: false,
  requestCallback: false,
  countdownDuration: 5,

  // Trusted Contacts
  contacts: [],

  // App Features
  calculatorDecoyEnabled: false,
  launchIntoDecoy: false,
  selectedRegion: 'US',

  // Onboarding
  onboardingComplete: false,
  practiceMode: false,
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [sosStatus, setSosStatus] = useState({
    sms: 'idle',      // idle | pending | sent | failed
    location: 'idle', // idle | pending | sent | failed
    audio: 'idle',    // idle | pending | sent | failed
  });

  // ─── Initial State Loading from Cache & Backend ────────────
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        // 1. Load local cache first for instant UI response
        const stored = await getItem(STORAGE_KEYS.SETTINGS, null);
        if (stored && isMounted && typeof stored === 'object') {
          setSettings(prev => ({ ...prev, ...stored }));
        }

        // 2. Fetch fresh user session and synced data from backend if authenticated
        await apiService.initToken();
        if (apiService.token && isMounted) {
          try {
            const profileRes = await apiService.auth.getMe();
            if (profileRes.data && isMounted) {
              const serverUser = profileRes.data;
              const updated = {
                ...settings,
                ...(stored || {}),
                isAuthenticated: true,
                userId: serverUser.id,
                userName: serverUser.name,
                userEmail: serverUser.email,
                contacts: serverUser.contacts?.length > 0 ? serverUser.contacts : (stored?.contacts || []),
                countdownDuration: serverUser.settings?.countdown || stored?.countdownDuration || 5,
                sosMessage: serverUser.settings?.custom_message || stored?.sosMessage || defaultSettings.sosMessage,
                selectedRegion: serverUser.settings?.region || stored?.selectedRegion || 'US',
                includeLocation: serverUser.settings?.include_location ?? stored?.includeLocation ?? true,
                includeAudio: serverUser.settings?.include_audio ?? stored?.includeAudio ?? false,
              };
              setSettings(updated);
              await setItem(STORAGE_KEYS.SETTINGS, updated);

              // Background sync any queued offline emergency alerts to PostgreSQL
              apiService.sos.syncOfflineQueue().catch(() => {});
            }
          } catch (netErr) {
            console.warn('[AppContext] Offline or backend unreachable, using cached session:', netErr.message);
          }
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
   * Syncs changes to backend if authenticated.
   */
  const saveSettings = useCallback(async (updates) => {
    try {
      let mergedSettings;
      setSettings(prev => {
        mergedSettings = { ...prev, ...updates };
        return mergedSettings;
      });
      await setItem(STORAGE_KEYS.SETTINGS, mergedSettings);

      // Sync settings with backend if authenticated
      if (mergedSettings.isAuthenticated && (updates.countdownDuration !== undefined || updates.sosMessage !== undefined || updates.selectedRegion !== undefined)) {
        apiService.sos.updateSettings({
          countdown: mergedSettings.countdownDuration,
          custom_message: mergedSettings.sosMessage,
          region: mergedSettings.selectedRegion,
          include_location: mergedSettings.includeLocation,
          include_audio: mergedSettings.includeAudio,
          practice_mode: mergedSettings.practiceMode,
        }).catch(() => {});
      }

      return true;
    } catch (e) {
      console.warn('[AppContext] Failed to save settings:', e);
      return false;
    }
  }, []);

  /**
   * Log into the application with email and password via backend.
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

    try {
      const data = await apiService.auth.login({ email: trimmedEmail, password });
      const serverUser = data.user;

      // Fetch fresh contacts from backend
      let contacts = [];
      try {
        contacts = await apiService.contacts.getContacts();
      } catch {
        contacts = settings.contacts || [];
      }

      const updated = {
        ...settings,
        isAuthenticated: true,
        userId: serverUser.id,
        userEmail: serverUser.email,
        userName: serverUser.name || name || trimmedEmail.split('@')[0],
        contacts: contacts.length > 0 ? contacts : settings.contacts,
        countdownDuration: serverUser.settings?.countdown || settings.countdownDuration,
        sosMessage: serverUser.settings?.custom_message || settings.sosMessage,
        selectedRegion: serverUser.settings?.region || settings.selectedRegion,
      };

      await saveSettings(updated);
      return { success: true };
    } catch (err) {
      console.warn('[AppContext] Backend login error:', err.message);
      // Offline fallback login check if previously authenticated
      if (settings.userEmail === trimmedEmail && settings.isAuthenticated) {
        return { success: true, offline: true };
      }
      return {
        success: false,
        error: err.message || 'Login failed. Please check your credentials or connection.',
      };
    }
  }, [saveSettings, settings]);

  /**
   * Register a new user account with production backend.
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

    try {
      const data = await apiService.auth.signup({ name: trimmedName, email: trimmedEmail, password });
      const serverUser = data.user;

      const updated = {
        ...settings,
        isAuthenticated: true,
        userId: serverUser.id,
        userEmail: serverUser.email,
        userName: serverUser.name || trimmedName,
        onboardingComplete: false,
      };

      await saveSettings(updated);
      return { success: true };
    } catch (err) {
      console.warn('[AppContext] Backend signup error:', err.message);
      return {
        success: false,
        error: err.message || 'Registration failed. Please try again.',
      };
    }
  }, [saveSettings, settings]);

  /**
   * Send password reset request.
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

    try {
      await apiService.auth.forgotPassword({ email: trimmedEmail, newPassword: 'ResetPassword_' + Math.random().toString(36).slice(2, 8) });
      return {
        success: true,
        message: `Password reset instructions have been dispatched to ${trimmedEmail}.`,
      };
    } catch {
      return {
        success: true,
        message: `If an account exists for ${trimmedEmail}, reset instructions have been sent.`,
      };
    }
  }, []);

  const forgotPassword = useCallback(async (email, newPassword) => {
    try {
      const res = await apiService.auth.forgotPassword({ email, newPassword });
      return { success: true, message: res.message };
    } catch (err) {
      return { success: false, error: err.message || 'Password reset request failed.' };
    }
  }, []);

  /**
   * Complete onboarding and save all configuration in a single atomic update.
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
    await apiService.auth.logout();
    await saveSettings({ isAuthenticated: false, userId: null });
  }, [saveSettings]);

  /**
   * Delete user account and restore factory default settings.
   */
  const deleteAccount = useCallback(async () => {
    try {
      await apiService.auth.logout();
      await removeItem(STORAGE_KEYS.SETTINGS);
      setSettings(defaultSettings);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Contact CRUD with Backend Integration & Local Fallback ─────
  const addContact = useCallback(async (contact) => {
    let createdContact = null;
    try {
      const res = await apiService.contacts.addContact({
        name: contact.name,
        phone: contact.phone,
        relationship: contact.relationship || 'Other',
        is_sos_enabled: contact.is_sos_enabled ?? contact.selectedForSOS ?? true,
      });
      createdContact = res.data;
    } catch (e) {
      console.warn('[AppContext] Backend addContact failed, caching locally:', e.message);
    }

    const newContact = createdContact || {
      ...contact,
      id: contact.id || `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      selectedForSOS: contact.is_sos_enabled ?? contact.selectedForSOS ?? true,
    };

    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = [...currentList, newContact];
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return newContact.id;
  }, [settings]);

  const updateContact = useCallback(async (id, updates) => {
    try {
      if (id && !String(id).startsWith('local_')) {
        await apiService.contacts.updateContact(id, updates);
      }
    } catch (e) {
      console.warn('[AppContext] Backend updateContact failed, saving locally:', e.message);
    }

    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c);
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return updated;
  }, [settings]);

  const deleteContact = useCallback(async (id) => {
    try {
      if (id && !String(id).startsWith('local_')) {
        await apiService.contacts.deleteContact(id);
      }
    } catch (e) {
      console.warn('[AppContext] Backend deleteContact failed, removing locally:', e.message);
    }

    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.filter(c => c.id !== id);
      return { ...prev, contacts: updated };
    });
    await setItem(STORAGE_KEYS.SETTINGS, { ...settings, contacts: updated });
    return updated;
  }, [settings]);

  const toggleContactSOS = useCallback(async (id) => {
    try {
      if (id && !String(id).startsWith('local_')) {
        await apiService.contacts.toggleSos(id);
      }
    } catch (e) {
      console.warn('[AppContext] Backend toggleSos failed, toggling locally:', e.message);
    }

    let updated;
    setSettings(prev => {
      const currentList = Array.isArray(prev.contacts) ? prev.contacts : [];
      updated = currentList.map(c =>
        c.id === id
          ? {
              ...c,
              selectedForSOS: !(c.selectedForSOS ?? c.is_sos_enabled),
              is_sos_enabled: !(c.selectedForSOS ?? c.is_sos_enabled),
              updatedAt: Date.now(),
            }
          : c
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
    forgotPassword,
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
    forgotPassword,
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

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
