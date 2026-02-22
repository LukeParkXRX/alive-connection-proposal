/**
 * useExchangeManager — ExchangeManager ↔ React 연동 훅
 */

import { useEffect, useCallback, useRef } from 'react';
import ExchangeManager from '@/services/exchange/ExchangeManager';
import { useExchangeStore } from '@/store/useExchangeStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useConnectionStore } from '@/store/useConnectionStore';
import type { ExchangeMethod } from '@/types/ble';

export function useExchangeManager() {
  const exchangeManager = useRef(ExchangeManager.getInstance()).current;
  const { dbUser } = useAuthStore();
  const { activeCard } = useProfileStore();
  const { addConnection } = useConnectionStore();
  const {
    bleState,
    isScanning,
    currentEvent,
    isExchanging,
    lastCompletedExchange,
    error,
    handleExchangeEvent,
    setScanning,
    setLastCompletedExchange,
    setError,
    reset,
  } = useExchangeStore();

  // ExchangeManager 이벤트 구독
  useEffect(() => {
    const cleanup = exchangeManager.on((event) => {
      handleExchangeEvent(event);
    });

    return cleanup;
  }, [exchangeManager]);

  // 교환 모드 시작
  const startExchange = useCallback(async () => {
    if (!dbUser?.id || !activeCard) {
      console.warn('[useExchangeManager] 유저 또는 프로필 카드 없음');
      return false;
    }

    setError(null);
    setScanning(true);
    const result = await exchangeManager.startExchangeMode(dbUser.id, activeCard);
    if (!result) {
      setScanning(false);
    }
    return result;
  }, [dbUser, activeCard, exchangeManager]);

  // 교환 모드 중지
  const stopExchange = useCallback(() => {
    exchangeManager.stopExchangeMode();
    setScanning(false);
    reset();
  }, [exchangeManager]);

  // 교환 수락
  const acceptExchange = useCallback(async (partnerId: string, method: ExchangeMethod) => {
    const connection = await exchangeManager.acceptExchange(partnerId, method);
    if (connection) {
      // 로컬 스토어에도 추가
      addConnection(connection);
      setLastCompletedExchange(connection);
    }
    return connection;
  }, [exchangeManager, addConnection]);

  // 마지막 교환 결과 클리어
  const clearLastExchange = useCallback(() => {
    setLastCompletedExchange(null);
  }, []);

  return {
    // 상태
    bleState,
    isScanning,
    currentEvent,
    isExchanging,
    lastCompletedExchange,
    error,

    // 액션
    startExchange,
    stopExchange,
    acceptExchange,
    clearLastExchange,
  };
}

export default useExchangeManager;
