/**
 * ALIVE Connection - Main App Entry Point
 *
 * "기록은 최소화, 기억은 극대화"
 * Zero-Input Networking Platform
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, AppState, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as Linking from 'expo-linking';

import { AppNavigator, navigationRef } from './src/navigation';
import { nfcExchanger } from './src/services/nfc';
import ExchangeManager from './src/services/exchange/ExchangeManager';
import { useConnectionStore } from './src/store/useConnectionStore';
import { useAuthStore } from './src/store/useAuthStore';
import { useGraphStore } from './src/store/useGraphStore';
import { HandshakeSuccess } from './src/components/HandshakeSuccess';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { supabase } from '@/services/supabase';
import { useProfileStore } from './src/store/useProfileStore';
import { logger } from './src/lib/logger';

export default function App() {
  // UI 렌더링에 필요한 상태만 셀렉터로 구독
  const lastReceivedConnection = useConnectionStore((s) => s.lastReceivedConnection);
  const clearLastConnection = useConnectionStore((s) => s.clearLastConnection);
  const colorScheme = useColorScheme();

  useEffect(() => {
    // getState()로 액션 참조 → deps 배열에서 제외해 무한루프 방지
    const { setSession, setLoading } = useAuthStore.getState();
    const { initializeGraph } = useGraphStore.getState();

    // 1. Initialize Auth + DB User + Profile + Connections
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // Auth 성공 시 DB 유저 프로필 로드 → ProfileStore 초기화 → 타임라인 로드
      if (session) {
        const dbUser = await useAuthStore.getState().fetchDbUser();
        if (dbUser) {
          useProfileStore.getState().initializeFromAuth();
          useConnectionStore.getState().loadConnectionsFromSupabase();
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      useAuthStore.getState().setSession(session);
      if (session) {
        const dbUser = await useAuthStore.getState().fetchDbUser();
        if (dbUser) {
          useProfileStore.getState().initializeFromAuth();
          useConnectionStore.getState().loadConnectionsFromSupabase();
        }
      }
    });

    // AppState listener for Supabase token refresh
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    // 2. Initialize NFC on app start
    const initApp = async () => {
      await nfcExchanger.initialize();

      // 3. ALIVE Engine 지식그래프 초기화 (비동기, 실패해도 앱 동작에 영향 없음)
      initializeGraph().catch((err) => {
        logger.warn('[Graph] 지식그래프 초기화 실패:', err);
      });
    };

    initApp();

    // 4. Deep link handling
    const handleDeepLink = (event: { url: string | null }) => {
      if (!event.url) return;
      const { path } = Linking.parse(event.url);

      // Handle https://alive-connection.app/connect/[userId]
      if (path?.startsWith('connect/')) {
        const userId = path.split('/')[1];
        if (userId) {
          // getState()로 최신 액션 참조 — deps 불필요
          useConnectionStore.getState().handleAutomaticHandshake(userId);
        }
      }
    };

    // Subscriptions
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Initial link (cold start)
    Linking.getInitialURL().then((url: string | null) => {
      handleDeepLink({ url });
    });

    // Cleanup on unmount — BleManager 리소스 누수 방지
    return () => {
      nfcExchanger.cleanup();
      ExchangeManager.getInstance().destroy(); // BleManager.destroy() 포함
      linkingSubscription.remove();
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []); // 빈 deps — 모든 스토어 액션은 getState()로 안정적 참조

  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <AppNavigator />

        {/* Global Handshake Success Overlay */}
        {lastReceivedConnection && (
          <HandshakeSuccess
            profile={{
              userId: lastReceivedConnection.user.id,
              displayName: lastReceivedConnection.user.name,
              displayTitle: lastReceivedConnection.user.title,
              displayCompany: lastReceivedConnection.user.company,
              avatarUrl: lastReceivedConnection.user.avatarUrl,
              mode: 'business',
              visibleLinks: lastReceivedConnection.user.socialLinks,
            }}
            location={lastReceivedConnection.interaction.location}
            timestamp={lastReceivedConnection.interaction.metAt}
            onDismiss={clearLastConnection}
            onAddMemo={() => {
              clearLastConnection();
              // Future: Navigation to memo screen
            }}
            onViewProfile={() => {
              clearLastConnection();
              // Future: Navigation to profile detail
            }}
          />
        )}

        {/* Temporary Build Version Indicator */}
        <View style={{ position: 'absolute', bottom: 10, right: 10, opacity: 0.3, pointerEvents: 'none' }} pointerEvents="none">
          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Build: Hybrid-v1</Text>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
