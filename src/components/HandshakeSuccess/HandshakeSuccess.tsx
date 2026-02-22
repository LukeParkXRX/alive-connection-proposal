/**
 * HandshakeSuccess - The Core Connection Experience
 *
 * This is THE moment - when two people connect via NFC.
 * Design philosophy: Minimal, elegant, instant feedback.
 * "The connection should feel magical but not flashy."
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import type { Connection, ProfileCard, LocationData } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface HandshakeSuccessProps {
  profile: ProfileCard;
  location?: LocationData;
  timestamp: string;
  onDismiss: () => void;
  onAddMemo?: () => void;
  onViewProfile?: () => void;
}

export const HandshakeSuccess: React.FC<HandshakeSuccessProps> = ({
  profile,
  location,
  timestamp,
  onDismiss,
  onAddMemo,
  onViewProfile,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { wp } = useResponsive();
  const { colors: c } = useThemeColors();

  // Animation values
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(50)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.parallel([
      // Background fade in
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Card slide up
      Animated.spring(slideUp, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After card appears, show checkmark with ring effect
      Animated.sequence([
        Animated.spring(checkScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Expanding ring animation
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

      // Subtle haptic on checkmark appear
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
  }, []);

  const formattedTime = format(new Date(timestamp), 'h:mm a');
  const formattedDate = format(new Date(timestamp), 'MMM d, yyyy');

  const locationString = location
    ? [location.placeName, location.city, location.country]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>
      {/* Background overlay */}
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="닫기"
      />

      {/* Main Card */}
      <Animated.View
        style={[
          styles.card,
          {
            width: screenWidth - spacing['2xl'] * 2,
            backgroundColor: c.background,
            transform: [{ translateY: slideUp }],
          },
        ]}
      >
        {/* Success Indicator */}
        <View style={[styles.successIndicator, { width: wp(72), height: wp(72) }]}>
          {/* Expanding ring effect */}
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

          {/* Checkmark */}
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

        {/* Title */}
        <Text style={[styles.title, { color: c.textPrimary }]}>Connected</Text>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={[
            styles.avatar,
            {
              width: wp(80),
              height: wp(80),
              borderRadius: wp(40),
              backgroundColor: c.accentLight,
            }
          ]}>
            {profile.avatarUrl ? (
              <Animated.Image
                source={{ uri: profile.avatarUrl }}
                style={[
                  styles.avatarImage,
                  {
                    width: wp(80),
                    height: wp(80),
                    borderRadius: wp(40),
                  }
                ]}
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: c.accent }]}>
                {profile.displayName?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>

          {/* Name & Title */}
          <Text style={[styles.name, { color: c.textPrimary }]}>{profile.displayName}</Text>
          {(profile.displayTitle || profile.displayCompany) && (
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {[profile.displayTitle, profile.displayCompany]
                .filter(Boolean)
                .join(' at ')}
            </Text>
          )}
        </View>

        {/* Context Tag */}
        <View style={styles.contextSection}>
          <View style={[styles.contextTag, { backgroundColor: c.backgroundAlt }]}>
            <Ionicons
              name="time-outline"
              size={14}
              color={c.textSecondary}
            />
            <Text style={[styles.contextText, { color: c.textSecondary }]}>
              {formattedDate} at {formattedTime}
            </Text>
          </View>

          {locationString && (
            <View style={[styles.contextTag, { backgroundColor: c.backgroundAlt }]}>
              <Ionicons
                name="location-outline"
                size={14}
                color={c.textSecondary}
              />
              <Text style={[styles.contextText, { color: c.textSecondary }]}>{locationString}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.secondaryButton, { backgroundColor: c.accentLight }]}
            onPress={onAddMemo}
            accessibilityRole="button"
            accessibilityLabel="메모 추가"
          >
            <Ionicons name="mic-outline" size={20} color={c.accent} />
            <Text style={[styles.secondaryButtonText, { color: c.accent }]}>Add Memo</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: c.accent }]}
            onPress={onViewProfile}
            accessibilityRole="button"
            accessibilityLabel="프로필 보기"
          >
            <Text style={[styles.primaryButtonText, { color: c.textInverse }]}>View Profile</Text>
            <Ionicons name="arrow-forward" size={18} color={c.textInverse} />
          </Pressable>
        </View>

        {/* Dismiss hint */}
        <Pressable
          style={styles.dismissHint}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        >
          <Text style={[styles.dismissText, { color: c.textTertiary }]}>Tap to dismiss</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },

  card: {
    width: Dimensions.get('window').width - spacing['2xl'] * 2,
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: borderRadius['2xl'],
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.lg,
  },

  // Success indicator
  successIndicator: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.success,
  },

  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Title
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },

  // Profile section
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },

  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  avatarInitial: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },

  name: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Context tags
  contextSection: {
    width: '100%',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },

  contextTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  contextText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
  },

  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
  },

  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  secondaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },

  // Dismiss
  dismissHint: {
    paddingVertical: spacing.sm,
  },

  dismissText: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },
});

export default HandshakeSuccess;
