/**
 * @file aiService.js
 * @description Advanced AI Safety Service utilizing HuggingFace OpenAI-compatible REST API.
 * Features situational prompt engineering for covert distress messaging, automated retry
 * with exponential backoff, structured error classification, persistent multi-tier caching,
 * and comprehensive offline fallback databases.
 */

import Constants from 'expo-constants';
import { FALLBACK_RESOURCES } from '../constants/resources';
import { withRetry, withTimeout } from '../utils/retry';
import { getCachedWithTTL, setCachedWithTTL, STORAGE_KEYS } from '../utils/storageService';

// ─── Environment & Configuration ──────────────────────────────────────────

const HF_TOKEN =
  Constants.expoConfig?.extra?.HF_TOKEN ||
  process.env.HF_TOKEN ||
  'REPLACE_WITH_YOUR_HF_TOKEN';

const MODEL = 'google/gemma-4-31B-it:novita';
const BASE_URL = 'https://router.huggingface.co/v1';
const REQUEST_TIMEOUT_MS = 9000;
const CACHE_TTL_SUPPORT_MS = 48 * 60 * 60 * 1000; // 48 Hours

/**
 * Check if a valid non-placeholder HuggingFace token is configured.
 * @returns {boolean}
 */
export const isTokenConfigured = () => {
  return Boolean(
    HF_TOKEN &&
    HF_TOKEN !== 'REPLACE_WITH_YOUR_HF_TOKEN' &&
    HF_TOKEN.trim().length > 10
  );
};

// ─── Error Handling Classification ───────────────────────────────────────

export const AI_ERROR_TYPES = {
  NO_TOKEN: 'NO_TOKEN',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  RATE_LIMIT: 'RATE_LIMIT',
  MODEL_LOADING: 'MODEL_LOADING',
  TIMEOUT: 'TIMEOUT',
  API_ERROR: 'API_ERROR',
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
};

export class AIServiceError extends Error {
  /**
   * @param {string} type - Member of AI_ERROR_TYPES
   * @param {string} message - User-friendly error message
   * @param {number|null} [status=null] - HTTP status code
   * @param {boolean} [retryable=false] - Whether operation is retryable
   */
  constructor(type, message, status = null, retryable = false) {
    super(message);
    this.name = 'AIServiceError';
    this.type = type;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Curated Offline SOS Fallback Library ─────────────────────────────────

/**
 * High-quality, field-tested covert emergency messages for instant use
 * when the device is completely offline or the AI model is unreachable.
 */
export const OFFLINE_SOS_TEMPLATES = {
  casual_checkin: [
    'Hey, did you still need that recipe book from me? Please give me a quick call as soon as you see this.',
    'Hi! Just checking if we are still on for our call today? Please ring me back right away.',
    'Hey, quick question about that email you sent earlier. Can you call me back as soon as you have a second?',
  ],
  pick_me_up: [
    'Hey, my stomach started hurting really bad out of nowhere. Could you please call me and come pick me up?',
    'Hey, my ride fell through unexpectedly. Can you give me a ring right now so I know if you can swing by?',
    'Migraine is hitting hard suddenly. Can you call me and help me get home?',
  ],
  grocery_errand: [
    'Hey, forgot if we needed anything else from the store. Call me right away so I know before I leave.',
    'Quick check—did you find the receipt we needed for the return? Give me a call right now please.',
  ],
  work_excuse: [
    'Hi, just checking if you need me to cover that work shift today? Please call my phone right away.',
    'Hey, got a quick question on the project file. Please call me back as soon as possible.',
  ],
  codeword: [
    'Hey, did you find my blue notebook anywhere? Let me know as soon as you can.',
    'Remember that book recommendation we talked about? Let me know if you found the title.',
  ],
};

/**
 * Get an appropriate offline fallback SOS draft based on scenario.
 * @param {string} [scenario='casual_checkin']
 * @returns {string}
 */
export const getOfflineSOSFallback = (scenario = 'casual_checkin') => {
  const templates = OFFLINE_SOS_TEMPLATES[scenario] || OFFLINE_SOS_TEMPLATES.casual_checkin;
  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
};

// ─── Core HTTP & Completion Engine ───────────────────────────────────────

/**
 * Execute chat completion via HuggingFace OpenAI-compatible REST router
 * with timeout enforcement and structured error normalization.
 * @param {Array<{role: string, content: string}>} messages
 * @param {number} [maxTokens=300]
 * @param {number} [temperature=0.6]
 * @returns {Promise<string>}
 */
export const chatCompletion = async (messages, maxTokens = 300, temperature = 0.6) => {
  if (!isTokenConfigured()) {
    throw new AIServiceError(
      AI_ERROR_TYPES.NO_TOKEN,
      'HuggingFace API token not configured. Using offline verified mode.',
      null,
      false
    );
  }

  const makeRequest = async () => {
    let response;
    try {
      response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${HF_TOKEN}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
    } catch (networkErr) {
      throw new AIServiceError(
        AI_ERROR_TYPES.NETWORK_OFFLINE,
        'Cannot reach AI safety server. Please verify cellular or Wi-Fi connectivity.',
        null,
        true
      );
    }

    if (!response.ok) {
      const status = response.status;
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unknown response body';
      }

      if (status === 429) {
        throw new AIServiceError(
          AI_ERROR_TYPES.RATE_LIMIT,
          'AI safety server is temporarily busy (rate limit). Please retry momentarily.',
          429,
          true
        );
      }
      if (status === 503) {
        throw new AIServiceError(
          AI_ERROR_TYPES.MODEL_LOADING,
          'Gemma safety model is initializing on secure servers.',
          503,
          true
        );
      }
      throw new AIServiceError(
        AI_ERROR_TYPES.API_ERROR,
        `AI API error ${status}: ${errorBody.slice(0, 100)}`,
        status,
        status >= 500
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new AIServiceError(
        AI_ERROR_TYPES.MALFORMED_RESPONSE,
        'Received invalid response payload from AI server.',
        response.status,
        false
      );
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new AIServiceError(
        AI_ERROR_TYPES.MALFORMED_RESPONSE,
        'AI generated an empty response.',
        200,
        false
      );
    }

    return content;
  };

  // Wrap in exponential backoff retry for transient network and 503/429 statuses
  return withRetry(
    () => withTimeout(makeRequest(), REQUEST_TIMEOUT_MS, 'AI request timed out. Retrying…'),
    {
      maxRetries: 2,
      baseDelayMs: 900,
      shouldRetry: (err) => err?.retryable || err?.name === 'TimeoutError',
    }
  );
};

// ─── Sanitizer Utility ────────────────────────────────────────────────────

/**
 * Strip surrounding quotes, markdown block ticks, AI preambles, and enforce 160-char SMS limit.
 * @param {string} text
 * @returns {string} Cleaned message text
 */
export const sanitizeAIDraft = (text) => {
  if (!text) return '';
  let cleaned = text.trim();

  // Remove markdown code fences if model enclosed in ```
  cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

  // Strip leading meta commentary like "Here is your draft:" or "Refined message:"
  cleaned = cleaned.replace(/^(here is (your|a) (draft|message):|draft:|refined message:)\s*/i, '');

  // Strip leading and trailing quotes if enclosed
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('“') && cleaned.endsWith('”'))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove bracketed placeholders e.g. [Friend Name]
  cleaned = cleaned.replace(/\[.*?\]/g, '').trim();

  // Hard safety limit: SMS standard 160 characters
  if (cleaned.length > 160) {
    const cut = cleaned.slice(0, 157);
    const lastSpace = cut.lastIndexOf(' ');
    cleaned = (lastSpace > 120 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  return cleaned;
};

// ─── SOS Prompt Generation ───────────────────────────────────────────────

/**
 * Build tailored system prompt for discreet distress message generation.
 * @param {Object} options
 * @param {string} options.currentMessage
 * @param {boolean} options.includeLocation
 * @param {boolean} options.includeAudio
 * @param {string} [options.scenario='casual_checkin']
 * @param {string} [options.codeWord]
 * @returns {string} System prompt
 */
export const buildDiscreetPrompt = ({
  currentMessage,
  includeLocation,
  includeAudio,
  scenario = 'casual_checkin',
  codeWord = '',
}) => {
  const scenarioGuidance = {
    casual_checkin: 'Sound like an everyday conversational check-in asking the recipient to call back immediately.',
    pick_me_up: 'Pretend you have a sudden mild headache, sickness, or flat tire, asking recipient to come pick you up urgently.',
    grocery_errand: 'Pretend you are at a grocery store or errand asking a question, urging them to phone back right now.',
    work_excuse: 'Sound like a quick check about a work schedule or shift change needing an immediate phone response.',
    codeword: `Naturally integrate this discreet codeword: "${codeWord || 'blue notebook'}" into an ordinary sentence.`,
  }[scenario] || 'Sound natural and casual while conveying that the recipient should phone immediately.';

  return `You are an expert safety assistant helping someone in an unsafe situation craft an ultra-discreet distress message to their trusted emergency contact.

STRICT LIFE-SAFETY CONSTRAINTS:
1. Under 140 characters (MUST fit comfortably in a single standard SMS).
2. NEVER use suspicious words: "help", "danger", "emergency", "abuse", "police", "safe", "SOS", "threat", "scared".
3. SURFACE APPEARANCE: If someone looks over the user's shoulder, it must look like a totally mundane, innocent text.
4. HIDDEN SIGNAL: Must create a compelling, natural reason for the contact to CALL or COME OVER immediately.
5. STYLE: ${scenarioGuidance}
${currentMessage ? `6. Incorporate the intent of the user's current draft: "${currentMessage}"` : ''}
${includeLocation ? '7. Keep it brief as a live GPS map link will follow this text.' : ''}

OUTPUT INSTRUCTIONS:
- Return ONLY the exact message text.
- Do NOT include quotes, explanations, prefixes, or disclaimers.`;
};

/**
 * Draft a discreet emergency message using Gemma AI, with automated fallback
 * to the offline safety template library if offline or if an error occurs.
 * Returns full result object including metadata.
 * @param {Object} opts
 * @param {string} [opts.currentMessage]
 * @param {boolean} [opts.includeLocation=true]
 * @param {boolean} [opts.includeAudio=false]
 * @param {string} [opts.scenario='casual_checkin']
 * @param {string} [opts.codeWord]
 * @returns {Promise<{ message: string, isAIGenerated: boolean, error?: string }>}
 */
export const draftSOSMessageDetailed = async ({
  currentMessage = '',
  includeLocation = true,
  includeAudio = false,
  scenario = 'casual_checkin',
  codeWord = '',
} = {}) => {
  try {
    const prompt = buildDiscreetPrompt({
      currentMessage,
      includeLocation,
      includeAudio,
      scenario,
      codeWord,
    });

    const rawResponse = await chatCompletion([{ role: 'user', content: prompt }], 150, 0.65);
    const sanitized = sanitizeAIDraft(rawResponse);

    if (sanitized && sanitized.length > 10) {
      return { message: sanitized, isAIGenerated: true };
    }

    // Fallback if AI produced invalid response
    return {
      message: getOfflineSOSFallback(scenario),
      isAIGenerated: false,
    };
  } catch (err) {
    console.warn('[aiService] draftSOSMessage fallback activated:', err.message);
    return {
      message: getOfflineSOSFallback(scenario),
      isAIGenerated: false,
      error: err.message,
    };
  }
};

/**
 * Draft a discreet SOS help message (backward-compatible signature).
 * Returns the message string directly.
 * @param {Object} opts
 * @returns {Promise<string>}
 */
export const draftSOSMessage = async (opts = {}) => {
  const result = await draftSOSMessageDetailed(opts);
  return result?.message || getOfflineSOSFallback(opts?.scenario || 'casual_checkin');
};

// ─── Support Resources AI Engine ──────────────────────────────────────────

/**
 * Build region-specific prompt for crisis resource discovery.
 * @param {string} regionName
 * @returns {string} Prompt
 */
export const buildSupportResourcesPrompt = (regionName) => {
  return `List 6 verified, real domestic abuse and crisis support resources for ${regionName}.

For each resource provide:
- "name": string (Official organization name)
- "phone": string (Hotline phone number including area/country code)
- "sms": string (Optional SMS crisis text line number or empty string)
- "website": string (Official URL starting with https://)
- "description": string (1 concise sentence explaining who they help)
- "type": string (Must be strictly one of: "hotline", "shelter", "legal", "counseling", "online")
- "is24_7": boolean (true if 24/7 service)

Return ONLY a valid JSON array matching this format, with no markdown code fences, no commentary:
[{"name":"...","phone":"...","sms":"","website":"https://...","description":"...","type":"hotline","is24_7":true}]`;
};

/**
 * Fetch and categorize support resources for a region using Gemma AI.
 * Uses persistent multi-tier caching (Memory -> AsyncStorage -> AI -> Local Fallback).
 * @param {string} region - Country code e.g. "US", "UK", "IN", "CA", "AU"
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ resources: Array<Object>, isAIGenerated: boolean, fromCache: boolean }>}
 */
export const fetchSupportResources = async (region = 'US', forceRefresh = false) => {
  const createResult = (list, isAI, fromC) => {
    const arrayResult = [...list];
    arrayResult.resources = list;
    arrayResult.isAIGenerated = isAI;
    arrayResult.fromCache = fromC;
    return arrayResult;
  };

  // 1. Check persistent cache if not forcing refresh
  if (!forceRefresh) {
    const cached = await getCachedWithTTL(cacheKey, null);
    if (cached.data && Array.isArray(cached.data) && cached.data.length > 0 && !cached.isExpired) {
      return createResult(cached.data, true, true);
    }
  }

  const regionMap = {
    IN: 'India',
    UK: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    US: 'United States',
  };
  const regionName = regionMap[region] || 'United States';

  try {
    const prompt = buildSupportResourcesPrompt(regionName);
    const result = await chatCompletion([{ role: 'user', content: prompt }], 750, 0.3);

    // Extract JSON array robustly
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain a valid JSON array.');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Parsed AI resources is not a non-empty array.');
    }

    // Validate and sanitize individual items
    const sanitizedList = parsed.map(item => ({
      name: String(item.name || 'Verified Crisis Resource').trim(),
      phone: String(item.phone || '').trim(),
      sms: item.sms ? String(item.sms).trim() : '',
      website: item.website ? String(item.website).trim() : '',
      description: String(item.description || 'Support service for crisis intervention and safety planning.').trim(),
      type: ['hotline', 'shelter', 'legal', 'counseling', 'online'].includes(item.type) ? item.type : 'hotline',
      is24_7: Boolean(item.is24_7),
    })).filter(r => r.phone.length >= 3);

    if (sanitizedList.length > 0) {
      // Save to persistent storage with 48h TTL
      await setCachedWithTTL(cacheKey, sanitizedList, CACHE_TTL_SUPPORT_MS);
      return createResult(sanitizedList, true, false);
    }

    throw new Error('No valid resources remained after sanitization.');
  } catch (err) {
    console.warn(`[aiService] Failed to load AI support resources for ${region}:`, err.message);

    // Check if we have stale cached data before falling back to static
    const staleCached = await getCachedWithTTL(cacheKey, null);
    if (staleCached.data && Array.isArray(staleCached.data) && staleCached.data.length > 0) {
      return createResult(staleCached.data, true, true);
    }

    // Fall back to verified offline database
    const localFallback = FALLBACK_RESOURCES[region] || FALLBACK_RESOURCES.US;
    return createResult(localFallback, false, false);
  }
};
