/**
 * AvatarPlaceholder — 공통 아바타 컴포넌트
 *
 * avatarUrl이 있으면 Image, 없으면 이니셜 원형 View를 표시한다.
 * ProfileScreen, ProfileDetailScreen, HandshakeSuccess, TimelineScreen에서 사용.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface AvatarPlaceholderProps {
  avatarUrl?: string | null;
  name: string;
  size: number;
  fontSize?: number;
}

export const AvatarPlaceholder: React.FC<AvatarPlaceholderProps> = ({
  avatarUrl,
  name,
  size,
  fontSize,
}) => {
  const { colors: c } = useThemeColors();
  const borderRadiusVal = size / 2;
  const computedFontSize = fontSize ?? size * 0.4;
  const initial = name?.charAt(0).toUpperCase() || '?';

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: borderRadiusVal,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: borderRadiusVal,
          backgroundColor: c.accentLight,
        },
      ]}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize: computedFontSize,
            color: c.accent,
          },
        ]}
      >
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontWeight: typography.fontWeight.semibold,
  },
});

export default AvatarPlaceholder;
