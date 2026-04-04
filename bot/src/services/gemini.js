const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
let model;

function initGemini() {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  return model;
}

function getModel() {
  if (!model) {
    initGemini();
  }
  return model;
}

/**
 * Normalize a crop name to its standardized Malaysian agricultural name.
 * Handles common misspellings, multilingual input, and colloquial names.
 *
 * @param {string} rawInput - Raw crop name from user input
 * @param {string} language - User's language preference (ms, en, zh)
 * @returns {Promise<string>} Standardized crop name
 */
async function normalizeCropName(rawInput, language = 'ms') {
  const prompt = `You are a Malaysian agricultural crop name standardizer.

Given the raw crop name input: "${rawInput}"

Return ONLY the standardized Malaysian crop name in Bahasa Melayu. Follow these rules:
1. Use the standard Bahasa Melayu name used in Malaysian agriculture
2. Capitalize the first letter
3. Handle common misspellings (e.g., "kangkong" → "Kangkung", "bayam" → "Bayam")
4. Handle English names (e.g., "spinach" → "Bayam", "chili" → "Cili")
5. Handle Chinese names (e.g., "空心菜" → "Kangkung", "辣椒" → "Cili")
6. Handle colloquial and informal names
7. If you cannot identify the crop, return the input with first letter capitalized

Return ONLY the standardized name, nothing else. No quotes, no explanation.`;

  try {
    const result = await getModel().generateContent(prompt);
    const response = result.response.text().trim();
    // Clean up any surrounding quotes or extra whitespace
    return response.replace(/^["']|["']$/g, '').trim();
  } catch (error) {
    console.error('Gemini normalizeCropName error:', error.message);
    // Fallback: capitalize first letter of each word
    return rawInput
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
}

/**
 * Detect the language of a text message.
 *
 * @param {string} text - Text to analyze
 * @returns {Promise<string>} Language code: "ms", "en", or "zh"
 */
async function detectLanguage(text) {
  const prompt = `Detect the language of this text and return ONLY one of these codes:
- "ms" for Bahasa Melayu / Malay
- "en" for English
- "zh" for Chinese (Simplified or Traditional)

Text: "${text}"

Return ONLY the language code, nothing else.`;

  try {
    const result = await getModel().generateContent(prompt);
    const response = result.response.text().trim().toLowerCase().replace(/["']/g, '');

    if (['ms', 'en', 'zh'].includes(response)) {
      return response;
    }
    // Default to Malay if detection is inconclusive
    return 'ms';
  } catch (error) {
    console.error('Gemini detectLanguage error:', error.message);
    return 'ms';
  }
}

module.exports = {
  initGemini,
  normalizeCropName,
  detectLanguage,
};
