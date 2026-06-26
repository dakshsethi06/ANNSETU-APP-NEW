import { StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../../../theme';

export default StyleSheet.create({
  formGroup: {
    width: '100%',
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDeep,
  },
  formInput: {
    backgroundColor: '#FAF8F3',
    borderWidth: 1,
    borderColor: '#EAD9B0',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    color: COLORS.textDark,
    fontSize: 14,
  },
  outlinedActionBtn: {
    borderWidth: 1,
    borderColor: COLORS.greenMid,
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlinedActionBtnText: {
    color: COLORS.greenMid,
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
    backgroundColor: '#CCCCCC',
    overflow: 'hidden',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  errorBorder: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.errorRed,
    borderRadius: RADIUS.md,
  },
  errorText: {
    color: COLORS.errorRed,
    fontSize: 14,
  },
  listSelector: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: RADIUS.md,
    padding: 4,
  },
  listItem: {
    padding: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    borderRadius: RADIUS.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listItemActive: {
    backgroundColor: '#E8F5E9',
  },
  listItemText: {
    color: '#333',
  },
  listItemTextActive: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  badgeSelector: {
    flex: 1,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  badgeSelectorActive: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  badgeText: {
    fontWeight: '600',
    color: '#555',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
});
