import { StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../../core/theme/theme';

export default StyleSheet.create({
  card: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderTopWidth: 4, ...SHADOWS.md },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: COLORS.textLight, marginBottom: SPACING.sm },
  value: { fontSize: 24, fontWeight: '700', marginBottom: SPACING.xs, lineHeight: 30 },
  unit: { fontSize: 12, color: COLORS.textLight },
});
