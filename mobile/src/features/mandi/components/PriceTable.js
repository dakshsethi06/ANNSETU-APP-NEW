// =============================================
// PriceTable — Scrollable commodity breakdown
// Replaces the HTML <table> from the web version
// =============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../../core/theme/theme';
import styles from '../styles/priceTableStyles';
function formatPrice(value) {
  if (!value && value !== 0) return '—';
  return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function TableRow({ row, isLast }) {
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <View style={styles.rowTop}>
        <Text style={styles.commodity} numberOfLines={1}>{row.commodity}</Text>
        <Text style={styles.state} numberOfLines={1}>{row.state}</Text>
      </View>
      <Text style={styles.market} numberOfLines={1}>📍 {row.market}</Text>
      <View style={styles.priceRow}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Min</Text>
          <Text style={[styles.priceValue, { color: COLORS.greenMid }]}>
            {formatPrice(row.minPrice)}
          </Text>
        </View>
        <View style={styles.priceDivider} />
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Max</Text>
          <Text style={[styles.priceValue, { color: COLORS.amber }]}>
            {formatPrice(row.maxPrice)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PriceTable({ records }) {
  if (!records || records.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Commodity Breakdown</Text>
      <View style={styles.tableCard}>
        {records.map((row, index) => (
          <TableRow
            key={`${row.commodity}-${row.market}-${index}`}
            row={row}
            isLast={index === records.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

