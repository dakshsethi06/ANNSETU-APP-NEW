import { StyleSheet, Platform } from 'react-native';
import { COLORS, SHADOWS } from '../../../theme';

export default StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0CE',
    backgroundColor: '#FAF7F0',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
  },
  searchHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAE7D6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // ─── Search Overlay Inputs ───
  filterForm: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  filterFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B4332',
    marginBottom: 10,
  },
  filterInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  filterInputLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
  },
  filterInputValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  filterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  filterResetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#E8E0CE',
  },
  filterResetBtnText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '700',
  },
  filterApplyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#1B4332',
  },
  filterApplyBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ─── Mandi / Auction Toggle Tab ───
  toggleTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE7D6',
    borderRadius: 14,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E8E0CE',
  },
  toggleTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  toggleTabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
  toggleTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777777',
  },
  toggleTabLabelActive: {
    color: '#1B4332',
    fontWeight: '700',
  },

  // ─── Horizontal Tag Selector ───
  tagsScrollView: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagPillActive: {
    backgroundColor: '#1B4332',
    borderColor: '#1B4332',
  },
  tagText: {
    fontSize: 13,
    color: '#777777',
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ─── Date & Refresh Row ───
  dateRefreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  dateText: {
    fontSize: 13,
    color: '#777',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D6A4F',
  },

  // ─── Cards List Container ───
  cardsListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  mandiDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardMarket: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    fontWeight: '600',
  },
  cardUnit: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '850',
    color: '#1A1A1A',
  },
  cardTrendText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  gaugeContainer: {
    height: 4,
    backgroundColor: '#EAE7D6',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E0CE',
  },
  emptyText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#C53030',
    textAlign: 'center',
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#E53E3E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
