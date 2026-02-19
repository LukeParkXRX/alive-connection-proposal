/**
 * HomeScreen - NFC Handshake Ready State
 *
 * The main screen where users wait for NFC connections.
 * Shows the "ready to connect" state and recent activity.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useProfileStore } from '@/store/useProfileStore';
import { useConnectionStore } from '@/store/useConnectionStore';
import { useGraphStore } from '@/store/useGraphStore';
import { useNfcHandshake } from '@/hooks/useNfcHandshake';
import { HandshakeSuccess } from '@/components/HandshakeSuccess';
import type { NfcHandshakeResult, Connection, UserProfile } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

export const HomeScreen: React.FC = () => {
  const { profile, activeCard, currentMode, setCurrentMode } = useProfileStore();
  const { connections, addConnection } = useConnectionStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [lastConnection, setLastConnection] = useState<Connection | null>(null);

  const { wp, fp, isTablet } = useResponsive();
  const { colors: c, isDark } = useThemeColors();

  // NFC Handler
  const handleHandshakeComplete = useCallback(
    (result: NfcHandshakeResult) => {
      if (result.success && result.receivedProfile) {
        // Create a mock user from the received profile
        const mockUser: UserProfile = {
          id: result.receivedProfile.userId,
          name: result.receivedProfile.displayName,
          title: result.receivedProfile.displayTitle,
          company: result.receivedProfile.displayCompany,
          avatarUrl: result.receivedProfile.avatarUrl,
          socialLinks: result.receivedProfile.visibleLinks,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const connection: Connection = {
          user: mockUser,
          interaction: {
            id: `int_${Date.now()}`,
            sourceUserId: profile?.id || '',
            targetUserId: mockUser.id,
            metAt: result.timestamp,
            location: result.location || {
              latitude: 0,
              longitude: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        addConnection(connection);
        setLastConnection(connection);
        setShowSuccess(true);

        // 지식그래프에 노드 자동 생성 (비동기, 실패해도 핸드셰이크에 영향 없음)
        const graphStore = useGraphStore.getState();
        graphStore.addPersonNode(mockUser, connection.interaction).catch((err) => {
          console.warn('[Graph] 핸드셰이크 후 그래프 동기화 실패:', err);
        });
      }
    },
    [profile, addConnection]
  );

  const { state: nfcState, performManualHandshake } = useNfcHandshake({
    profileCard: activeCard,
    autoStart: true,
    onHandshakeComplete: handleHandshakeComplete,
  });

  const handleManualTap = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await performManualHandshake();
  };

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMode(currentMode === 'business' ? 'casual' : 'business');
  };

  const recentConnections = connections.slice(0, 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.background }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>
            {profile?.name ? `Hi, ${profile.name.split(' ')[0]}` : 'Welcome'}
          </Text>
          <Text style={[styles.subGreeting, { color: c.textSecondary }]}>Ready to connect</Text>
        </View>

        {/* Mode Toggle */}
        <Pressable
          style={[styles.modeToggle, { backgroundColor: c.accentLight }]}
          onPress={toggleMode}
          accessibilityRole="button"
          accessibilityLabel={`모드 전환: 현재 ${currentMode === 'business' ? '비즈니스' : '캐주얼'} 모드`}
        >
          <Ionicons
            name={currentMode === 'business' ? 'briefcase' : 'cafe'}
            size={18}
            color={c.accent}
          />
          <Text style={[styles.modeText, { color: c.accent }]}>
            {currentMode === 'business' ? 'Business' : 'Casual'}
          </Text>
        </Pressable>
      </View>

      {/* Main NFC Ready Area */}
      <View style={styles.nfcContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.nfcCircle,
            {
              width: wp(200),
              height: wp(200),
              borderRadius: wp(100),
              backgroundColor: c.accentLight,
            },
            pressed && [styles.nfcCirclePressed, { backgroundColor: c.accent }],
            !nfcState.isSupported && [styles.nfcCircleDisabled, { backgroundColor: c.backgroundAlt }],
          ]}
          onPress={handleManualTap}
          disabled={!nfcState.isSupported}
          accessibilityRole="button"
          accessibilityLabel="NFC 연결 시작"
          accessibilityHint="더블 탭하여 NFC 연결을 시작합니다"
        >
          {/* Pulse animation rings */}
          {nfcState.isScanning && (
            <>
              <View style={[
                styles.pulseRing,
                styles.pulseRing1,
                {
                  width: wp(250),
                  height: wp(250),
                  borderRadius: wp(150),
                  borderColor: c.accent,
                }
              ]} />
              <View style={[
                styles.pulseRing,
                styles.pulseRing2,
                {
                  width: wp(300),
                  height: wp(300),
                  borderRadius: wp(150),
                  borderColor: c.accent,
                }
              ]} />
            </>
          )}

          {/* NFC Icon */}
          <View style={[
            styles.nfcIconContainer,
            {
              width: wp(120),
              height: wp(120),
              borderRadius: wp(60),
              backgroundColor: c.background,
            }
          ]}>
            <Ionicons
              name="phone-portrait-outline"
              size={48}
              color={nfcState.isSupported ? c.accent : c.textTertiary}
            />
          </View>
        </Pressable>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: c.textPrimary }]}>
          {!nfcState.isSupported
            ? 'NFC not available'
            : !nfcState.isEnabled
            ? 'Enable NFC in settings'
            : nfcState.isScanning
            ? 'Hold phones together'
            : 'Tap to connect'}
        </Text>

        <Text style={[styles.hintText, { color: c.textSecondary }]}>
          {nfcState.isSupported && nfcState.isEnabled
            ? 'Place your phone back-to-back with another ALIVE user'
            : 'NFC is required for instant connections'}
        </Text>
      </View>

      {/* Recent Connections */}
      {recentConnections.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Recent</Text>
          <View style={styles.recentList}>
            {recentConnections.map((conn) => (
              <Pressable
                key={conn.interaction.id}
                style={[styles.recentItem, { backgroundColor: c.backgroundAlt }]}
                accessibilityRole="button"
                accessibilityLabel={`${conn.user.name} 프로필 보기`}
              >
                <View style={[
                  styles.recentAvatar,
                  {
                    width: wp(40),
                    height: wp(40),
                    borderRadius: wp(20),
                    backgroundColor: c.accentLight,
                  }
                ]}>
                  <Text style={[styles.recentInitial, { color: c.accent }]}>
                    {conn.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, { color: c.textPrimary }]} numberOfLines={1}>
                    {conn.user.name}
                  </Text>
                  <Text style={[styles.recentMeta, { color: c.textTertiary }]} numberOfLines={1}>
                    {conn.user.company || 'No company'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Handshake Success Modal */}
      {showSuccess && lastConnection && (
        <HandshakeSuccess
          profile={{
            userId: lastConnection.user.id,
            mode: currentMode,
            displayName: lastConnection.user.name,
            displayTitle: lastConnection.user.title,
            displayCompany: lastConnection.user.company,
            avatarUrl: lastConnection.user.avatarUrl,
            visibleLinks: lastConnection.user.socialLinks,
          }}
          location={lastConnection.interaction.location}
          timestamp={lastConnection.interaction.metAt}
          onDismiss={() => setShowSuccess(false)}
          onAddMemo={() => {
            setShowSuccess(false);
            // Navigate to memo recording
          }}
          onViewProfile={() => {
            setShowSuccess(false);
            // Navigate to profile detail
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  greeting: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },

  subGreeting: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.full,
  },

  modeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.accent,
  },

  // NFC Container
  nfcContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },

  nfcCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },

  nfcCirclePressed: {
    backgroundColor: colors.accent,
    transform: [{ scale: 0.98 }],
  },

  nfcCircleDisabled: {
    backgroundColor: colors.backgroundAlt,
  },

  nfcIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  pulseRing: {
    position: 'absolute',
    borderRadius: 150,
    borderWidth: 2,
    borderColor: colors.accent,
    opacity: 0.3,
  },

  pulseRing1: {
    width: 250,
    height: 250,
  },

  pulseRing2: {
    width: 300,
    height: 300,
    opacity: 0.15,
  },

  statusText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  hintText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },

  // Recent Section
  recentSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  recentList: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  recentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  recentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentInitial: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },

  recentInfo: {
    flex: 1,
  },

  recentName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },

  recentMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});

export default HomeScreen;
