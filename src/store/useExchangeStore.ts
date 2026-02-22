/**
 * Exchange Store — 교환 상태 관리
 * ExchangeManager 이벤트를 UI 상태로 변환
 */

import { create } from 'zustand';
import { BLEState } from '@/constants/ble';
import type { ExchangeEvent, ExchangeMethod, DiscoveredDevice } from '@/types/ble';
import type { Connection } from '@/types';

interface ExchangeStoreState {
  // BLE 상태
  bleState: BLEState;
  isScanning: boolean;

  // 발견된 기기
  discoveredDevices: DiscoveredDevice[];

  // 현재 교환 진행 상태
  currentEvent: ExchangeEvent | null;
  isExchanging: boolean;

  // 최근 완료된 교환
  lastCompletedExchange: Connection | null;

  // 에러
  error: string | null;

  // Actions
  setBleState: (state: BLEState) => void;
  setScanning: (scanning: boolean) => void;
  addDiscoveredDevice: (device: DiscoveredDevice) => void;
  clearDiscoveredDevices: () => void;
  setCurrentEvent: (event: ExchangeEvent | null) => void;
  setExchanging: (exchanging: boolean) => void;
  setLastCompletedExchange: (connection: Connection | null) => void;
  setError: (error: string | null) => void;
  handleExchangeEvent: (event: ExchangeEvent) => void;
  reset: () => void;
}

export const useExchangeStore = create<ExchangeStoreState>((set, get) => ({
  bleState: BLEState.IDLE,
  isScanning: false,
  discoveredDevices: [],
  currentEvent: null,
  isExchanging: false,
  lastCompletedExchange: null,
  error: null,

  setBleState: (bleState) => set({ bleState }),
  setScanning: (isScanning) => set({ isScanning }),

  addDiscoveredDevice: (device) => {
    set((state) => {
      // 중복 방지
      const exists = state.discoveredDevices.some(d => d.userId === device.userId);
      if (exists) return state;
      return { discoveredDevices: [...state.discoveredDevices, device] };
    });
  },

  clearDiscoveredDevices: () => set({ discoveredDevices: [] }),

  setCurrentEvent: (currentEvent) => set({ currentEvent }),

  setExchanging: (isExchanging) => set({ isExchanging }),

  setLastCompletedExchange: (lastCompletedExchange) => set({ lastCompletedExchange }),

  setError: (error) => set({ error }),

  // ExchangeManager 이벤트 핸들러
  handleExchangeEvent: (event) => {
    switch (event.type) {
      case 'discovered':
        if (event.data) {
          get().addDiscoveredDevice({
            id: event.data.deviceId || event.partnerId || '',
            userId: event.partnerId || '',
            rssi: event.data.rssi || -100,
            localName: event.data.localName,
            discoveredAt: Date.now(),
            isVeryClose: event.data.isVeryClose || false,
          });
        }
        break;

      case 'request':
        set({ currentEvent: event, isExchanging: false });
        break;

      case 'confirmed':
        set({ currentEvent: event, isExchanging: true });
        break;

      case 'completed':
        set({
          currentEvent: null,
          isExchanging: false,
          lastCompletedExchange: event.data as Connection || null,
        });
        break;

      case 'error':
        set({
          currentEvent: null,
          isExchanging: false,
          error: event.error || 'Unknown error',
        });
        break;
    }
  },

  reset: () => set({
    bleState: BLEState.IDLE,
    isScanning: false,
    discoveredDevices: [],
    currentEvent: null,
    isExchanging: false,
    lastCompletedExchange: null,
    error: null,
  }),
}));

export default useExchangeStore;
