/**
 * BLEExchangeService — BLE Scanner + Advertiser 통합 서비스
 *
 * BLE 상태 머신 관리 + EventEmitter 패턴.
 * 광고 실패 시 스캔 전용 모드로 자동 폴백합니다.
 */

import { BleManager, State } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { logger } from '@/lib/logger';
import { BLEState } from '@/constants/ble';
import BLEScanner from './BLEScanner';
import BLEAdvertiser from './BLEAdvertiser';
import type { DiscoveredDevice, ExchangeEvent } from '@/types/ble';

type EventListener = (event: ExchangeEvent) => void;

class BLEExchangeService {
  private manager: BleManager;
  private scanner: BLEScanner;
  private advertiser: BLEAdvertiser;
  private state: BLEState = BLEState.IDLE;
  private listeners: EventListener[] = [];
  private scannerCleanup: (() => void) | null = null;
  /** 광고 불가 시 true — 스캔만으로 동작 */
  private scanOnlyMode = false;

  constructor() {
    this.manager = new BleManager();
    this.scanner = new BLEScanner(this.manager);
    this.advertiser = new BLEAdvertiser();
  }

  /** 현재 BLE 상태 */
  getState(): BLEState {
    return this.state;
  }

  /** 스캔 전용 모드 여부 (광고 권한 거부 또는 미지원 시 true) */
  isScanOnlyMode(): boolean {
    return this.scanOnlyMode;
  }

  /**
   * BLE 발견 모드 시작 (스캔 + 광고 동시)
   *
   * 1. BLE 상태(PoweredOn) 확인
   * 2. Android 12+ 런타임 권한 확인
   * 3. Advertiser 시작 → 실패 시 스캔 전용 모드로 폴백
   * 4. Scanner 시작
   */
  async startDiscovery(userId: string): Promise<boolean> {
    try {
      // BLE 상태 체크
      const bleState = await this.manager.state();
      if (bleState !== State.PoweredOn) {
        logger.warn('[BLE Service] Bluetooth가 켜져있지 않습니다:', bleState);
        this.setState(BLEState.ERROR);
        this.emit({ type: 'error', error: `Bluetooth 상태: ${bleState}` });
        return false;
      }

      // 1. Android 12+ BLE 광고 런타임 권한 확인
      this.scanOnlyMode = false;
      const hasPermission = await this.requestAdvertisePermission();
      if (!hasPermission) {
        logger.warn('[BLE Service] 광고 권한 거부 → 스캔 전용 모드로 전환');
        this.scanOnlyMode = true;
      }

      // 2. Advertiser 시작 (권한 있을 때만)
      if (!this.scanOnlyMode) {
        this.advertiser.setUserId(userId);
        const advertisingStarted = await this.advertiser.startAdvertising();

        if (advertisingStarted) {
          this.setState(BLEState.ADVERTISING);
          logger.log('[BLE Service] 광고 시작 — 다른 기기가 나를 발견 가능');
        } else {
          // 광고 실패해도 스캔은 진행
          logger.warn('[BLE Service] 광고 시작 실패 → 스캔 전용 모드로 폴백');
          this.scanOnlyMode = true;
        }
      }

      // 3. Scanner 시작 + 발견 리스너 등록
      this.scannerCleanup = this.scanner.onDeviceDiscovered(
        (device: DiscoveredDevice) => {
          this.handleDeviceDiscovered(device);
        }
      );

      await this.scanner.startScanning();
      this.setState(BLEState.SCANNING);

      const modeLabel = this.scanOnlyMode ? '스캔 전용' : '스캔 + 광고';
      logger.log(`[BLE Service] Discovery 시작 — ${modeLabel} 모드`);
      return true;
    } catch (err) {
      logger.error('[BLE Service] Discovery 시작 실패:', err);
      this.setState(BLEState.ERROR);
      this.emit({ type: 'error', error: (err as Error).message });
      return false;
    }
  }

  /** BLE 발견 모드 중지 */
  stopDiscovery(): void {
    this.scanner.stopScanning();
    this.advertiser.stopAdvertising();

    if (this.scannerCleanup) {
      this.scannerCleanup();
      this.scannerCleanup = null;
    }

    this.setState(BLEState.IDLE);
    logger.log('[BLE Service] Discovery 중지');
  }

  // ─── 권한 요청 ───

  /**
   * Android 12+ (API 31) BLUETOOTH_ADVERTISE 런타임 권한 요청
   * iOS 및 Android 11 이하에서는 항상 true 반환
   */
  private async requestAdvertisePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;
      if (typeof apiLevel === 'number' && apiLevel < 31) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        {
          title: 'BLE 광고 권한',
          message: '근처 사용자에게 나를 알리기 위해 Bluetooth 광고 권한이 필요합니다.',
          buttonPositive: '허용',
          buttonNegative: '거부',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      logger.error('[BLE Service] 권한 요청 실패:', err);
      return false;
    }
  }

  // ─── 이벤트 처리 ───

  /** 기기 발견 시 이벤트 타입 결정 + 리스너에 전달 */
  private handleDeviceDiscovered(device: DiscoveredDevice): void {
    this.setState(BLEState.DISCOVERED);

    // 매우 가까운 경우(~10cm) → 교환 요청 (자동 트리거)
    // 그 외(~30cm) → 발견 이벤트 (수동 교환)
    if (device.isVeryClose) {
      this.emit({
        type: 'request',
        partnerId: device.userId,
        method: 'ble',
        data: {
          rssi: device.rssi,
          localName: device.localName,
          isVeryClose: device.isVeryClose,
        },
      });
      logger.log(
        `[BLE Service] 매우 가까운 기기 감지 (RSSI: ${device.rssi}) — 자동 교환 트리거`
      );
    } else {
      this.emit({
        type: 'discovered',
        partnerId: device.userId,
        method: 'ble',
        data: {
          rssi: device.rssi,
          localName: device.localName,
          isVeryClose: device.isVeryClose,
        },
      });
    }
  }

  /** 이벤트 리스너 등록. 반환값: 해제 함수 */
  on(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: ExchangeEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  private setState(newState: BLEState): void {
    const prev = this.state;
    this.state = newState;
    if (prev !== newState) {
      logger.log(`[BLE Service] 상태: ${prev} → ${newState}`);
    }
  }

  /** BLE 사용 가능 여부 확인 */
  async isAvailable(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      return state === State.PoweredOn;
    } catch {
      return false;
    }
  }

  /** 리소스 정리 (앱 종료 시 호출) */
  destroy(): void {
    this.stopDiscovery();
    this.listeners = [];
    this.manager.destroy();
  }
}

export default BLEExchangeService;
