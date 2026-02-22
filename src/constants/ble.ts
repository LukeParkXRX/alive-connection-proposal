/**
 * BLE 설정 상수 — ALIVE Connection Hybrid Architecture
 * DEV_CONTEXT.md 기준
 */

// ALIVE Connection 전용 BLE 서비스/특성 UUID
// 형식: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (각 x는 유효한 hex 문자: 0-9, A-F)
// 식별 패턴: A11FE00x - ALIVE Connection 시그니처 (A=0xA, 11=11, FE≈VE, 00x=순번)
export const ALIVE_BLE_CONFIG = {
  // 서비스 UUID (128-bit custom, 유효한 hex 전용)
  SERVICE_UUID: 'A11FE000-C0FF-EC10-8000-000500D10000',

  // Characteristic UUIDs (순번 0~3으로 구분)
  CHAR_USER_ID: 'A11FE001-C0FF-EC10-8000-000500D10000',      // Read: userId hash
  CHAR_EXCHANGE_REQ: 'A11FE002-C0FF-EC10-8000-000500D10000',  // Write: 교환 요청
  CHAR_EXCHANGE_RES: 'A11FE003-C0FF-EC10-8000-000500D10000',  // Notify: 교환 응답

  // Advertising 설정
  ADVERTISING: {
    localName: 'ALIVE',
    txPowerLevel: 'medium' as const,
    connectable: true,
  },

  // 근접 판정 RSSI 임계값
  RSSI_THRESHOLD: -50,        // dBm (약 30cm 이내)
  RSSI_VERY_CLOSE: -35,       // dBm (약 10cm 이내 → 자동 교환 트리거)

  // 스캔 주기
  SCAN_INTERVAL_FOREGROUND: 2000,   // ms (앱 활성 시)
  SCAN_INTERVAL_BACKGROUND: 10000,  // ms (백그라운드)

  // 중복 발견 방지 캐시 TTL
  DISCOVERY_CACHE_TTL: 5 * 60 * 1000,  // 5분

  // GATT 연결 타임아웃
  CONNECTION_TIMEOUT: 10000,  // 10초
} as const;

// BLE 상태 머신
export enum BLEState {
  IDLE = 'idle',
  ADVERTISING = 'advertising',
  SCANNING = 'scanning',
  DISCOVERED = 'discovered',
  CONNECTING = 'connecting',
  EXCHANGING = 'exchanging',
  AWAITING_CONFIRM = 'awaiting',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// NFC/HCE 상수
export const ALIVE_NFC_CONFIG = {
  // HCE AID (ALIVE in hex)
  HCE_AID: 'F0414C495645',
  // NDEF payload version
  PAYLOAD_VERSION: 1,
  // ALIVE Link base URL
  ALIVE_LINK_BASE: 'https://alive.link',
  // Connection deep link base
  CONNECT_BASE_URL: 'https://alive-connection.app/connect',
} as const;
