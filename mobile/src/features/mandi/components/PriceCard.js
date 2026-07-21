import React from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../../core/theme/theme';
import { usePriceAnimation } from '../hooks/usePriceAnimation';

import styles from '../styles/priceCardStyles';

export default function PriceCard({ label, value, variant = 'min', unit = 'per quintal' }) {
  const { displayValue, scale, opacity } = usePriceAnimation(value);
  const accentColor = variant === 'min' ? COLORS.greenMid : COLORS.amber;
  const borderColor = variant === 'min' ? COLORS.greenLight : COLORS.amber;
  const formattedPrice = '₹' + displayValue.toLocaleString('en-IN');

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity, borderTopColor: borderColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{formattedPrice}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </Animated.View>
  );
}
