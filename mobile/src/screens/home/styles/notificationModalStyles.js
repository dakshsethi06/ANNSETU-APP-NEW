import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2DEC6', backgroundColor: '#F9F8F3' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8E5D3', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  backBtnText: { fontSize: 20, fontWeight: '800', color: '#1B4332' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1B4332' },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: '#E7E2D0', alignItems: 'center', shadowColor: '#1E4032', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  leftRow: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111111' },
  timeText: { fontSize: 12, color: '#777777', fontWeight: '500' },
  messageText: { fontSize: 13, color: '#555555', lineHeight: 18 },
});
