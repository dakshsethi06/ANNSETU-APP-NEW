import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import AnnsetuLogo from '../../../core/components/AnnsetuLogo';
import styles from '../styles/khataTabStyles';

export function KhataHeader({ lang, setLang }) {
  return (
    <View style={styles.topHeader}>
      <View style={styles.topHeaderLeft}>
        <AnnsetuLogo size={38} backgroundColor="#1E5C2E" iconColor="#FFFFFF" style={{ marginRight: 10 }} />
        <Text style={styles.brandTitle}>Annsetu</Text>
      </View>
      <View style={styles.headerLangToggle}>
        <TouchableOpacity
          style={[styles.headerLangButton, lang === 'en' && styles.headerLangButtonActive]}
          onPress={() => setLang('en')}
        >
          <Text style={[styles.headerLangText, lang === 'en' && styles.headerLangTextActive]}>EN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerLangButton, lang === 'hi' && styles.headerLangButtonActive]}
          onPress={() => setLang('hi')}
        >
          <Text style={[styles.headerLangText, lang === 'hi' && styles.headerLangTextActive]}>हि</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
