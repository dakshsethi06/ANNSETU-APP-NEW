import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';

const LANGUAGE_KEY = 'user-language';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      // 1. Check saved language preference first
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }

      // 2. Otherwise detect device default language
      const locales = Localization.getLocales();
      const systemLanguage = locales[0]?.languageCode || 'en';

      // Only default to en or hi, default to 'en' if system language is something else
      const defaultLanguage = (systemLanguage === 'hi' || systemLanguage === 'en') ? systemLanguage : 'en';
      callback(defaultLanguage);
    } catch (error) {
      console.warn('Error detecting language preference:', error);
      callback('en');
    }
  },
  init: () => { },
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.warn('Error caching user language preference:', error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    fallbackLng: 'en',
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    interpolation: {
      escapeValue: false, // React protects from XSS
    },
    react: {
      useSuspense: false, // Avoid rendering issues in React Native
    }
  });

export default i18n;
