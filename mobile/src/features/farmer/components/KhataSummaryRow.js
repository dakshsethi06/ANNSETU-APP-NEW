import React from 'react';
import { View, Text } from 'react-native';
import styles from '../styles/khataTabStyles';

export function KhataSummaryRow({ lang, totalCharged, totalPaid }) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Total Charged' : 'कुल शुल्क'}</Text>
        <Text style={styles.summaryValue}>₹{totalCharged.toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{lang === 'en' ? 'Total Paid' : 'कुल भुगतान'}</Text>
        <Text style={[styles.summaryValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}
