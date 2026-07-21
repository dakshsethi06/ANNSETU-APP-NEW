import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { translateText, translateBatch } from '../localization/translationService';

/**
 * Custom React hook that automatically translates a given string to the active language (Hindi).
 * If the active language is English, it returns the original string immediately.
 * Shows original text while loading, so there is no layout shift or empty spaces.
 */
export function useTranslatedText(text) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const [translated, setTranslated] = useState(text);

  useEffect(() => {
    let isMounted = true;

    if (currentLang !== 'hi') {
      setTranslated(text);
      return;
    }

    // Translate to Hindi
    translateText(text, 'hi')
      .then((res) => {
        if (isMounted) {
          setTranslated(res);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslated(text); // Fallback to original
        }
      });

    return () => {
      isMounted = false;
    };
  }, [text, currentLang]);

  return translated;
}

/**
 * Custom hook to translate an array of texts.
 */
export function useTranslatedBatch(textsArray) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const [translatedArray, setTranslatedArray] = useState(textsArray);

  useEffect(() => {
    let isMounted = true;

    if (currentLang !== 'hi' || !Array.isArray(textsArray) || textsArray.length === 0) {
      setTranslatedArray(textsArray);
      return;
    }

    translateBatch(textsArray, 'hi')
      .then((res) => {
        if (isMounted) {
          setTranslatedArray(res);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTranslatedArray(textsArray);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(textsArray), currentLang]);

  return translatedArray;
}
