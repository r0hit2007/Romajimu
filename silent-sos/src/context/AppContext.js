import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@silent_sos_settings';

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
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updates) => {
    try {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return true;
    } catch (e) {
      console.warn('Failed to save settings:', e);
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
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSettings(defaultSettings);
      return true;
    } catch {
      return false;
    }
  };

  const addContact = async (contact) => {
    const updated = [...settings.contacts, { ...contact, id: Date.now().toString() }];
    await saveSettings({ contacts: updated });
  };

  const updateContact = async (id, updates) => {
    const updated = settings.contacts.map(c => c.id === id ? { ...c, ...updates } : c);
    await saveSettings({ contacts: updated });
  };

  const deleteContact = async (id) => {
    const updated = settings.contacts.filter(c => c.id !== id);
    await saveSettings({ contacts: updated });
  };

  const toggleContactSOS = async (id) => {
    const updated = settings.contacts.map(c =>
      c.id === id ? { ...c, selectedForSOS: !c.selectedForSOS } : c
    );
    await saveSettings({ contacts: updated });
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
