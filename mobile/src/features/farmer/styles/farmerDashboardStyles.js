import { StyleSheet, Platform, StatusBar } from 'react-native';
import { COLORS, SHADOWS } from '../../../core/theme/theme';

export default StyleSheet.create({
  // =============================================
  // Full-screen Farmer Dashboard Layout
  // =============================================
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FAF7F0',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B4332',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },

  // =============================================
  // Profile Card (inside green gradient)
  // =============================================
  profileShieldIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  farmerLabel: {
    fontSize: 12,
    color: '#D4EBE0',
    fontWeight: '600',
  },
  farmerName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  farmerLocation: {
    fontSize: 13,
    color: '#A8D5BA',
    marginTop: 4,
    fontWeight: '500',
  },
  greenBellBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  greenBellDot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#E53E3E',
    borderWidth: 1.5,
    borderColor: '#1D4936',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryCardLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '700',
    textTransform: 'none',
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 6,
    textAlign: 'center',
  },
  summaryCardSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '600',
  },


  // =============================================
  // Quick Actions Grid
  // =============================================
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B4332',
    marginTop: 20,
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  quickActionCard: {
    width: '30.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 15,
  },


  // =============================================
  // Live Mandi Prices Section
  // =============================================
  mandiSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  mandiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mandiSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B4332',
  },
  mandiViewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D6A4F',
  },
  mandiPriceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  mandiPriceName: {
    fontSize: 14,
    fontWeight: '750',
    color: '#1A1A1A',
  },
  mandiPriceLoc: {
    fontSize: 11,
    color: '#7A7A7A',
    marginTop: 3,
    fontWeight: '500',
  },
  mandiPriceRight: {
    alignItems: 'flex-end',
  },
  mandiPriceVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B4332',
  },
  mandiPriceTrend: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  mandiLoading: {
    paddingVertical: 30,
  },

  // =============================================
  // Bottom Navigation Bar
  // =============================================
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E0CE',
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    marginTop: 4,
  },
  bottomNavLabelActive: {
    color: '#1B4332',
    fontWeight: '700',
  },
  headerCircleOverlay1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 0,
  },
  headerCircleOverlay2: {
    position: 'absolute',
    bottom: -60,
    right: 20,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    zIndex: 0,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  recentActivityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E5C2E',
  },
  recentActivityViewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5C2E',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  activityTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activitySubtitleText: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  activityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityStatCol: {
    flex: 1,
  },
  activityStatLabel: {
    fontSize: 11,
    color: '#71717A',
    marginBottom: 4,
  },
  activityStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  weatherContainer: {
    borderRadius: 16,
    marginTop: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  weatherGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  weatherInfo: {
    flex: 1,
    marginLeft: 12,
  },
  weatherLoc: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  weatherDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  weatherRight: {
    alignItems: 'flex-end',
  },
  weatherTemp: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 20,
  },
  weatherRange: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
  },
});

