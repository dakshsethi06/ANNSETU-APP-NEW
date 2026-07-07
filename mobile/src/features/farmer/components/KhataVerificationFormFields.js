import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export function KhataVerificationFormFields({
  lang,
  utrNumber,
  setUtrNumber,
  paymentDate,
  onOpenDatePicker
}) {
  return (
    <View>
      {/* UTR Input */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          {lang === 'en' ? 'UTR / Transaction Reference Number *' : 'यूटीआर / लेनदेन संदर्भ संख्या *'}
        </Text>
        <TextInput
          style={styles.formInput}
          placeholder={lang === 'en' ? 'Enter UTR/Transaction ID' : 'यूटीआर/लेनदेन आईडी दर्ज करें'}
          placeholderTextColor="#A1A1AA"
          value={utrNumber}
          onChangeText={setUtrNumber}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      {/* Date of Payment */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>
          {lang === 'en' ? 'Date of Payment *' : 'भुगतान की तिथि *'}
        </Text>
        <TouchableOpacity
          style={styles.dateSelectorTrigger}
          activeOpacity={0.8}
          onPress={onOpenDatePicker}
        >
          <Feather name="calendar" size={16} color="#2D6A4F" style={{ marginRight: 8 }} />
          <Text style={styles.dateSelectorText}>
            {paymentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          <Feather name="chevron-down" size={16} color="#71717A" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
