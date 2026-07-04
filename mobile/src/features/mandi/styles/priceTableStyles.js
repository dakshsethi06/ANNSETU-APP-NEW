import { StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../../../core/theme/theme';

export default StyleSheet.create({
  container: { marginBottom: SPACING.xl },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.greenDeep, marginBottom: SPACING.md },
  tableCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOWS.sm },
  row: { padding: SPACING.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.wheatDark },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  commodity: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, flex: 1 },
  state: { fontSize: 12, fontWeight: '500', color: COLORS.textLight, marginLeft: SPACING.sm, backgroundColor: COLORS.wheat, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm, overflow: 'hidden' },
  market: { fontSize: 13, color: COLORS.textMid, marginBottom: SPACING.sm },
  priceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F7F0', borderRadius: RADIUS.sm, padding: SPACING.sm },
  priceItem: { flex: 1, alignItems: 'center' },
  priceDivider: { width: 1, height: 28, backgroundColor: COLORS.wheatDark },
  priceLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textLight, marginBottom: 2 },
  priceValue: { fontSize: 16, fontWeight: '700' },
});
