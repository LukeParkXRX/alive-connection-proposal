/**
 * ExchangeReadyScreen - v2 Hybrid Exchange Home Screen
 *
 * BLE 기반 교환 준비 화면 (NFC/HCE 통합)
 * - PulseAnimation으로 스캔 상태 시각화
 * - ExchangeRequestSheet로 근접 기기 승인
 * - 최근 교환 기록 표시
 *
 * NOTE: 이 화면은 HomeScreen.tsx를 대체하지 않습니다.
 * 네비게이션에 추가될 새로운 화면입니다.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useExchangeManager } from '@/hooks/useExchangeManager';
import { useConnectionStore } from '@/store/useConnectionStore';
import { useProfileStore } from '@/store/useProfileStore';
import PulseAnimation from '@/components/exchange/PulseAnimation';
import ExchangeRequestSheet from '@/components/exchange/ExchangeRequestSheet';
import { HandshakeSuccess } from '@/components/HandshakeSuccess';
import { BLEState } from '@/constants/ble';
import type { ExchangeMethod } from '@/types/ble';
import type { Connection } from '@/types';

// Dark theme colors (XRX Antigravity style)
const COLORS = {
  background: '#0F172A',
  backgroundAlt: '#1E293B',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  accent: '#00D4AA',
  accentDark: '#00B894',
  border: '#334155',
};

export const ExchangeReadyScreen: React.FC = () => {
  const { activeCard, currentMode } = useProfileStore();
  const { connections } = useConnectionStore();
  const {
    bleState,
    isScanning,
    currentEvent,
    lastCompletedExchange,
    error,
    startExchange,
    stopExchange,
    acceptExchange,
    clearLastExchange,
  } = useExchangeManager();

  const [showRequestSheet, setShowRequestSheet] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 교환 요청 이벤트 감지
  useEffect(() => {
    if (currentEvent?.type === 'request') {
      setShowRequestSheet(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [currentEvent]);

  // 교환 완료 이벤트 감지
  useEffect(() => {
    if (lastCompletedExchange) {
      setShowRequestSheet(false);
      setShowSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [lastCompletedExchange]);

  // 스캔 토글
  const handleToggleScan = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isScanning) {
      stopExchange();
    } else {
      const started = await startExchange();
      if (!started) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [isScanning, startExchange, stopExchange]);

  // 교환 수락
  const handleAcceptExchange = useCallback(
    async (partnerId: string, method: ExchangeMethod) => {
      await acceptExchange(partnerId, method);
    },
    [acceptExchange]
  );

  // 교환 거절
  const handleRejectExchange = useCallback(() => {
    setShowRequestSheet(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Success 모달 닫기
  const handleDismissSuccess = useCallback(() => {
    setShowSuccess(false);
    clearLastExchange();
  }, [clearLastExchange]);

  // 상태 텍스트
  const getStatusText = () => {
    if (error) return '오류 발생';
    if (bleState === BLEState.ERROR) return 'BLE 사용 불가';
    if (isScanning) return 'BLE 스캔 중...';
    return '폰을 가까이 대세요';
  };

  const getHintText = () => {
    if (error) return error;
    if (isScanning) {
      return '근처 ALIVE 사용자를 찾고 있습니다\nNFC를 태깅하거나 HCE 모드를 기다립니다';
    }
    return '아래 버튼을 눌러 교환 모드를 시작하세요';
  };

  const recentConnections = connections.slice(0, 5);
  const canScan = bleState !== BLEState.ERROR;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>ALIVE Exchange</Text>
          <Text style={styles.subGreeting}>Hybrid Mode (BLE + NFC + HCE)</Text>
        </View>

        <View style={styles.modeBadge}>
          <Ionicons
            name={currentMode === 'business' ? 'briefcase' : 'cafe'}
            size={16}
            color={COLORS.accent}
          />
          <Text style={styles.modeText}>
            {currentMode === 'business' ? 'Business' : 'Casual'}
          </Text>
        </View>
      </View>

      {/* Main Pulse Area */}
      <View style={styles.pulseContainer}>
        <PulseAnimation isActive={isScanning} size={180} color={COLORS.accent} />

        {/* Status Text */}
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.hintText}>{getHintText()}</Text>

        {/* Toggle Button */}
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            isScanning && styles.toggleButtonActive,
            !canScan && styles.toggleButtonDisabled,
            pressed && styles.toggleButtonPressed,
          ]}
          onPress={handleToggleScan}
          disabled={!canScan}
        >
          {isScanning ? (
            <>
              <ActivityIndicator size="small" color="#0F172A" />
              <Text style={styles.toggleButtonTextActive}>스캔 중지</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={20} color="#0F172A" />
              <Text style={styles.toggleButtonText}>교환 시작</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Recent Exchanges */}
      {recentConnections.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>최근 교환</Text>
          <FlatList
            data={recentConnections}
            keyExtractor={(item) => item.interaction.id}
            renderItem={({ item }) => (
              <View style={styles.recentItem}>
                <View style={styles.recentAvatar}>
                  <Text style={styles.recentInitial}>
                    {item.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentName} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {item.user.company || '회사 정보 없음'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Exchange Request Sheet */}
      <ExchangeRequestSheet
        visible={showRequestSheet}
        event={currentEvent}
        onAccept={handleAcceptExchange}
        onReject={handleRejectExchange}
      />

      {/* Success Modal */}
      {showSuccess && lastCompletedExchange && (
        <HandshakeSuccess
          profile={{
            userId: lastCompletedExchange.user.id,
            mode: currentMode,
            displayName: lastCompletedExchange.user.name,
            displayTitle: lastCompletedExchange.user.title,
            displayCompany: lastCompletedExchange.user.company,
            avatarUrl: lastCompletedExchange.user.avatarUrl,
            visibleLinks: lastCompletedExchange.user.socialLinks,
          }}
          location={lastCompletedExchange.interaction.location}
          timestamp={lastCompletedExchange.interaction.metAt}
          onDismiss={handleDismissSuccess}
          onAddMemo={() => {
            handleDismissSuccess();
            // TODO: Navigate to memo recording
          }}
          onViewProfile={() => {
            handleDismissSuccess();
            // TODO: Navigate to profile detail
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    borderRadius: 16,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },

  // Pulse Container
  pulseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 32,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },

  // Toggle Button
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    minWidth: 180,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.accentDark,
  },
  toggleButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  toggleButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleButtonTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Recent Section
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.backgroundAlt,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  recentMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default ExchangeReadyScreen;
