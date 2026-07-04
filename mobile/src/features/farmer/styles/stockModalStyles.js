import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E8E0CE', shadowColor: '#1E4032', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  cardSubtitle: { fontSize: 11, color: '#7A7A7A', marginTop: 2, fontWeight: '500' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  metaGrid: { flexDirection: 'row', backgroundColor: '#FAF8F3', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#F0EBE0', justifyContent: 'space-between' },
  metaItem: { flex: 1, alignItems: 'center' },
  metaDivider: { width: 1, backgroundColor: '#EAD9B0', marginVertical: 4 },
  metaLabel: { fontSize: 9, fontWeight: '700', color: '#7A7A7A', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '700', color: '#1E4032', marginTop: 2 },
});
