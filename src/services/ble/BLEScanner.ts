/**
 * BLEScanner — BLE Central 모드 스캐너
 *
 * ALIVE Connection 앱 사용자를 BLE로 탐색합니다.
 * Manufacturer Data가 있으면 fast path로 즉시 userId를 읽고,
 * 없으면 GATT 연결 폴백으로 userId를 읽습니다.
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { logger } from '@/lib/logger';
import { ALIVE_BLE_CONFIG } from '@/constants/ble';
import { useAuthStore } from '@/store/useAuthStore';
import type { DiscoveredDevice } from '@/types/ble';

type DeviceCallback = (device: DiscoveredDevice) => void;

// ─── Base64 유틸리티 ───

/** Base64 → 바이트 배열 디코딩 (react-native-ble-plx 데이터 처리용) */
function base64ToBytes(base64: string): number[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  const str = base64.replace(/[^A-Za-z0-9+/]/g, '');

  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = i < str.length ? chars.indexOf(str.charAt(i++)) : 0;
    const enc3 = i < str.length ? chars.indexOf(str.charAt(i++)) : 64;
    const enc4 = i < str.length ? chars.indexOf(str.charAt(i++)) : 64;

    bytes.push((enc1 << 2) | (enc2 >> 4));
    if (enc3 !== 64) bytes.push(((enc2 & 15) << 4) | (enc3 >> 2));
    if (enc4 !== 64) bytes.push(((enc3 & 3) << 6) | enc4);
  }

  return bytes;
}

/** Base64 → 문자열 디코딩 (GATT characteristic value 처리용) */
function base64Decode(base64: string): string {
  const bytes = base64ToBytes(base64);
  return String.fromCharCode(...bytes);
}

// ─── Manufacturer Data 디코딩 유틸리티 ───

/** ALIVE Manufacturer Data 시그니처 (0xA1, 0x1F) */
const ALIVE_SIGNATURE = [0xA1, 0x1F];
/** 프로토콜 버전 */
const PROTOCOL_VERSION = 0x01;
/** 데이터 타입: userId */
const DATA_TYPE_USER_ID = 0x01;

/**
 * 16바이트 배열 → UUID 문자열 복원
 * 예: [0x55, 0x0e, ...] → "550e8400-e29b-41d4-a716-446655440000"
 */
function decodeBytesToUserId(bytes: number[]): string {
  if (bytes.length !== 16) return '';
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

class BLEScanner {
  private manager: BleManager;
  private isActive = false;
  private discoveredCache: Map<string, number> = new Map();
  private listeners: DeviceCallback[] = [];

  constructor(manager: BleManager) {
    this.manager = manager;
  }

  async startScanning(): Promise<void> {
    // 1. BLE 상태 확인
    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      logger.warn('[BLE Scanner] Bluetooth가 켜져있지 않습니다:', state);
      return;
    }

    // 2. 만료된 캐시 정리
    this.cleanCache();

    // 3. Service UUID 필터로 스캔 시작
    this.isActive = true;
    this.manager.startDeviceScan(
      [ALIVE_BLE_CONFIG.SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          logger.warn('[BLE Scanner] 스캔 에러:', error.message);
          return;
        }
        if (device) {
          this.handleDeviceDiscovered(device);
        }
      }
    );

    logger.log('[BLE Scanner] ALIVE 기기 스캔 시작');
  }

  stopScanning(): void {
    this.isActive = false;
    this.manager.stopDeviceScan();
    logger.log('[BLE Scanner] 스캔 중지');
  }

  /** 기기 발견 콜백 등록. 반환값: 리스너 해제 함수 */
  onDeviceDiscovered(callback: DeviceCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  // ─── 기기 발견 처리 ───

  /**
   * 기기 발견 시 처리 — Fast Path + GATT Fallback 이중 구조
   *
   * [Fast Path] manufacturerData에 ALIVE 시그니처 → userId 즉시 추출 (~100ms)
   * [Fallback]  manufacturerData 없음 → GATT 연결 → userId 읽기 (~10초)
   */
  private async handleDeviceDiscovered(device: Device): Promise<void> {
    const rssi = device.rssi ?? -100;

    // RSSI 임계값 필터링 (너무 먼 기기 무시)
    if (rssi < ALIVE_BLE_CONFIG.RSSI_THRESHOLD) {
      return;
    }

    // 중복 발견 캐시 확인
    const cacheKey = device.id;
    const cached = this.discoveredCache.get(cacheKey);
    if (cached && Date.now() - cached < ALIVE_BLE_CONFIG.DISCOVERY_CACHE_TTL) {
      return;
    }

    try {
      // === Fast Path: Manufacturer Data에서 userId 즉시 추출 ===
      const fastUserId = this.tryReadUserIdFromManufacturerData(device);

      if (fastUserId) {
        // 자기 자신의 BLE 신호 무시 (자기 발견 방지)
        if (this.isSelfDevice(fastUserId)) return;
        logger.log(
          `[BLE Scanner] Fast Path 성공 — userId: ${fastUserId.slice(0, 8)}... (RSSI: ${rssi})`
        );
        this.emitDiscoveredDevice(device, fastUserId, rssi);
        return;
      }

      // === Fallback: GATT 연결로 userId 읽기 (느리지만 하위 호환) ===
      logger.log('[BLE Scanner] Manufacturer Data 없음 — GATT 폴백 시도');
      const gattUserId = await this.readUserIdFromDevice(device);
      if (!gattUserId) return;

      // 자기 자신의 BLE 신호 무시 (GATT 폴백에서도 자기 발견 방지)
      if (this.isSelfDevice(gattUserId)) return;
      logger.log(
        `[BLE Scanner] GATT 폴백 성공 — userId: ${gattUserId.slice(0, 8)}... (RSSI: ${rssi})`
      );
      this.emitDiscoveredDevice(device, gattUserId, rssi);
    } catch (err) {
      logger.warn('[BLE Scanner] 기기 처리 실패:', err);
    }
  }

  /**
   * [Fast Path] Manufacturer Data에서 userId 추출 시도
   *
   * react-native-ble-plx의 device.manufacturerData는 base64 인코딩된 문자열.
   * 디코딩 후 ALIVE 시그니처(0xA1, 0x1F) 확인 → userId 16바이트 추출.
   */
  private tryReadUserIdFromManufacturerData(device: Device): string | null {
    const rawData = device.manufacturerData;
    if (!rawData) return null;

    return this.decodeManufacturerData(rawData);
  }

  /**
   * base64 인코딩된 Manufacturer Data → userId 디코딩
   *
   * 데이터 구조 (20바이트):
   * [0][1]   : ALIVE 시그니처 (0xA1, 0x1F)
   * [2]      : 프로토콜 버전 (0x01)
   * [3]      : 데이터 타입 (0x01 = userId)
   * [4]~[19] : userId UUID 바이너리 (16바이트)
   */
  decodeManufacturerData(base64Data: string): string | null {
    try {
      const bytes = base64ToBytes(base64Data);

      // 최소 길이 확인 (시그니처 2 + 버전 1 + 타입 1 + userId 16 = 20)
      if (bytes.length < 20) {
        return null;
      }

      // ALIVE 시그니처 확인
      if (bytes[0] !== ALIVE_SIGNATURE[0] || bytes[1] !== ALIVE_SIGNATURE[1]) {
        return null;
      }

      // 프로토콜 버전 확인
      if (bytes[2] !== PROTOCOL_VERSION) {
        logger.warn(
          `[BLE Scanner] 지원하지 않는 프로토콜 버전: ${bytes[2]} (현재: ${PROTOCOL_VERSION})`
        );
        return null;
      }

      // 데이터 타입 확인
      if (bytes[3] !== DATA_TYPE_USER_ID) {
        return null;
      }

      // userId 바이트 추출 (인덱스 4~19, 16바이트)
      const userIdBytes = bytes.slice(4, 20);
      return decodeBytesToUserId(userIdBytes);
    } catch (err) {
      logger.warn('[BLE Scanner] Manufacturer Data 디코딩 실패:', err);
      return null;
    }
  }

  // ─── GATT 폴백 (기존 방식, 하위 호환) ───

  /** [Fallback] GATT 연결로 userId 읽기 — Manufacturer Data 미지원 기기용 */
  private async readUserIdFromDevice(device: Device): Promise<string | null> {
    let connected: Device | null = null;
    try {
      connected = await device.connect({ timeout: ALIVE_BLE_CONFIG.CONNECTION_TIMEOUT });
      await connected.discoverAllServicesAndCharacteristics();

      const characteristic = await connected.readCharacteristicForService(
        ALIVE_BLE_CONFIG.SERVICE_UUID,
        ALIVE_BLE_CONFIG.CHAR_USER_ID
      );

      if (!characteristic.value) return null;

      const decoded = base64Decode(characteristic.value);
      return decoded || null;
    } catch (err) {
      logger.warn('[BLE Scanner] GATT 읽기 실패:', (err as Error).message);
      return null;
    } finally {
      try {
        if (connected) {
          await connected.cancelConnection();
        }
      } catch {
        /* 연결 해제 에러 무시 */
      }
    }
  }

  // ─── 내부 유틸리티 ───

  /**
   * 발견된 userId가 현재 로그인된 사용자 본인인지 확인
   * 자기 자신의 BLE 광고 신호를 스캔하는 경우를 방지
   */
  private isSelfDevice(discoveredUserId: string): boolean {
    const myUserId = useAuthStore.getState().dbUser?.id;
    if (myUserId && myUserId === discoveredUserId) {
      logger.debug('[BLEScanner] 자기 자신 감지 무시:', myUserId);
      return true;
    }
    return false;
  }

  /** DiscoveredDevice 객체 생성 + 리스너에 전달 */
  private emitDiscoveredDevice(device: Device, userId: string, rssi: number): void {
    this.discoveredCache.set(device.id, Date.now());

    const discovered: DiscoveredDevice = {
      id: device.id,
      userId,
      rssi,
      localName: device.localName || device.name || undefined,
      discoveredAt: Date.now(),
      isVeryClose: rssi > ALIVE_BLE_CONFIG.RSSI_VERY_CLOSE,
    };

    this.listeners.forEach((cb) => cb(discovered));
  }

  /** 만료된 캐시 항목 정리 */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.discoveredCache.entries()) {
      if (now - timestamp > ALIVE_BLE_CONFIG.DISCOVERY_CACHE_TTL) {
        this.discoveredCache.delete(key);
      }
    }
  }
}

export default BLEScanner;
