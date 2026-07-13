import React from 'react';
import { Text } from 'react-native';
import { useTranslatedText } from '../hooks/useTranslatedText';

/**
 * Drop-in wrapper component for React Native Text.
 * Auto-translates its text content to the current language (e.g. Hindi) when active.
 */
export default function TranslatedText({ children, style, ...props }) {
  // If children is a string, translate it. Otherwise render it normally.
  const isString = typeof children === 'string';
  const textToTranslate = isString ? children : '';
  const translated = useTranslatedText(textToTranslate);

  return (
    <Text style={style} {...props}>
      {isString ? translated : children}
    </Text>
  );
}
