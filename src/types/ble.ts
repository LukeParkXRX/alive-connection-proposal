/**
 * BLE 관련 타입 정의 — ALIVE Connection
 */

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
export type ExchangeMethod = 'ble' | 'qr' | 'link';

// === 교환 이벤트 — Discriminated Union ===
// 각 이벤트 타입별로 data 필드를 명확히 정의하여 any 타입 제거

/** BLE 기기 발견 시 data 구조 */
export interface DiscoveredEventData {
  deviceId?: string;      // BLE 기기 고유 ID
  rssi: number;           // 신호 강도 (dBm)
  localName?: string;     // BLE 기기 이름
  isVeryClose: boolean;   // RSSI_VERY_CLOSE 임계값 이내 여부
}

/** BLE 교환 요청 시 data 구조 */
export interface RequestEventData {
  rssi?: number;
  localName?: string;
  isVeryClose?: boolean;
  displayName?: string;
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

