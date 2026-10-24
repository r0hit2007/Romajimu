import { OpenAI } from 'openai';

// ⚠️  NEVER commit real tokens to source control.
// Set HF_TOKEN in your .env file (see README → Environment Setup).
// For Expo: use expo-constants + app.config.js extra, or a secrets manager.
const HF_TOKEN = process.env.HF_TOKEN || 'REPLACE_WITH_YOUR_HF_TOKEN';
const MODEL = 'google/gemma-4-31B-it:novita';

let client = null;

const getClient = () => {
  if (!client) {
    client = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: HF_TOKEN,
      dangerouslyAllowBrowser: true,
    });
  }
  return client;
};

/**
 * Draft a discreet SOS help message using Gemma.
 * @param {Object} opts
 * @param {string} opts.currentMessage - The user's current SOS message
 * @param {boolean} opts.includeLocation
 * @param {boolean} opts.includeAudio
 * @returns {Promise<string>} - AI-drafted message
 */
export const draftSOSMessage = async ({ currentMessage, includeLocation, includeAudio }) => {
  try {
    const ai = getClient();
    const systemPrompt = `You are a compassionate safety assistant helping someone in a dangerous situation craft a discreet emergency message. 
The message must:
- Be clear and informative for emergency responders without being alarming if seen by an abuser
- Sound like a casual message on the surface
- Include a subtle signal that help is needed
- Be under 160 characters (SMS limit)
- NOT use the words "help", "emergency", "abuse", "danger" or "SOS"
- Feel natural and personal

Current draft: "${currentMessage}"
Additional context: ${includeLocation ? 'Location will be shared.' : ''} ${includeAudio ? 'Audio may be recorded.' : ''}

Provide ONLY the refined message text, no explanation.`;

    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: systemPrompt }],
    });

    return response.choices[0]?.message?.content?.trim() || currentMessage;
  } catch (err) {
    console.warn('AI draft failed:', err.message);
    return null;
  }
};

/**
 * Fetch and categorize support resources for a given region using Gemma.
 * @param {string} region - e.g., "US", "UK", "IN"
 * @returns {Promise<Array>} - Array of resource objects
 */
export const fetchSupportResources = async (region) => {
  try {
    const ai = getClient();
    const prompt = `List 6 real, verified domestic abuse support resources for ${region === 'IN' ? 'India' : region === 'UK' ? 'United Kingdom' : region === 'CA' ? 'Canada' : region === 'AU' ? 'Australia' : 'United States'}.

For each resource provide:
- name (organization name)
- phone (hotline number)
- description (1 sentence, what they offer)
- type (one of: hotline, shelter, legal, counseling, online)

Return ONLY a valid JSON array. Example format:
[{"name":"...","phone":"...","description":"...","type":"hotline"}]`;

    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim();
    // Extract JSON from the response
    const match = content?.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch (err) {
    console.warn('AI resources failed:', err.message);
    return null;
  }
};
