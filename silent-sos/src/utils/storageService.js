/**
 * @file storageService.js
 * @description Safe, fault-tolerant AsyncStorage abstraction layer with in-memory caching,
 * TTL (Time-To-Live) support, and error boundary handling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory write-through cache to avoid redundant flash-memory reads
const memoryCache = new Map();

/**
 * Standardized storage keys across Silent SOS.
 */
export const STORAGE_KEYS = {
  SETTINGS: '@silent_sos_settings',
  CONTACTS: '@silent_sos_contacts',
  SUPPORT_CACHE_PREFIX: '@silent_sos_support_cache_',
  AI_DRAFTS_CACHE: '@silent_sos_ai_drafts',
  APP_METADATA: '@silent_sos_metadata',
};

/**
 * Default cache duration (24 hours in milliseconds)
 */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Retrieve and parse JSON item from storage.
 * @template T
 * @param {string} key
 * @param {T} fallback - Value to return if key not found or read fails
 * @param {boolean} useMemory - Whether to check in-memory cache first
 * @returns {Promise<T>}
 */
export const getItem = async (key, fallback = null, useMemory = true) => {
  try {
    if (useMemory && memoryCache.has(key)) {
      return memoryCache.get(key);
    }

    const raw = await AsyncStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    if (useMemory) {
      memoryCache.set(key, parsed);
    }
    return parsed;
  } catch (error) {
    console.warn(`[storageService] Failed to read key "${key}":`, error.message);
    return fallback;
  }
};

/**
 * Serialize and save JSON item to storage.
 * @param {string} key
 * @param {any} value
 * @param {boolean} useMemory - Whether to update in-memory cache
 * @returns {Promise<boolean>} Success indicator
 */
export const setItem = async (key, value, useMemory = true) => {
  try {
    if (useMemory) {
      memoryCache.set(key, value);
    }
    const raw = JSON.stringify(value);
    await AsyncStorage.setItem(key, raw);
    return true;
  } catch (error) {
    console.warn(`[storageService] Failed to write key "${key}":`, error.message);
    return false;
  }
};

/**
 * Remove an item from storage and in-memory cache.
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export const removeItem = async (key) => {
  try {
    memoryCache.delete(key);
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[storageService] Failed to delete key "${key}":`, error.message);
    return false;
  }
};

/**
 * Cache data with an expiration timestamp (TTL).
 * @param {string} key
 * @param {any} data
 * @param {number} [ttlMs=DEFAULT_TTL_MS]
 * @returns {Promise<boolean>}
 */
export const setCachedWithTTL = async (key, data, ttlMs = DEFAULT_TTL_MS) => {
  const envelope = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
  return setItem(key, envelope);
};

/**
 * Retrieve cached data if not expired.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {Promise<{ data: T, isExpired: boolean, timestamp: number | null }>}
 */
export const getCachedWithTTL = async (key, fallback = null) => {
  const envelope = await getItem(key, null);
  if (!envelope || typeof envelope !== 'object' || !envelope.expiresAt) {
    return { data: fallback, isExpired: true, timestamp: null };
  }

  const isExpired = Date.now() > envelope.expiresAt;
  return {
    data: envelope.data ?? fallback,
    isExpired,
    timestamp: envelope.timestamp || null,
  };
};

/**
 * Flush all in-memory cache entries.
 */
export const clearMemoryCache = () => {
  memoryCache.clear();
};
