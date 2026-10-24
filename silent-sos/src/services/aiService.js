// AI Service — uses native fetch() instead of the openai npm package.
// The openai SDK relies on Node.js built-ins that Metro cannot bundle.
// The HuggingFace router is a standard OpenAI-compatible REST API,
// so a plain fetch() call is all we need.

// ⚠️  NEVER commit real tokens to source control.
// Set your token via expo-constants (see app.config.js) or replace inline for local dev.
import Constants from 'expo-constants';

const HF_TOKEN =
  Constants.expoConfig?.extra?.HF_TOKEN ||
  process.env.HF_TOKEN ||
  'REPLACE_WITH_YOUR_HF_TOKEN';

const MODEL = 'google/gemma-4-31B-it:novita';
const BASE_URL = 'https://router.huggingface.co/v1';

/**
 * Core chat completion via HuggingFace OpenAI-compatible router.
 * @param {Array} messages - Array of {role, content} objects
 * @param {number} maxTokens
 * @returns {Promise<string|null>}
 */
const chatCompletion = async (messages, maxTokens = 300) => {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_TOKEN}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HF API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? null;
};

/**
 * Draft a discreet SOS help message using Gemma.
 * @param {Object} opts
 * @param {string} opts.currentMessage
 * @param {boolean} opts.includeLocation
 * @param {boolean} opts.includeAudio
 * @returns {Promise<string|null>}
 */
export const draftSOSMessage = async ({ currentMessage, includeLocation, includeAudio }) => {
  try {
    const systemPrompt = `You are a compassionate safety assistant helping someone in a dangerous situation craft a discreet emergency message.
The message must:
- Be clear and informative for emergency contacts without being alarming if seen by an abuser
- Sound casual on the surface while signalling distress
- Be under 160 characters (SMS limit)
- NOT use the words "help", "emergency", "abuse", "danger" or "SOS"
- Feel natural and personal

Current draft: "${currentMessage}"
Additional context: ${includeLocation ? 'Location will be shared.' : ''} ${includeAudio ? 'Audio may be recorded.' : ''}

Provide ONLY the refined message text, no explanation.`;

    const result = await chatCompletion([{ role: 'user', content: systemPrompt }], 200);
    return result || null;
  } catch (err) {
    console.warn('AI draft failed:', err.message);
    return null;
  }
};

/**
 * Fetch and categorize support resources for a given region using Gemma.
 * @param {string} region - e.g., "US", "UK", "IN"
 * @returns {Promise<Array|null>}
 */
export const fetchSupportResources = async (region) => {
  const regionName =
    region === 'IN' ? 'India' :
    region === 'UK' ? 'United Kingdom' :
    region === 'CA' ? 'Canada' :
    region === 'AU' ? 'Australia' : 'United States';

  try {
    const prompt = `List 6 real, verified domestic abuse support resources for ${regionName}.

For each resource provide:
- name (organization name)
- phone (hotline number with country code)
- description (1 sentence, what they offer)
- type (one of: hotline, shelter, legal, counseling, online)

Return ONLY a valid JSON array with no markdown, no explanation. Example:
[{"name":"...","phone":"...","description":"...","type":"hotline"}]`;

    const result = await chatCompletion([{ role: 'user', content: prompt }], 600);
    if (!result) return null;

    // Extract the JSON array from the response
    const match = result.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return null;
  } catch (err) {
    console.warn('AI resources failed:', err.message);
    return null;
  }
};
