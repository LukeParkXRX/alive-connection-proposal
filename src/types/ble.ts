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

// === 교환 이벤트 — Discriminated Union ===
// 각 이벤트 타입별로 data 필드를 명확히 정의하여 any 타입 제거

/** BLE 기기 발견 시 data 구조 */
export interface DiscoveredEventData {
  deviceId?: string;      // BLE 기기 고유 ID
  rssi: number;           // 신호 강도 (dBm)
  localName?: string;     // BLE 기기 이름
  isVeryClose: boolean;   // RSSI_VERY_CLOSE 임계값 이내 여부
}

/** BLE/NFC 교환 요청 시 data 구조 (방식에 따라 다름) */
export interface RequestEventData {
  // BLE 요청 필드
  rssi?: number;
  localName?: string;
  isVeryClose?: boolean;
  // NFC 요청 필드
  displayName?: string;
  location?: { lat: number; lng: number; name?: string };
  timestamp?: number;
}

/** 기기 발견 이벤트 (BLE 스캔 중 근처 기기 감지) */
export interface DiscoveredExchangeEvent {
  type: 'discovered';
  partnerId?: string;
  method?: ExchangeMethod;
  data: DiscoveredEventData;
}

/** 교환 요청 이벤트 (상대방이 매우 가까운 거리로 접근) */
export interface RequestExchangeEvent {
  type: 'request';
  partnerId?: string;
  method?: ExchangeMethod;
  data: RequestEventData;
}

/** 교환 수락 확인 이벤트 (양측 모두 동의 완료) */
export interface ConfirmedExchangeEvent {
  type: 'confirmed';
  partnerId?: string;
  method?: ExchangeMethod;
  data?: RequestEventData;
}

/** 교환 완료 이벤트 (Connection 객체 생성 완료) */
export interface CompletedExchangeEvent {
  type: 'completed';
  partnerId?: string;
  method?: ExchangeMethod;
  data: import('./index').Connection;
}

/** 교환 오류 이벤트 */
export interface ErrorExchangeEvent {
  type: 'error';
  partnerId?: string;
  method?: ExchangeMethod;
  error: string;
  data?: never;
}

/**
 * 교환 이벤트 — Discriminated Union
 * type 필드로 각 케이스를 구분하며, TypeScript가 switch/case 내에서 자동으로 타입을 좁혀줌
 */
export type ExchangeEvent =
  | DiscoveredExchangeEvent
  | RequestExchangeEvent
  | ConfirmedExchangeEvent
  | CompletedExchangeEvent
  | ErrorExchangeEvent;

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
