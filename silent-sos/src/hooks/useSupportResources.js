/**
 * @file useSupportResources.js
 * @description Hook managing support resource retrieval, multi-tier caching (Memory -> Storage -> AI -> Fallback),
 * category filtering, instant debounced search, and network status tracking.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { REGIONS, FALLBACK_RESOURCES, RESOURCE_TYPE_LABELS } from '../constants/resources';
import { fetchSupportResources } from '../services/aiService';
import { useDebounce } from './useDebounce';

export const useSupportResources = () => {
  const { settings, saveSettings } = useApp();

  const [selectedRegion, setSelectedRegion] = useState(settings?.selectedRegion || 'US');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 200);

  const [resources, setResources] = useState(
    FALLBACK_RESOURCES[selectedRegion] || FALLBACK_RESOURCES.US
  );
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load resources for a region with persistent cache and AI integration.
   */
  const loadResources = useCallback(async (regionCode, force = false) => {
    setError(null);
    if (force) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
      // Immediately serve static verified fallback to avoid empty flicker
      setResources(prev => prev && prev.length > 0 ? prev : (FALLBACK_RESOURCES[regionCode] || FALLBACK_RESOURCES.US));
    }

    try {
      const result = await fetchSupportResources(regionCode, force);
      if (result && Array.isArray(result.resources) && result.resources.length > 0) {
        setResources(result.resources);
        setIsAIGenerated(result.isAIGenerated);
        setFromCache(result.fromCache);
      }
    } catch (err) {
      console.warn(`[useSupportResources] Error loading for ${regionCode}:`, err.message);
      setError(err.message || 'Could not connect to online directory. Serving verified offline database.');
      // Fallback
      setResources(FALLBACK_RESOURCES[regionCode] || FALLBACK_RESOURCES.US);
      setIsAIGenerated(false);
      setFromCache(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Sync with region selection
  useEffect(() => {
    loadResources(selectedRegion, false);
    // Persist region preference in settings if changed
    if (settings && settings.selectedRegion !== selectedRegion) {
      saveSettings({ selectedRegion });
    }
  }, [selectedRegion]);

  const currentRegionInfo = useMemo(() => {
    return REGIONS.find(r => r.code === selectedRegion) || REGIONS[0];
  }, [selectedRegion]);

  // ─── Filtered and Searched Resources ───────────────────────
  const filteredResources = useMemo(() => {
    if (!resources || !Array.isArray(resources)) return [];

    let list = resources;

    // Filter by category
    if (selectedFilter !== 'all') {
      list = list.filter(r => r.type === selectedFilter);
    }

    // Search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter(r => {
        const nameMatch = r.name?.toLowerCase().includes(q);
        const descMatch = r.description?.toLowerCase().includes(q);
        const typeMatch = r.type?.toLowerCase().includes(q);
        const phoneMatch = r.phone?.toLowerCase().includes(q);
        const langMatch = r.languages?.some(l => l.toLowerCase().includes(q));
        return nameMatch || descMatch || typeMatch || phoneMatch || langMatch;
      });
    }

    return list;
  }, [resources, selectedFilter, debouncedSearch]);

  const availableTypes = useMemo(() => {
    const typesInList = new Set(resources?.map(r => r.type) || []);
    return ['all', ...Object.keys(RESOURCE_TYPE_LABELS).filter(t => t !== 'all' && typesInList.has(t))];
  }, [resources]);

  const refresh = useCallback(() => {
    return loadResources(selectedRegion, true);
  }, [loadResources, selectedRegion]);

  return {
    selectedRegion,
    setSelectedRegion,
    selectedFilter,
    setSelectedFilter,
    searchQuery,
    setSearchQuery,
    resources,
    filteredResources,
    availableTypes,
    currentRegionInfo,
    loading,
    isRefreshing,
    isAIGenerated,
    fromCache,
    error,
    refresh,
    retry: refresh,
  };
};

export default useSupportResources;
