import { StyleSheet } from 'react-native';
import { FONTS } from '../../../core/theme/theme';

export default StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F4F4F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  viewAllBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E5C2E',
    fontFamily: FONTS.bold,
  },
  rowsContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  rowLast: {
    paddingBottom: 0,
  },
  rowLeft: {
    flex: 1,
  },
  cropName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.bold,
  },
  marketLabel: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 4,
    fontFamily: FONTS.regular,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#18181B',
    fontFamily: FONTS.mono,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    fontFamily: FONTS.mono,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#71717A',
    fontFamily: FONTS.regular,
  },
});
