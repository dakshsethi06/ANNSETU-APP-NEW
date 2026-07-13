import AsyncStorage from '@react-native-async-storage/async-storage';
import { AZURE_TRANSLATOR_KEY, AZURE_TRANSLATOR_REGION } from '../network/config';

const CACHE_PREFIX = 'tr:en:hi:';
const AZURE_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=hi';

/**
 * Translates a single text from English to Hindi using Azure Translator.
 * Uses local AsyncStorage cache first to avoid API requests.
 */
export async function translateText(text, targetLang = 'hi') {
  if (!text || typeof text !== 'string') return text;
  const cleanText = text.trim();
  if (!cleanText) return text;

  // We only translate from English to Hindi right now
  if (targetLang !== 'hi') {
    return text;
  }

  // Check if text has any devanagari/hindi characters (already translated)
  // Devanagari range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(cleanText)) {
    return text;
  }

  const cacheKey = `${CACHE_PREFIX}${encodeURIComponent(cleanText)}`;
  try {
    const cachedValue = await AsyncStorage.getItem(cacheKey);
    if (cachedValue !== null) {
      return cachedValue;
    }
  } catch (err) {
    console.warn('AsyncStorage get translation error:', err);
  }

  // Not in cache, call API
  if (!AZURE_TRANSLATOR_KEY) {
    console.warn('AZURE_TRANSLATOR_KEY is missing');
    return text;
  }

  try {
    const response = await fetch(AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION || 'centralindia',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ Text: cleanText }]),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Translator API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const translatedText = data?.[0]?.translations?.[0]?.text;

    if (translatedText) {
      try {
        await AsyncStorage.setItem(cacheKey, translatedText);
      } catch (err) {
        console.warn('AsyncStorage set translation error:', err);
      }
      return translatedText;
    }
  } catch (err) {
    console.warn(`Translation failed for text "${cleanText}":`, err.message);
  }

  return text;
}

/**
 * Translates a batch of texts from English to Hindi.
 * Checks cache first, batches API requests for cache misses.
 */
export async function translateBatch(texts, targetLang = 'hi') {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  if (targetLang !== 'hi') return texts;

  const results = [...texts];
  const misses = []; // Array of { index, cleanText }

  // Check cache for each
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || typeof text !== 'string') continue;
    const cleanText = text.trim();
    if (!cleanText || /[\u0900-\u097F]/.test(cleanText)) continue;

    const cacheKey = `${CACHE_PREFIX}${encodeURIComponent(cleanText)}`;
    try {
      const cachedValue = await AsyncStorage.getItem(cacheKey);
      if (cachedValue !== null) {
        results[i] = cachedValue;
      } else {
        misses.push({ index: i, cleanText });
      }
    } catch (err) {
      console.warn('AsyncStorage error in batch translation:', err);
      misses.push({ index: i, cleanText });
    }
  }

  if (misses.length === 0) {
    return results;
  }

  // Call API for misses
  if (!AZURE_TRANSLATOR_KEY) {
    return results;
  }

  try {
    const requestBody = misses.map(m => ({ Text: m.cleanText }));
    const response = await fetch(AZURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
        'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION || 'centralindia',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Translator API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    for (let j = 0; j < data.length; j++) {
      const translatedText = data[j]?.translations?.[0]?.text;
      if (translatedText) {
        const missInfo = misses[j];
        results[missInfo.index] = translatedText;

        const cacheKey = `${CACHE_PREFIX}${encodeURIComponent(missInfo.cleanText)}`;
        try {
          await AsyncStorage.setItem(cacheKey, translatedText);
        } catch (err) {
          // Ignore cache save issues
        }
      }
    }
  } catch (err) {
    console.warn('Batch translation API call failed:', err.message);
  }

  return results;
}

/**
 * Clears all translations cached in AsyncStorage.
 */
export async function clearTranslationCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const translationKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (translationKeys.length > 0) {
      await AsyncStorage.multiRemove(translationKeys);
      console.log(`Cleared ${translationKeys.length} cached translations`);
    }
  } catch (err) {
    console.warn('Failed to clear translation cache:', err);
  }
}
