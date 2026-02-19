/**
 * ALIVE Connection Design System
 * Style: Anthropic Research - Clean, spacious, high readability
 */

export const colors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundAlt: '#F9F9F9',
  backgroundCard: '#FFFFFF',

  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Accent - Deep Blue (Trust & Professional)
  accent: '#0052CC',
  accentLight: '#E6F0FF',
  accentDark: '#003D99',

  // Alternative Accent - Forest Green (Trust)
  success: '#1B7F37',
  successLight: '#E6F4EA',

  // Semantic
  error: '#D93025',
  errorLight: '#FDECEA',
  warning: '#F9AB00',
  warningLight: '#FEF7E0',

  // Borders & Dividers
  border: '#E5E5E5',
  borderLight: '#F0F0F0',
  divider: '#EEEEEE',

  // Shadows
  shadow: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',
} as const;

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const animation = {
  // Prioritize instant feedback over flashy animations
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
  },
  easing: {
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
};

export default theme;
