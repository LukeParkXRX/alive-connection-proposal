/**
 * useThemeColors — 모바일 다크모드 테마 훅
 * 시스템 설정(라이트/다크)에 따라 적절한 색상 반환
 */

import { useColorScheme } from 'react-native';
import { useMemo } from 'react';
import { colors } from '@/constants/theme';
import { DARK_COLORS } from '../../shared/design-tokens';

export function useThemeColors() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const themeColors = useMemo(() => {
    if (!isDark) return colors;

    return {
      ...colors,
      // 배경
      background: DARK_COLORS.background,
      backgroundAlt: DARK_COLORS.backgroundAlt,
      backgroundCard: DARK_COLORS.backgroundCard,
      // 텍스트
      textPrimary: DARK_COLORS.textPrimary,
      textSecondary: DARK_COLORS.textSecondary,
      textTertiary: DARK_COLORS.textTertiary,
      textInverse: DARK_COLORS.textInverse,
      // 브랜드
      accent: DARK_COLORS.accent,
      accentLight: DARK_COLORS.accentLight,
      accentDark: DARK_COLORS.accentDark,
      // 테두리
      border: DARK_COLORS.border,
      borderLight: DARK_COLORS.borderLight,
      divider: DARK_COLORS.divider,
      // 시맨틱
      success: DARK_COLORS.success,
      successLight: DARK_COLORS.successLight,
      error: DARK_COLORS.error,
      errorLight: DARK_COLORS.errorLight,
      warning: DARK_COLORS.warning,
      warningLight: DARK_COLORS.warningLight,
      // 그림자
      shadow: DARK_COLORS.shadow,
      shadowDark: DARK_COLORS.shadowDark,
    };
  }, [isDark]);

  return { colors: themeColors, isDark };
}
