/**
 * useResponsive — 모바일 반응형 스케일링 훅
 * iPhone SE(375px) 기준으로 비례 스케일링
 */

import { useWindowDimensions, PixelRatio } from 'react-native';
import { useMemo } from 'react';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.3;

function clampScale(value: number): number {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = Math.min(width, height) >= 600;
    const isLandscape = width > height;

    const scaleW = clampScale(width / BASE_WIDTH);
    const scaleH = clampScale(height / BASE_HEIGHT);

    /** 너비 비례 스케일링 */
    const wp = (size: number) => Math.round(size * scaleW);

    /** 높이 비례 스케일링 */
    const hp = (size: number) => Math.round(size * scaleH);

    /** 폰트 스케일링 (시스템 fontScale 반영, 상한 1.15x) */
    const fp = (size: number) =>
      Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scaleW, 1.15)));

    return { width, height, isTablet, isLandscape, wp, hp, fp, scaleW, scaleH };
  }, [width, height, fontScale]);
}
