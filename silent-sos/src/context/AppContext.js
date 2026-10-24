import React, { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../utils/storageService';

const defaultSettings = {
  // Auth
  isAuthenticated: false,
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
    sms: 'idle',    // idle | pending | sent | failed
    location: 'idle',
    audio: 'idle',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await getItem(STORAGE_KEYS.SETTINGS, null);
      if (stored && typeof stored === 'object') {
        setSettings(prev => ({ ...prev, ...stored }));
      }
    } catch (e) {
      console.warn('[AppContext] Failed to load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updates) => {
    try {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      await setItem(STORAGE_KEYS.SETTINGS, updated);
      return true;
    } catch (e) {
      console.warn('[AppContext] Failed to save settings:', e);
      return false;
    }
  };

  const login = async (email, password, name = '') => {
    // Demo auth — in production, replace with real backend
    if (email && password.length >= 6) {
      await saveSettings({ isAuthenticated: true, userEmail: email, userName: name || email.split('@')[0] });
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials. Password must be at least 6 characters.' };
  };

  const signup = async (name, email, password) => {
    if (name && email && password.length >= 6) {
      await saveSettings({ isAuthenticated: true, userEmail: email, userName: name, onboardingComplete: false });
      return { success: true };
    }
    return { success: false, error: 'Please fill all fields. Password must be at least 6 characters.' };
  };

  const logout = async () => {
    await saveSettings({ isAuthenticated: false });
  };

  const deleteAccount = async () => {
    try {
      await removeItem(STORAGE_KEYS.SETTINGS);
      setSettings(defaultSettings);
      return true;
    } catch {
      return false;
    }
  };

  const addContact = async (contact) => {
    const newId = contact.id || `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentList = Array.isArray(settings.contacts) ? settings.contacts : [];
    const updated = [...currentList, { ...contact, id: newId, createdAt: contact.createdAt || Date.now() }];
    await saveSettings({ contacts: updated });
    return newId;
  };

  const updateContact = async (id, updates) => {
    const currentList = Array.isArray(settings.contacts) ? settings.contacts : [];
    const updated = currentList.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c);
    await saveSettings({ contacts: updated });
    return updated;
  };

  const deleteContact = async (id) => {
    const currentList = Array.isArray(settings.contacts) ? settings.contacts : [];
    const updated = currentList.filter(c => c.id !== id);
    await saveSettings({ contacts: updated });
    return updated;
  };

  const toggleContactSOS = async (id) => {
    const currentList = Array.isArray(settings.contacts) ? settings.contacts : [];
    const updated = currentList.map(c =>
      c.id === id ? { ...c, selectedForSOS: !c.selectedForSOS, updatedAt: Date.now() } : c
    );
    await saveSettings({ contacts: updated });
    return updated;
  };

  const resetSosStatus = () => {
    setSosStatus({ sms: 'idle', location: 'idle', audio: 'idle' });
    setSosActive(false);
  };

  return (
    <AppContext.Provider value={{
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
      logout,
      deleteAccount,
      addContact,
      updateContact,
      deleteContact,
      toggleContactSOS,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
