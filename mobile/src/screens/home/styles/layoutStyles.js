import { StyleSheet, StatusBar } from 'react-native';
import { COLORS, SHADOWS } from '../../../theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F0',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 64,
    paddingBottom: 26,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 13,
    color: '#A8D5BA',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerAccent: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4882D',
    marginTop: 10,
    opacity: 0.8,
  },
  tabOuterContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 4,
    width: '92%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#E8E0CE',
    ...SHADOWS.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 26,
    overflow: 'hidden',
    position: 'relative',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    zIndex: 2,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#E8E0CE',
    backgroundColor: '#FAF7F0',
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});
