import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import styles from '../styles/khataTabStyles';

export function KhataBalanceCard({ lang, pendingRent, setDateModalVisible, handlePayPress }) {
  return (
    <LinearGradient
      colors={['#EF4444', '#DC2626']}
      style={styles.balanceCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.balanceLabel}>{lang === 'en' ? 'Net Balance' : 'शेष राशि'}</Text>
      <Text style={styles.balanceAmount}>₹{pendingRent.toLocaleString('en-IN')}</Text>
      <Text style={styles.balanceSub}>{lang === 'en' ? 'Dues Pending' : 'देनदारी बाकी'}</Text>

      <View style={styles.cardActionsRow}>
        <TouchableOpacity
          style={styles.btnStatement}
          activeOpacity={0.8}
          onPress={() => setDateModalVisible(true)}
        >
          <Feather name="download" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.btnStatementText}>{lang === 'en' ? 'Statement' : 'विवरण'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnPay}
          activeOpacity={0.9}
          onPress={() => handlePayPress()}
        >
          <Text style={styles.btnPayText}>{lang === 'en' ? 'Pay' : 'भुगतान करें'}</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
