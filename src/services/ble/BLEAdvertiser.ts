/**
 * BLEAdvertiser — BLE Peripheral 모드 광고 서비스
 *
 * 현재 MVP: react-native-ble-plx는 Peripheral 미지원이므로,
 * 이 모듈은 추후 네이티브 브릿지 구현 시의 인터페이스를 정의합니다.
 *
 * Phase 2 확장:
 * - Android: BluetoothLeAdvertiser 네이티브 모듈
 * - iOS: CBPeripheralManager 네이티브 브릿지
 */

import { Platform } from 'react-native';
import { ALIVE_BLE_CONFIG } from '@/constants/ble';

type AdvertiserState = 'idle' | 'advertising' | 'error';

class BLEAdvertiser {
  private state: AdvertiserState = 'idle';
  private userId: string | null = null;

  /**
   * userId를 base64로 인코딩 (BLE characteristic value 용)
   */
  static encodeUserId(userId: string): string {
    // Simple base64 encode for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    while (i < userId.length) {
      const a = userId.charCodeAt(i++);
      const b = i < userId.length ? userId.charCodeAt(i++) : 0;
      const c = i < userId.length ? userId.charCodeAt(i++) : 0;
      const bitmap = (a << 16) | (b << 8) | c;
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < userId.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < userId.length ? chars.charAt(bitmap & 63) : '=';
    }
    return result;
  }

  /**
   * Set the userId to advertise
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Start BLE Peripheral advertising
   *
   * MVP: 현재는 로그만 남기고 no-op
   * 실제 광고는 네이티브 모듈 구현 후 활성화
   */
  async startAdvertising(): Promise<boolean> {
    if (!this.userId) {
      console.warn('[BLE Advertiser] userId not set');
      return false;
    }

    try {
      // TODO: Phase 2 — 네이티브 Peripheral 모듈 구현
      // Android: BluetoothLeAdvertiser.startAdvertising()
      // iOS: CBPeripheralManager.startAdvertising()

      console.log(`[BLE Advertiser] Advertising started (${Platform.OS}) — userId: ${this.userId.slice(0, 8)}...`);
      console.log(`[BLE Advertiser] Service UUID: ${ALIVE_BLE_CONFIG.SERVICE_UUID}`);
      console.log('[BLE Advertiser] NOTE: True BLE Peripheral requires native module — using scan-only mode for MVP');

      this.state = 'advertising';
      return true;
    } catch (err) {
      console.warn('[BLE Advertiser] Failed to start:', err);
      this.state = 'error';
      return false;
    }
  }

  /**
   * Stop BLE Peripheral advertising
   */
  async stopAdvertising(): Promise<void> {
    try {
      // TODO: Stop native advertising
      this.state = 'idle';
      console.log('[BLE Advertiser] Stopped advertising');
    } catch (err) {
      console.warn('[BLE Advertiser] Failed to stop:', err);
    }
  }

  /**
   * Get current advertiser state
   */
  getState(): AdvertiserState {
    return this.state;
  }

  /**
   * Check if BLE Peripheral is supported on this device
   */
  static async isPeripheralSupported(): Promise<boolean> {
    // TODO: Check native capability
    // For now, return false since we don't have native module yet
    console.log('[BLE Advertiser] Peripheral mode: native module not yet implemented');
    return false;
  }
}

export default BLEAdvertiser;
