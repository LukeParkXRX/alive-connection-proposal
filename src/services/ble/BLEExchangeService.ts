/**
 * BLEExchangeService — BLE Scanner + Advertiser 통합 서비스
 *
 * 광고(Advertising)와 스캔(Scanning)을 분리하여:
 * - 광고: 앱 진입 시 자동 시작 (상대가 나를 발견 가능)
 * - 스캔: 사용자가 버튼을 누를 때만 시작 (내가 상대를 탐색)
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
  /** 현재 광고 중인지 여부 */
  private _isAdvertising = false;

  constructor() {
    this.manager = new BleManager();
    this.scanner = new BLEScanner(this.manager);
    this.advertiser = new BLEAdvertiser();
  }

  /** 현재 BLE 상태 */
  getState(): BLEState {
    return this.state;
  }

  /** 스캔 전용 모드 여부 */
  isScanOnlyMode(): boolean {
    return this.scanOnlyMode;
  }

  /** 현재 광고 중인지 */
  isAdvertising(): boolean {
    return this._isAdvertising;
  }

  // ─── 권한 요청 ───

  /**
   * BLE + 위치 권한 일괄 요청 (앱 시작 시 호출)
   * Android 12+ → BLUETOOTH_SCAN, BLUETOOTH_CONNECT, BLUETOOTH_ADVERTISE
   * Android 6-11 → ACCESS_FINE_LOCATION
   */
  async requestAllPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version;

      if (typeof apiLevel === 'number' && apiLevel >= 31) {
        // Android 12+ — BLE 권한 3종
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);

        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          logger.warn('[BLE Service] 일부 BLE 권한 거부됨:', results);
        }

        // 위치 권한도 요청 (BLE 스캔에 필요)
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: '위치 권한',
            message: '주변 기기를 탐색하기 위해 위치 권한이 필요합니다.',
            buttonPositive: '허용',
            buttonNegative: '거부',
          }
        );

        return allGranted && locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }

      // Android 6-11 — 위치 권한만 필요
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: '위치 권한',
          message: 'BLE 기기를 탐색하기 위해 위치 권한이 필요합니다.',
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

  // ─── 광고 (자동 시작) ───

  /**
   * BLE 광고만 시작 — 다른 기기가 나를 발견할 수 있게 함
   * 화면 진입 시 자동 호출됨
   */
  async startAdvertising(userId: string): Promise<boolean> {
    try {
      // BLE 상태 체크
      const bleState = await this.manager.state();
      if (bleState !== State.PoweredOn) {
        logger.warn('[BLE Service] Bluetooth가 켜져있지 않습니다:', bleState);
        this.emit({ type: 'error', error: `Bluetooth 상태: ${bleState}` });
        return false;
      }

      // 광고 권한 체크 (Android 12+)
      this.scanOnlyMode = false;
      if (Platform.OS === 'android') {
        const apiLevel = Platform.Version;
        if (typeof apiLevel === 'number' && apiLevel >= 31) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
          );
          if (!granted) {
            logger.warn('[BLE Service] 광고 권한 없음 → 스캔 전용 모드');
            this.scanOnlyMode = true;
            return false;
          }
        }
      }

      // Advertiser 시작
      this.advertiser.setUserId(userId);
      const started = await this.advertiser.startAdvertising();

      if (started) {
        this._isAdvertising = true;
        this.setState(BLEState.ADVERTISING);
        logger.log('[BLE Service] 광고 시작 — 다른 기기가 나를 발견 가능');
        return true;
      }

      logger.warn('[BLE Service] 광고 시작 실패');
      this.scanOnlyMode = true;
      return false;
    } catch (err) {
      logger.error('[BLE Service] 광고 시작 실패:', err);
      return false;
    }
  }

  /** 광고 중지 */
  stopAdvertising(): void {
    this.advertiser.stopAdvertising();
    this._isAdvertising = false;
    logger.log('[BLE Service] 광고 중지');
  }

  // ─── 스캔 (수동 시작) ───

  /**
   * BLE 스캔만 시작 — 근처 기기를 탐색
   * 사용자가 버튼을 누를 때 호출됨
   */
  async startScanning(): Promise<boolean> {
    try {
      const bleState = await this.manager.state();
      if (bleState !== State.PoweredOn) {
        logger.warn('[BLE Service] 스캔 불가 — Bluetooth가 꺼져있습니다');
        this.emit({ type: 'error', error: 'Bluetooth를 켜주세요' });
        return false;
      }

      // 기존 리스너 정리
      if (this.scannerCleanup) {
        this.scannerCleanup();
        this.scannerCleanup = null;
      }

      // 발견 리스너 등록 + 스캔 시작
      this.scannerCleanup = this.scanner.onDeviceDiscovered(
        (device: DiscoveredDevice) => {
          this.handleDeviceDiscovered(device);
        }
      );

      await this.scanner.startScanning();
      this.setState(BLEState.SCANNING);
      logger.log('[BLE Service] 스캔 시작 — 근처 기기 탐색 중');
      return true;
    } catch (err) {
      logger.error('[BLE Service] 스캔 시작 실패:', err);
      this.emit({ type: 'error', error: (err as Error).message });
      return false;
    }
  }

  /** 스캔만 중지 (광고는 유지) */
  stopScanning(): void {
    this.scanner.stopScanning();

    if (this.scannerCleanup) {
      this.scannerCleanup();
      this.scannerCleanup = null;
    }

    // 광고 중이면 ADVERTISING, 아니면 IDLE
    this.setState(this._isAdvertising ? BLEState.ADVERTISING : BLEState.IDLE);
    logger.log('[BLE Service] 스캔 중지');
  }

  // ─── 통합 메서드 (하위 호환) ───

  /**
   * 스캔 + 광고 동시 시작 (기존 호환용)
   */
  async startDiscovery(userId: string): Promise<boolean> {
    await this.startAdvertising(userId);
    return this.startScanning();
  }

  /** 스캔 + 광고 모두 중지 */
  stopDiscovery(): void {
    this.scanner.stopScanning();
    this.advertiser.stopAdvertising();
    this._isAdvertising = false;

    if (this.scannerCleanup) {
      this.scannerCleanup();
      this.scannerCleanup = null;
    }

    this.setState(BLEState.IDLE);
    logger.log('[BLE Service] Discovery 전체 중지');
  }

  // ─── 이벤트 처리 ───

  /** 기기 발견 시 이벤트 타입 결정 + 리스너에 전달 */
  private handleDeviceDiscovered(device: DiscoveredDevice): void {
    this.setState(BLEState.DISCOVERED);

    // 매우 가까운 경우(~10cm) → 교환 요청 (자동 트리거)
    // 그 외(~30cm) → 발견 이벤트
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
