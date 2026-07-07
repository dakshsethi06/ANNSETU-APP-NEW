import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export function KhataPartialPayCard({ lang, pendingRent, paymentAmount, setPaymentAmount, handlePayPress }) {
  return (
    <View style={styles.partialPayCard}>
      <View style={styles.partialPayLeft}>
        <Text style={styles.partialPayTitle}>
          {lang === 'en' ? 'Partial Payment' : 'आंशिक भुगतान'}
        </Text>
        <Text style={styles.partialPaySub}>
          {lang === 'en' ? 'Pay custom or full amount' : 'कस्टम या पूर्ण राशि का भुगतान करें'}
        </Text>
      </View>
      <View style={styles.partialPayRight}>
        <View style={styles.partialInputWrapper}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.partialTextInput}
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={(val) => setPaymentAmount(val.replace(/[^0-9.]/g, ''))}
            placeholder="0"
          />
        </View>
        <TouchableOpacity
          style={styles.btnPayPartial}
          activeOpacity={0.8}
          onPress={() => handlePayPress(paymentAmount)}
        >
          <Feather name="credit-card" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.btnPayPartialText}>
            {lang === 'en' 
              ? (parseFloat(paymentAmount) === pendingRent ? 'Pay All' : 'Pay') 
              : 'भुगतान'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
