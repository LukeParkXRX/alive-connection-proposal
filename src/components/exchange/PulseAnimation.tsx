/**
 * PulseAnimation - BLE 스캔 상태 펄스 애니메이션
 * 중앙에 파동 효과로 "스캔 중" 상태를 시각화
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface PulseAnimationProps {
  isActive: boolean;
  size?: number;
  color?: string;
}

const PulseAnimation: React.FC<PulseAnimationProps> = ({
  isActive,
  size = 200,
  color = '#00D4AA', // ALIVE Emerald
}) => {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) {
      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);
      return;
    }

    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = createPulse(pulse1, 0);
    const anim2 = createPulse(pulse2, 666);
    const anim3 = createPulse(pulse3, 1333);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isActive]);

  const createPulseStyle = (anim: Animated.Value) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: color,
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1.5],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { width: size * 1.6, height: size * 1.6 }]}>
      <Animated.View style={createPulseStyle(pulse1)} />
      <Animated.View style={createPulseStyle(pulse2)} />
      <Animated.View style={createPulseStyle(pulse3)} />
      {/* Center dot */}
      <View
        style={[
          styles.centerDot,
          {
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: size * 0.15,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    opacity: 0.9,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});

export default PulseAnimation;
