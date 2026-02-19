/**
 * useNfcHandshake - React Hook for NFC Handshake functionality
 *
 * Provides a clean interface for components to interact with NFC.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { nfcExchanger } from '@/services/nfc';
import type {
  NfcHandshakeResult,
  ProfileCard,
  NfcState,
} from '@/types';

interface UseNfcHandshakeOptions {
  profileCard: ProfileCard | null;
  autoStart?: boolean;
  onHandshakeComplete?: (result: NfcHandshakeResult) => void;
}

interface UseNfcHandshakeReturn {
  state: NfcState;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  performManualHandshake: () => Promise<NfcHandshakeResult | null>;
  lastResult: NfcHandshakeResult | null;
}

export function useNfcHandshake({
  profileCard,
  autoStart = true,
  onHandshakeComplete,
}: UseNfcHandshakeOptions): UseNfcHandshakeReturn {
  const [state, setState] = useState<NfcState>({
    isSupported: false,
    isEnabled: false,
    isScanning: false,
    lastHandshake: null,
  });

  const [lastResult, setLastResult] = useState<NfcHandshakeResult | null>(null);
  const isInitializedRef = useRef(false);
  const callbackRef = useRef(onHandshakeComplete);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onHandshakeComplete;
  }, [onHandshakeComplete]);

  // Initialize NFC on mount
  useEffect(() => {
    let isMounted = true;

    const initNfc = async () => {
      const isSupported = await nfcExchanger.initialize();

      if (!isMounted) return;

      if (isSupported) {
        const isEnabled = await nfcExchanger.isNfcEnabled();
        setState((prev) => ({
          ...prev,
          isSupported: true,
          isEnabled,
        }));
        isInitializedRef.current = true;
      } else {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          isEnabled: false,
        }));
      }
    };

    initNfc();

    return () => {
      isMounted = false;
      nfcExchanger.cleanup();
    };
  }, []);

  // Set profile card when it changes
  useEffect(() => {
    if (profileCard) {
      nfcExchanger.setProfileCard(profileCard);
    }
  }, [profileCard]);

  // Handle handshake completion
  const handleHandshakeComplete = useCallback((result: NfcHandshakeResult) => {
    setLastResult(result);
    setState((prev) => ({
      ...prev,
      lastHandshake: result,
    }));

    if (callbackRef.current) {
      callbackRef.current(result);
    }
  }, []);

  // Start NFC listener
  const startListening = useCallback(async () => {
    if (!isInitializedRef.current || !profileCard) {
      console.warn('Cannot start NFC: not initialized or no profile card');
      return;
    }

    try {
      await nfcExchanger.startHandshakeListener(handleHandshakeComplete);
      setState((prev) => ({ ...prev, isScanning: true }));
    } catch (error) {
      console.error('Failed to start NFC listener:', error);
    }
  }, [profileCard, handleHandshakeComplete]);

  // Stop NFC listener
  const stopListening = useCallback(async () => {
    try {
      await nfcExchanger.stopHandshakeListener();
      setState((prev) => ({ ...prev, isScanning: false }));
    } catch (error) {
      console.error('Failed to stop NFC listener:', error);
    }
  }, []);

  // Manual handshake trigger
  const performManualHandshake = useCallback(async (): Promise<NfcHandshakeResult | null> => {
    if (!isInitializedRef.current || !profileCard) {
      return null;
    }

    const result = await nfcExchanger.performHandshake();
    handleHandshakeComplete(result);
    return result;
  }, [profileCard, handleHandshakeComplete]);

  // Auto-start listener when conditions are met
  useEffect(() => {
    if (autoStart && state.isSupported && state.isEnabled && profileCard && !state.isScanning) {
      startListening();
    }

    return () => {
      if (state.isScanning) {
        stopListening();
      }
    };
  }, [autoStart, state.isSupported, state.isEnabled, profileCard, state.isScanning, startListening, stopListening]);

  // Handle app state changes (pause/resume NFC)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && state.isSupported && profileCard && autoStart) {
        // Resume listening when app comes to foreground
        startListening();
      } else if (nextAppState === 'background') {
        // Optionally keep listening in background (platform dependent)
        if (Platform.OS === 'ios') {
          // iOS may require stopping
          stopListening();
        }
        // Android can continue background NFC
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [state.isSupported, profileCard, autoStart, startListening, stopListening]);

  return {
    state,
    startListening,
    stopListening,
    performManualHandshake,
    lastResult,
  };
}

export default useNfcHandshake;
