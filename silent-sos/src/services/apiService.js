import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Use local host or configurable backend URL
// On Android emulator, localhost is 10.0.2.2; on iOS simulator it is localhost
const DEFAULT_PORT = 5000;
const getDevHost = () => {
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}/api`;
  }
  return `http://localhost:${DEFAULT_PORT}/api`;
};

const BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  getDevHost();

const TOKEN_KEY = '@silent_sos_jwt_token';
const REFRESH_TOKEN_KEY = '@silent_sos_refresh_token';
const OFFLINE_QUEUE_KEY = '@silent_sos_offline_queue';

class ApiService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.isOnline = true;
    this.initToken();
  }

  async initToken() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_KEY);
      this.refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore
    }
  }

  async setTokens(accessToken, refreshToken) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    try {
      if (accessToken) {
        await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      } else {
        await AsyncStorage.removeItem(TOKEN_KEY);
      }

      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }

  async clearTokens() {
    this.token = null;
    this.refreshToken = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      // Set reasonable 8s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 token expiration and auto-refresh
      if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/refresh')) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return retryResponse.json();
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      this.isOnline = true;
      return data;
    } catch (err) {
      // Connection failure / offline
      this.isOnline = false;
      throw err;
    }
  }

  async tryRefreshToken() {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data?.accessToken) {
          await this.setTokens(json.data.accessToken, this.refreshToken);
          return true;
        }
      }
    } catch {
      // Refresh failed
    }
    return false;
  }

  // ── Auth APIs ─────────────────────────────────────────────
  auth = {
    signup: async ({ name, email, password }) => {
      const res = await this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      if (res.data?.accessToken) {
        await this.setTokens(res.data.accessToken, res.data.refreshToken);
      }
      return res.data;
    },

    login: async ({ email, password }) => {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.data?.accessToken) {
        await this.setTokens(res.data.accessToken, res.data.refreshToken);
      }
      return res.data;
    },

    forgotPassword: async ({ email, newPassword }) => {
      return this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, newPassword }),
      });
    },

    getMe: async () => {
      return this.request('/auth/me');
    },

    logout: async () => {
      await this.clearTokens();
    },
  };

  // ── Contacts APIs ─────────────────────────────────────────
  contacts = {
    getContacts: async () => {
      try {
        const res = await this.request('/contacts');
        return res.data || [];
      } catch (err) {
        // Fallback to cached contacts if offline
        const cached = await AsyncStorage.getItem('@silent_sos_contacts');
        return cached ? JSON.parse(cached) : [];
      }
    },

    addContact: async (contactData) => {
      return this.request('/contacts', {
        method: 'POST',
        body: JSON.stringify(contactData),
      });
    },

    updateContact: async (id, contactData) => {
      return this.request(`/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(contactData),
      });
    },

    deleteContact: async (id) => {
      return this.request(`/contacts/${id}`, {
        method: 'DELETE',
      });
    },

    toggleSos: async (id) => {
      return this.request(`/contacts/${id}/toggle-sos`, {
        method: 'PATCH',
      });
    },

    sync: async (contacts) => {
      return this.request('/contacts/sync', {
        method: 'POST',
        body: JSON.stringify({ contacts }),
      });
    },
  };

  // ── SOS Operations ────────────────────────────────────────
  sos = {
    getSettings: async () => {
      try {
        const res = await this.request('/sos/settings');
        return res.data;
      } catch {
        const cached = await AsyncStorage.getItem('@silent_sos_settings');
        return cached ? JSON.parse(cached) : null;
      }
    },

    updateSettings: async (settingsData) => {
      return this.request('/sos/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsData),
      });
    },

    recordAlert: async (alertData) => {
      try {
        const res = await this.request('/sos/alert', {
          method: 'POST',
          body: JSON.stringify(alertData),
        });
        return res.data;
      } catch (err) {
        // Enqueue offline alert for background sync when connection recovers
        await this.enqueueOfflineAlert(alertData);
        return { offlineQueued: true };
      }
    },

    getHistory: async () => {
      try {
        const res = await this.request('/sos/history');
        return res.data || [];
      } catch {
        const cached = await AsyncStorage.getItem('@silent_sos_history');
        return cached ? JSON.parse(cached) : [];
      }
    },

    syncOfflineQueue: async () => {
      try {
        const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
        const queue = raw ? JSON.parse(raw) : [];
        if (queue.length === 0) return [];

        const res = await this.request('/sos/sync-queue', {
          method: 'POST',
          body: JSON.stringify({ queue }),
        });

        // Clear queue on success
        await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
        return res.data || [];
      } catch {
        return [];
      }
    },
  };

  async enqueueOfflineAlert(alertData) {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push({
        ...alertData,
        timestamp: new Date().toISOString(),
      });
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Ignore storage errors
    }
  }

  // ── Support Resources ─────────────────────────────────────
  resources = {
    getByRegion: async (region = 'US') => {
      try {
        const res = await this.request(`/resources?region=${encodeURIComponent(region)}`);
        return res.data;
      } catch {
        return null;
      }
    },
  };

  // ── AI Service ────────────────────────────────────────────
  ai = {
    draftMessage: async (payload) => {
      try {
        const res = await this.request('/ai/draft-message', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return res.data?.message;
      } catch {
        return null;
      }
    },

    getSafetyTips: async (region = 'US') => {
      try {
        const res = await this.request(`/ai/safety-tips?region=${encodeURIComponent(region)}`);
        return res.data?.tips;
      } catch {
        return null;
      }
    },
  };
}

export default new ApiService();
