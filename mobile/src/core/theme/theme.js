// =============================================
// Annsetu — Design Tokens
// Palette: warm wheat tones + deep forest green
// Matching the agrarian visual identity
// =============================================

import { Platform } from 'react-native';

export const COLORS = {
  wheat: '#F5EDD6',
  wheatDark: '#EAD9B0',
  greenDeep: '#1E4032',
  greenMid: '#2D6A4F',
  greenLight: '#52B788',
  amber: '#D4882D',
  amberLight: '#F0A830',
  textDark: '#1A1A1A',
  textMid: '#4A4A4A',
  textLight: '#7A7A7A',
  white: '#FFFFFF',
  errorRed: '#E05C5C',
  errorBg: '#FFF5F5',
  cardShadow: 'rgba(30, 64, 50, 0.12)',
};

export const FONTS = {
  regular: Platform.select({
    web: "'Noto Sans', 'Noto Sans Devanagari', sans-serif",
    default: 'NotoSansDevanagari-Regular',
  }),
  bold: Platform.select({
    web: "'Noto Sans', 'Noto Sans Devanagari', sans-serif",
    default: 'NotoSansDevanagari-Bold',
  }),
  mono: Platform.select({
    web: "'DM Mono', monospace",
    default: 'DMMono-Regular',
  }),
};


export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 50,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.greenDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: COLORS.greenDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 6,
  },
  lg: {
    shadowColor: COLORS.greenDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
};
