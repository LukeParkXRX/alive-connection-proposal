/**
 * ALIVE Connection — 통합 디자인 토큰
 * 모바일(React Native)과 웹(Tailwind) 양쪽에서 import하여 사용
 */

export const UNIFIED_COLORS = {
  // Brand
  accent: '#0052CC',
  accentLight: '#E6F0FF',
  accentDark: '#003D99',

  // Backgrounds
  background: '#FFFFFF',
  backgroundAlt: '#F9F9F9',
  backgroundCard: '#FFFFFF',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Semantic
  success: '#1B7F37',
  successLight: '#E6F4EA',
  error: '#D93025',
  errorLight: '#FDECEA',
  warning: '#F9AB00',
  warningLight: '#FEF7E0',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',
} as const;

export const DARK_COLORS = {
  accent: '#4D8CE8',
  accentLight: '#1A2E4A',
  accentDark: '#6BA3F5',

  background: '#1A1A1A',
  backgroundAlt: '#2A2A2A',
  backgroundCard: '#333333',

  textPrimary: '#F0F0F0',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#1A1A1A',

  border: '#404040',
  borderLight: '#363636',
  divider: '#444444',

  success: '#4CAF50',
  successLight: '#1B3A1D',
  error: '#EF5350',
  errorLight: '#3A1B1B',
  warning: '#FFB74D',
  warningLight: '#3A2E1B',

  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorToken = typeof UNIFIED_COLORS;
