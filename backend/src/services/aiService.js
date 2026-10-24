const env = require('../config/env');

const HF_ROUTER_URL = 'https://router.huggingface.co/v1';
const MODEL = 'google/gemma-4-31B-it:novita';

const DEFAULT_OFFLINE_TEMPLATES = [
  'Hey, can you call me when you get this? Need to check something with you urgently.',
  'Could you pick up groceries for me and come by my place as soon as you can?',
  'Left something important at your place, can you drop by now? Need your help.',
  'Please check the location I just sent you. Can you meet me there right away?',
];

class AIService {
  async chatCompletion(messages, maxTokens = 250) {
    if (!env.HF_TOKEN) {
      return null;
    }

    try {
      const response = await fetch(`${HF_ROUTER_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.HF_TOKEN}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HF API error ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.warn('Backend AI completion failed:', err.message);
      return null;
    }
  }

  async draftSosMessage({ currentMessage = '', includeLocation = true, scenario = 'general' }) {
    const systemPrompt = `You are a sensitive emergency safety assistant.
Your task is to craft a discreet, natural SOS message under 160 characters.
The message must:
- NOT use words like "help", "emergency", "danger", "police", "abuse", "sos".
- Sound natural and plausible if intercepted.
- Context scenario: ${scenario}.
- Current user note: "${currentMessage}".
- Location is ${includeLocation ? 'included via link' : 'not included'}.
Output ONLY the final SMS text, nothing else.`;

    const aiResult = await this.chatCompletion([
      { role: 'user', content: systemPrompt },
    ]);

    if (aiResult && aiResult.length <= 160) {
      return aiResult;
    }

    // Return deterministic safe template
    return DEFAULT_OFFLINE_TEMPLATES[0];
  }

  async generateSafetyTips(region = 'US') {
    const prompt = `Provide 4 brief, actionable safety planning tips for someone dealing with a dangerous living situation in ${region}.
Keep each tip under 2 sentences. Return valid JSON array of strings: ["tip 1", "tip 2", "tip 3", "tip 4"].`;

    const result = await this.chatCompletion([
      { role: 'user', content: prompt },
    ]);

    if (result) {
      try {
        const match = result.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
      } catch {
        // Fallback
      }
    }

    return [
      'Keep a hidden, charged backup phone with emergency contacts saved.',
      'Establish a harmless-sounding code word with your trusted contacts.',
      'Memorize at least two emergency numbers in case your device is taken.',
      'Clear your browser history and use calculator decoy mode when browsing resources.',
    ];
  }
}

module.exports = new AIService();
