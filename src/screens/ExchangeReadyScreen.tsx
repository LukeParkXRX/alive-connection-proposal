/**
 * ExchangeReadyScreen — BLE 교환 메인 화면
 *
 * BLE 양방향 교환 (Central 스캔 + Peripheral 광고 동시 실행)
 * - PulseAnimation으로 스캔 상태 시각화
 * - ExchangeRequestSheet로 근접 기기 승인
 * - 최근 교환 기록 표시
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
import { useThemeColors } from '@/hooks/useThemeColors';
import PulseAnimation from '@/components/exchange/PulseAnimation';
import ExchangeRequestSheet from '@/components/exchange/ExchangeRequestSheet';
import { HandshakeSuccess } from '@/components/HandshakeSuccess';
import { BLEState } from '@/constants/ble';
import type { ExchangeMethod } from '@/types/ble';
import type { Connection } from '@/types';

export const ExchangeReadyScreen: React.FC = () => {
  // 테마 색상 (다크/라이트 모드 자동 전환)
  const { colors: themeColors } = useThemeColors();

  // 개별 셀렉터로 구독 → 불필요한 리렌더링 방지
  const activeCard = useProfileStore((s) => s.activeCard);
  const currentMode = useProfileStore((s) => s.currentMode);
  const connections = useConnectionStore((s) => s.connections);
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
      return '근처 ALIVE 사용자를 찾고 있습니다\n30cm 이내로 가까이 오면 자동 감지됩니다';
    }
    return '아래 버튼을 눌러 교환 모드를 시작하세요';
  };

  const recentConnections = connections.slice(0, 5);
  const canScan = bleState !== BLEState.ERROR;

  // 테마 색상 기반 동적 스타일 (StyleSheet.create는 정적이므로 색상 의존 항목만 분리)
  const dynStyles = {
    container: { backgroundColor: themeColors.background },
    greeting: { color: themeColors.textPrimary },
    subGreeting: { color: themeColors.textSecondary },
    modeBadge: { backgroundColor: `${themeColors.accent}26` }, // 15% 불투명도
    modeText: { color: themeColors.accent },
    statusText: { color: themeColors.textPrimary },
    hintText: { color: themeColors.textSecondary },
    toggleButton: { backgroundColor: themeColors.accent },
    toggleButtonActive: { backgroundColor: themeColors.accentDark },
    toggleButtonDisabled: { backgroundColor: themeColors.border },
    // 버튼 텍스트는 항상 다크 배경(#0F172A)에 흰 텍스트로 유지 (브랜드 의도)
    toggleButtonText: { color: themeColors.background },
    sectionTitle: { color: themeColors.textSecondary },
    recentItem: { backgroundColor: themeColors.backgroundAlt },
    recentAvatar: { backgroundColor: `${themeColors.accent}33` }, // 20% 불투명도
    recentInitial: { color: themeColors.accent },
    recentName: { color: themeColors.textPrimary },
    recentMeta: { color: themeColors.textSecondary },
  } as const;

  return (
    <SafeAreaView style={[styles.container, dynStyles.container]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, dynStyles.greeting]}>ALIVE Exchange</Text>
          <Text style={[styles.subGreeting, dynStyles.subGreeting]}>
            BLE Mode
          </Text>
        </View>

        <View style={[styles.modeBadge, dynStyles.modeBadge]}>
          <Ionicons
            name={currentMode === 'business' ? 'briefcase' : 'cafe'}
            size={16}
            color={themeColors.accent}
          />
          <Text style={[styles.modeText, dynStyles.modeText]}>
            {currentMode === 'business' ? 'Business' : 'Casual'}
          </Text>
        </View>
      </View>

      {/* Main Pulse Area */}
      <View style={styles.pulseContainer}>
        <PulseAnimation isActive={isScanning} size={180} color={themeColors.accent} />

        {/* 상태 텍스트 */}
        <Text style={[styles.statusText, dynStyles.statusText]}>{getStatusText()}</Text>
        <Text style={[styles.hintText, dynStyles.hintText]}>{getHintText()}</Text>

        {/* 스캔 토글 버튼 */}
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            dynStyles.toggleButton,
            isScanning && dynStyles.toggleButtonActive,
            !canScan && [dynStyles.toggleButtonDisabled, styles.toggleButtonDisabled],
            pressed && styles.toggleButtonPressed,
          ]}
          onPress={handleToggleScan}
          disabled={!canScan}
        >
          {isScanning ? (
            <>
              <ActivityIndicator size="small" color={themeColors.background} />
              <Text style={[styles.toggleButtonText, dynStyles.toggleButtonText]}>스캔 중지</Text>
            </>
          ) : (
            <>
              <Ionicons name="search" size={20} color={themeColors.background} />
              <Text style={[styles.toggleButtonText, dynStyles.toggleButtonText]}>교환 시작</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Recent Exchanges */}
      {recentConnections.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.sectionTitle, dynStyles.sectionTitle]}>최근 교환</Text>
          <FlatList
            data={recentConnections}
            keyExtractor={(item) => item.interaction.id}
            renderItem={({ item }) => (
              <View style={[styles.recentItem, dynStyles.recentItem]}>
                <View style={[styles.recentAvatar, dynStyles.recentAvatar]}>
                  <Text style={[styles.recentInitial, dynStyles.recentInitial]}>
                    {item.user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentName, dynStyles.recentName]} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  <Text style={[styles.recentMeta, dynStyles.recentMeta]} numberOfLines={1}>
                    {item.user.company || '회사 정보 없음'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColors.textTertiary} />
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

// 레이아웃/정적 값만 StyleSheet에 정의 — 색상은 dynStyles에서 테마 기반으로 처리
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 4,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: 32,
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
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
    borderRadius: 16,
    minWidth: 180,
    justifyContent: 'center',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Recent Section
  recentSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentMeta: {
    fontSize: 13,
  },
});

export default ExchangeReadyScreen;
