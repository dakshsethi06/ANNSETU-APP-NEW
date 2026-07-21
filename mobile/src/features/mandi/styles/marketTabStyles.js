import { StyleSheet, Platform } from 'react-native';
import { FONTS } from '../../../core/theme/theme';

export default StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F3EE',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F3EE',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1E5C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  searchIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(30, 92, 46, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E2D9',
    width: '100%',
  },
  listHeader: {
    paddingTop: 16,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E2D9',
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
    fontFamily: FONTS.bold,
  },
  subTabTextActive: {
    color: '#1E5C2E',
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E2D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: '#1E5C2E',
    borderColor: '#1E5C2E',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subHeaderText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 104 : 84,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E2D9',
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardLeftInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '750',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  mandiLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mandiLocationText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
  unitText: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  cardRightPrices: {
    alignItems: 'flex-end',
  },
  priceVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F5F3EE',
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    color: '#71717A',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});
