/**
 * BLE 관련 타입 정의 — ALIVE Connection
 */

import { BLEState } from '@/constants/ble';

// BLE에서 발견된 기기 정보
export interface DiscoveredDevice {
  id: string;               // BLE device ID
  userId: string;            // ALIVE userId (GATT에서 읽은 값)
  rssi: number;              // 신호 강도
  localName?: string;        // 기기 이름
  discoveredAt: number;      // timestamp (ms)
  isVeryClose: boolean;      // RSSI_VERY_CLOSE 이내 여부
}

// 교환 방식
export type ExchangeMethod = 'ble' | 'nfc' | 'hce' | 'qr' | 'link';

// 교환 이벤트
export interface ExchangeEvent {
  type: 'discovered' | 'request' | 'confirmed' | 'completed' | 'error';
  partnerId?: string;
  method?: ExchangeMethod;
  data?: any;
  error?: string;
}

// 교환 결과 (서버 응답)
export interface ExchangeResult {
  exchangeId: string;
  status: 'pending' | 'completed' | 'rejected';
  partner: {
    userId: string;
    displayName: string;
    title?: string;
    company?: string;
    profileImageUrl?: string;
    emailPublic?: string;
    linkedinUrl?: string;
    aliveLink?: string;
  };
  context: {
    location: {
      lat: number;
      lng: number;
      name?: string;
      address?: string;
    };
    exchangedAt: string;
    method: ExchangeMethod;
    eventName?: string;
  };
}

// BLE 스토어 상태
export interface BLEStoreState {
  state: BLEState;
  isScanning: boolean;
  isAdvertising: boolean;
  discoveredDevices: DiscoveredDevice[];
  currentExchange: ExchangeEvent | null;
  error: string | null;
}

// NFC NDEF 페이로드 (v2 형식)
export interface AliveNdefPayload {
  type: 'alive_exchange';
  version: number;
  userId: string;
  aliveLink: string;
  timestamp: number;
}

// 교환 요청 (서버 POST /exchanges body)
export interface CreateExchangeRequest {
  partnerId: string;
  method: ExchangeMethod;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  cardId?: string;
  eventName?: string;
}
