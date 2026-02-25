/**
 * SuccessIndicator — 체크마크 + 확장 링 애니메이션
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SuccessIndicatorProps {
  /** 카드 진입 애니메이션 완료 후 true로 변경 → 체크마크 시작 */
  trigger: boolean;
}

export const SuccessIndicator: React.FC<SuccessIndicatorProps> = ({ trigger }) => {
  const { wp } = useResponsive();
  const { colors: c } = useThemeColors();

  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!trigger) return;

    // Checkmark spring
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 100,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // Expanding ring
    Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1.5,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [trigger]);

  return (
    <View style={[styles.container, { width: wp(72), height: wp(72) }]}>
      {/* Expanding ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: wp(72),
            height: wp(72),
            borderRadius: wp(36),
            borderColor: c.success,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Checkmark circle */}
      <Animated.View
        style={[
          styles.checkCircle,
          {
            width: wp(64),
            height: wp(64),
            borderRadius: wp(32),
            backgroundColor: c.success,
            transform: [{ scale: checkScale }],
          },
        ]}
      >
        <Ionicons name="checkmark" size={32} color={c.textInverse} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  checkCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SuccessIndicator;
