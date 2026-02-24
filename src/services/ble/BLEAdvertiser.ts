/**
 * BLEAdvertiser — BLE Peripheral 모드 (GATT 서버 + 광고)
 *
 * NativeModules.AliveBlePeripheral을 호출하여
 * GATT 서버에 userId characteristic을 제공하고 BLE 광고를 수행합니다.
 * BLEScanner가 GATT 연결로 userId를 읽는 구조와 호환됩니다.
 */

import { NativeModules, Platform } from 'react-native';
import { ALIVE_BLE_CONFIG } from '@/constants/ble';
import { logger } from '@/lib/logger';

/** 네이티브 모듈 타입 정의 — AliveBlePeripheral */
interface AliveBlePeripheralNative {
  startPeripheral(serviceUuid: string, charUuid: string, userId: string): Promise<boolean>;
  stopPeripheral(): Promise<boolean>;
  isSupported(): Promise<boolean>;
}

const { AliveBlePeripheral } = NativeModules as {
  AliveBlePeripheral: AliveBlePeripheralNative | undefined;
};

type AdvertiserState = 'idle' | 'advertising' | 'error';

class BLEAdvertiser {
  private state: AdvertiserState = 'idle';
  private userId: string | null = null;

  /**
   * 광고할 userId 설정
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * BLE Peripheral 광고 시작 — 네이티브 GATT 서버 + 광고 가동
   */
  async startAdvertising(): Promise<boolean> {
    if (!this.userId) {
      logger.warn('[BLE Advertiser] userId가 설정되지 않았습니다');
      return false;
    }

    if (!AliveBlePeripheral) {
      logger.warn('[BLE Advertiser] 네이티브 모듈 없음 (AliveBlePeripheral)');
      this.state = 'error';
      return false;
    }

    try {
      await AliveBlePeripheral.startPeripheral(
        ALIVE_BLE_CONFIG.SERVICE_UUID,
        ALIVE_BLE_CONFIG.CHAR_USER_ID,
        this.userId
      );

      this.state = 'advertising';
      logger.log(
        `[BLE Advertiser] 광고 시작 (${Platform.OS}) — userId: ${this.userId.slice(0, 8)}...`
      );
      return true;
    } catch (err) {
      logger.warn('[BLE Advertiser] 광고 시작 실패:', err);
      this.state = 'error';
      return false;
    }
  }

  /**
   * BLE Peripheral 광고 중지
   */
  async stopAdvertising(): Promise<void> {
    if (!AliveBlePeripheral) {
      this.state = 'idle';
      return;
    }

    try {
      await AliveBlePeripheral.stopPeripheral();
      this.state = 'idle';
      logger.log('[BLE Advertiser] 광고 중지됨');
    } catch (err) {
      logger.warn('[BLE Advertiser] 광고 중지 실패:', err);
      this.state = 'idle';
    }
  }

  /**
   * 현재 광고 상태 반환
   */
  getState(): AdvertiserState {
    return this.state;
  }

  /**
   * 이 기기에서 BLE Peripheral 지원 여부 확인
   */
  static async isPeripheralSupported(): Promise<boolean> {
    if (!AliveBlePeripheral) {
      logger.log('[BLE Advertiser] 네이티브 모듈 없음 — Peripheral 미지원');
      return false;
    }

    try {
      return await AliveBlePeripheral.isSupported();
    } catch {
      return false;
    }
  }
}

export default BLEAdvertiser;
