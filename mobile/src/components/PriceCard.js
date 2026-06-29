import React from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';
import { usePriceAnimation } from '../hooks/usePriceAnimation';

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

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderTopWidth: 4, ...SHADOWS.md },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textLight, marginBottom: SPACING.sm },
  value: { fontSize: 24, fontWeight: '700', marginBottom: SPACING.xs, lineHeight: 30 },
  unit: { fontSize: 12, color: COLORS.textLight },
});
