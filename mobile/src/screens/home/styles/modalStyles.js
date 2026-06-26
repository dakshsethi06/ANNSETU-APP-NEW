import { StyleSheet } from 'react-native';
import { COLORS } from '../../../theme';

export default StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 64, 50, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '50%',
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFE3',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.greenDeep,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EFE3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: COLORS.textMid,
    fontWeight: '700',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F3',
    borderRadius: 12,
    marginHorizontal: 24,
    marginVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EAD9B0',
  },
  modalSearchIcon: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  modalSearchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 10,
    color: COLORS.textDark,
    fontSize: 14,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textMid,
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3EFE3',
    marginHorizontal: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 14,
    textAlign: 'center',
  },
  stateItem: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stateItemSelected: {
    backgroundColor: '#F5EDD6',
  },
  activeStripe: {
    width: 4,
    height: 18,
    backgroundColor: COLORS.greenMid,
    borderRadius: 2,
    marginRight: 8,
  },
  stateItemText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  stateItemTextSelected: {
    color: COLORS.greenDeep,
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 16,
    color: COLORS.greenMid,
    fontWeight: 'bold',
  },
});
