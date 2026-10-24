/**
 * @file useAIDraft.js
 * @description Hook managing AI-assisted discreet SOS message generation,
 * scenario switching, and offline emergency templates.
 */

import { useState, useCallback } from 'react';
import { draftSOSMessage, getOfflineSOSFallback, OFFLINE_SOS_TEMPLATES } from '../services/aiService';

export const SOS_SCENARIOS = [
  { id: 'casual_checkin', label: 'Casual Check-in', icon: '💬', desc: 'Mundane everyday check-in urging a phone call back.' },
  { id: 'pick_me_up', label: 'Pick Me Up', icon: '🚗', desc: 'Pretending sickness or car trouble requiring immediate pickup.' },
  { id: 'grocery_errand', label: 'Store Errand', icon: '🛒', desc: 'Pretending to ask about groceries before leaving the store.' },
  { id: 'work_excuse', label: 'Work Call', icon: '💼', desc: 'Simulating a shift or work inquiry needing immediate response.' },
  { id: 'codeword', label: 'Codeword', icon: '🔒', desc: 'Seamlessly embeds your agreed secret phrase in an innocent sentence.' },
];

export const useAIDraft = () => {
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedMessage, setDraftedMessage] = useState(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [scenario, setScenario] = useState('casual_checkin');
  const [codeWord, setCodeWord] = useState('');
  const [error, setError] = useState(null);

  /**
   * Request an AI draft for given current settings.
   */
  const generateDraft = useCallback(async ({ currentMessage = '', includeLocation = true, includeAudio = false } = {}) => {
    setIsDrafting(true);
    setError(null);

    try {
      const result = await draftSOSMessage({
        currentMessage,
        includeLocation,
        includeAudio,
        scenario,
        codeWord,
      });

      setDraftedMessage(result.message);
      setIsAIGenerated(result.isAIGenerated);
      if (result.error) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const fallback = getOfflineSOSFallback(scenario);
      setDraftedMessage(fallback);
      setIsAIGenerated(false);
      setError(err.message || 'AI temporarily unavailable. Loaded offline template.');
      return { message: fallback, isAIGenerated: false, error: err.message };
    } finally {
      setIsDrafting(false);
    }
  }, [scenario, codeWord]);

  const loadOfflineTemplate = useCallback((selectedScenario = scenario) => {
    const text = getOfflineSOSFallback(selectedScenario);
    setDraftedMessage(text);
    setIsAIGenerated(false);
    setError(null);
    return text;
  }, [scenario]);

  const clearDraft = useCallback(() => {
    setDraftedMessage(null);
    setError(null);
  }, []);

  return {
    isDrafting,
    draftedMessage,
    isAIGenerated,
    scenario,
    setScenario,
    codeWord,
    setCodeWord,
    error,
    generateDraft,
    loadOfflineTemplate,
    clearDraft,
    scenarios: SOS_SCENARIOS,
    allOfflineTemplates: OFFLINE_SOS_TEMPLATES,
  };
};

export default useAIDraft;
