/**
 * BLEScanner — BLE Central 모드 스캐너
 * ALIVE Connection 앱 사용자를 BLE로 탐색
 */

import { BleManager, Device, State } from 'react-native-ble-plx';
import { ALIVE_BLE_CONFIG } from '@/constants/ble';
import type { DiscoveredDevice } from '@/types/ble';
import { Platform } from 'react-native';

type DeviceCallback = (device: DiscoveredDevice) => void;

/**
 * Base64 decode helper for React Native (atob alternative)
 */
function base64Decode(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  const str = base64.replace(/[^A-Za-z0-9+/=]/g, '');

  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output += String.fromCharCode(chr1);
    if (enc3 !== 64) output += String.fromCharCode(chr2);
    if (enc4 !== 64) output += String.fromCharCode(chr3);
  }

  return output;
}

class BLEScanner {
  private manager: BleManager;
  private isActive = false;
  private discoveredCache: Map<string, number> = new Map(); // deviceId → timestamp
  private listeners: DeviceCallback[] = [];
  private scanSubscription: any = null;

  constructor(manager: BleManager) {
    this.manager = manager;
  }

  async startScanning(): Promise<void> {
    // 1. Check BLE state
    const state = await this.manager.state();
    if (state !== State.PoweredOn) {
      console.warn('[BLE Scanner] Bluetooth is not powered on:', state);
      return;
    }

    // 2. Request permissions (Android)
    if (Platform.OS === 'android') {
      // react-native-ble-plx handles permission requests internally
    }

    // 3. Clean stale cache entries
    this.cleanCache();

    // 4. Start scanning with service UUID filter
    this.isActive = true;
    this.manager.startDeviceScan(
      [ALIVE_BLE_CONFIG.SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.warn('[BLE Scanner] Scan error:', error.message);
          return;
        }
        if (device) {
          this.handleDeviceDiscovered(device);
        }
      }
    );

    console.log('[BLE Scanner] Started scanning for ALIVE devices');
  }

  stopScanning(): void {
    this.isActive = false;
    this.manager.stopDeviceScan();
    console.log('[BLE Scanner] Stopped scanning');
  }

  onDeviceDiscovered(callback: DeviceCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private async handleDeviceDiscovered(device: Device): Promise<void> {
    const rssi = device.rssi ?? -100;

    // Filter by RSSI threshold
    if (rssi < ALIVE_BLE_CONFIG.RSSI_THRESHOLD) {
      return;
    }

    // Check duplicate cache
    const cacheKey = device.id;
    const cached = this.discoveredCache.get(cacheKey);
    if (cached && Date.now() - cached < ALIVE_BLE_CONFIG.DISCOVERY_CACHE_TTL) {
      return; // Already discovered recently
    }

    try {
      // Connect and read userId from GATT
      const userId = await this.readUserIdFromDevice(device);
      if (!userId) return;

      // Cache this discovery
      this.discoveredCache.set(cacheKey, Date.now());

      const discovered: DiscoveredDevice = {
        id: device.id,
        userId,
        rssi,
        localName: device.localName || device.name || undefined,
        discoveredAt: Date.now(),
        isVeryClose: rssi > ALIVE_BLE_CONFIG.RSSI_VERY_CLOSE,
      };

      // Notify listeners
      this.listeners.forEach(cb => cb(discovered));
    } catch (err) {
      console.warn('[BLE Scanner] Failed to read device:', err);
    }
  }

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

      // Decode base64 value to string using RN-compatible decoder
      const decoded = base64Decode(characteristic.value);
      return decoded || null;
    } catch (err) {
      console.warn('[BLE Scanner] GATT read failed:', (err as Error).message);
      return null;
    } finally {
      try {
        if (connected) {
          await connected.cancelConnection();
        }
      } catch {
        /* ignore disconnect errors */
      }
    }
  }

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
