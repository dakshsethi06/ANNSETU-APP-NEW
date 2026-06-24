// =============================================
// PriceCard — Displays a single price metric
// (Min or Max) with animated count-up effect
// =============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function PriceCard({ label, value, variant = 'min', unit = 'per quintal' }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  const accentColor = variant === 'min' ? COLORS.greenMid : COLORS.amber;
  const borderColor = variant === 'min' ? COLORS.greenLight : COLORS.amber;

  useEffect(() => {
    if (!value || value === 0) return;

    animatedValue.setValue(0);
    setDisplayValue(0);

    // Animate the card scaling in
    Animated.spring(animatedValue, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Count-up animation for the number
    const duration = 800;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(value * eased);
      setDisplayValue(current);

      if (progress >= 1) {
        clearInterval(interval);
        setDisplayValue(value);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

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
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderTopWidth: 4,
    borderTopColor: COLORS.greenLight,
    ...SHADOWS.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.greenDeep,
    marginBottom: SPACING.xs,
    lineHeight: 30,
  },
  unit: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
