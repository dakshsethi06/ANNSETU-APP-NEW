// =============================================
// ErrorCard — Displays error messages with
// a retry button, matching web error section
// =============================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme/theme';

export default function ErrorCard({ message, onRetry }) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message || 'An unexpected error occurred. Please try again.'}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.7}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.errorRed,
    ...SHADOWS.sm,
    marginBottom: SPACING.xl,
  },
  icon: {
    fontSize: 32,
    marginBottom: SPACING.md,
  },
  message: {
    fontSize: 15,
    color: COLORS.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    borderWidth: 2,
    borderColor: COLORS.greenDeep,
    borderRadius: RADIUS.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
  },
});
