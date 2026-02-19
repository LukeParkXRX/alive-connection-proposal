/**
 * ALIVE Connection - Main App Entry Point
 *
 * "기록은 최소화, 기억은 극대화"
 * Zero-Input Networking Platform
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as Linking from 'expo-linking';

import { AppNavigator, navigationRef } from './src/navigation';
import { nfcExchanger } from './src/services/nfc';
import { useConnectionStore } from './src/store/useConnectionStore';
import { useAuthStore } from './src/store/useAuthStore';
import { useGraphStore } from './src/store/useGraphStore';
import { HandshakeSuccess } from './src/components/HandshakeSuccess';
import { ProfileCard } from './src/types';
import { supabase } from '@/services/supabase';

export default function App() {
  const { handleAutomaticHandshake, lastReceivedConnection, clearLastConnection } = useConnectionStore();
  const { setSession, setLoading } = useAuthStore();
  const { initializeGraph } = useGraphStore();
  const colorScheme = useColorScheme();

  useEffect(() => {
    // 1. Initialize Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 2. Initialize NFC on app start
    const initApp = async () => {
      await nfcExchanger.initialize();

      // 3. ALIVE Engine 지식그래프 초기화 (비동기, 실패해도 앱 동작에 영향 없음)
      initializeGraph().catch((err) => {
        console.warn('[Graph] 지식그래프 초기화 실패:', err);
      });
    };

    initApp();

    // 4. Deep link handling
    const handleDeepLink = (event: { url: string | null }) => {
      if (!event.url) return;
      const { path, queryParams } = Linking.parse(event.url);

      // Handle https://alive-connection.app/connect/[userId]
      if (path?.startsWith('connect/')) {
        const userId = path.split('/')[1];
        if (userId) {
          handleAutomaticHandshake(userId);
        }
      }
    };

    // Subscriptions
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Initial link (cold start)
    Linking.getInitialURL().then((url: string | null) => {
      handleDeepLink({ url });
    });

    // Cleanup on unmount
    return () => {
      nfcExchanger.cleanup();
      linkingSubscription.remove();
      subscription.unsubscribe();
    };
  }, [handleAutomaticHandshake, setSession, setLoading]);

  return (
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
