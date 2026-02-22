/**
 * BLEExchangeService — BLE Scanner + Advertiser 통합 서비스
 * BLE 상태 머신 관리 + EventEmitter 패턴
 */

import { BleManager, State } from 'react-native-ble-plx';
import { ALIVE_BLE_CONFIG, BLEState } from '@/constants/ble';
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

  constructor() {
    this.manager = new BleManager();
    this.scanner = new BLEScanner(this.manager);
    this.advertiser = new BLEAdvertiser();
  }

  /**
   * 현재 BLE 상태
   */
  getState(): BLEState {
    return this.state;
  }

  /**
   * BLE 발견 모드 시작 (스캔 + 광고 동시)
   */
  async startDiscovery(userId: string): Promise<boolean> {
    try {
      // BLE 상태 체크
      const bleState = await this.manager.state();
      if (bleState !== State.PoweredOn) {
        console.warn('[BLE Service] Bluetooth not powered on:', bleState);
        this.setState(BLEState.ERROR);
        this.emit({ type: 'error', error: `Bluetooth is ${bleState}` });
        return false;
      }

      // 1. Advertiser 시작 (userId 설정)
      this.advertiser.setUserId(userId);
      await this.advertiser.startAdvertising();
      this.setState(BLEState.ADVERTISING);

      // 2. Scanner 시작 + 발견 리스너 등록
      this.scannerCleanup = this.scanner.onDeviceDiscovered((device: DiscoveredDevice) => {
        this.handleDeviceDiscovered(device);
      });

      await this.scanner.startScanning();
      this.setState(BLEState.SCANNING);

      console.log('[BLE Service] Discovery started — scanning + advertising');
      return true;
    } catch (err) {
      console.warn('[BLE Service] Failed to start discovery:', err);
      this.setState(BLEState.ERROR);
      this.emit({ type: 'error', error: (err as Error).message });
      return false;
    }
  }

  /**
   * BLE 발견 모드 중지
   */
  stopDiscovery(): void {
    this.scanner.stopScanning();
    this.advertiser.stopAdvertising();

    if (this.scannerCleanup) {
      this.scannerCleanup();
      this.scannerCleanup = null;
    }

    this.setState(BLEState.IDLE);
    console.log('[BLE Service] Discovery stopped');
  }

  /**
   * 기기 발견 시 처리
   */
  private handleDeviceDiscovered(device: DiscoveredDevice): void {
    this.setState(BLEState.DISCOVERED);

    const event: ExchangeEvent = {
      type: device.isVeryClose ? 'request' : 'discovered',
      partnerId: device.userId,
      method: 'ble',
      data: {
        rssi: device.rssi,
        localName: device.localName,
        isVeryClose: device.isVeryClose,
      },
    };

    this.emit(event);

    // 자동 교환 트리거 (매우 가까운 경우)
    if (device.isVeryClose) {
      console.log(`[BLE Service] Very close device detected (RSSI: ${device.rssi}) — auto exchange trigger`);
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  on(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 이벤트 발행
   */
  private emit(event: ExchangeEvent): void {
    this.listeners.forEach(l => l(event));
  }

  /**
   * 상태 변경
   */
  private setState(newState: BLEState): void {
    const prev = this.state;
    this.state = newState;
    if (prev !== newState) {
      console.log(`[BLE Service] State: ${prev} → ${newState}`);
    }
  }

  /**
   * BLE 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    try {
      const state = await this.manager.state();
      return state === State.PoweredOn;
    } catch {
      return false;
    }
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopDiscovery();
    this.listeners = [];
    this.manager.destroy();
  }
}

export default BLEExchangeService;
