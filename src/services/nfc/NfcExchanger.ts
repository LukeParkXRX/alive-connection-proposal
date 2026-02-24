/**
 * NfcExchanger - Core NFC Handshake Logic
 *
 * Handles the "Zero-Input" profile exchange between two devices.
 * - iOS: CoreNFC / NameDrop compatible
 * - Android: Android Beam / Near Share compatible
 *
 * @author XRX ALIVE Team
 */

import NfcManager, {
  NfcTech,
  Ndef,
  NfcEvents,
  TagEvent,
} from 'react-native-nfc-manager';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

import type {
  NfcHandshakePayload,
  NfcHandshakeResult,
  ProfileCard,
  LocationData,
} from '@/types';
import LocationService from '@/services/location/LocationService';

import { HCESession, NFCTagType4NDEFContentType, NFCTagType4 } from 'react-native-hce';
import { logger } from '@/lib/logger';

// Protocol version for forward compatibility
const NFC_PROTOCOL_VERSION = '1.0.0';
const ALIVE_NFC_RECORD_TYPE = 'alive.connection/v1';
const ALIVE_BASE_URL = 'https://alive-connection.app/connect';
const ALIVE_HCE_URL_PREFIX = 'alive://connect';

class NfcExchanger {
  private isInitialized = false;
  private successSound: Audio.Sound | null = null;
  private currentProfileCard: ProfileCard | null = null;
  private hceSession: any = null;
  private lastHandshakeTime = 0; // 디바운스: 연속 NFC 이벤트 방지
  private lastHandshakeUserId: string | null = null; // 동일 상대 중복 방지
  private onHandshakeCallback: ((result: NfcHandshakeResult) => void) | null = null;
  private foregroundDispatchActive = false;

  /**
   * Initialize NFC Manager and preload assets
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check if NFC is supported
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        logger.warn('NFC is not supported on this device');
        return false;
      }

      // Start NFC Manager (with retry on Android to ensure Activity is ready)
      if (Platform.OS === 'android') {
        let started = false;
        let retries = 0;
        while (!started && retries < 10) {
          try {
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              await new Promise(resolve => setTimeout(resolve, 200)); // Initial short delay
            }
            await NfcManager.start();
            started = true;
          } catch (e: any) {
            retries++;
            logger.warn(`NFC start failed: ${e?.message || 'unknown error'}, retrying... (${retries}/10)`);
            if (retries >= 10) {
              throw e;
            }
          }
        }

        // Android: 즉시 Foreground Dispatch 활성화하여 "앱 선택" 다이얼로그 방지
        await this.setupAndroidForegroundDispatch();
      } else {
        await NfcManager.start();
      }
      // Preload success sound
      await this.loadSuccessSound();

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize NFC:', error);
      return false;
    }
  }

  /**
   * Check if NFC is currently enabled on the device
   */
  async isNfcEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Set the profile card to be shared during handshake
   */
  setProfileCard(profileCard: ProfileCard): void {
    this.currentProfileCard = profileCard;
  }

  /**
   * Android 전용: Foreground Dispatch를 즉시 활성화.
   * NfcManager.start() 직후 호출하여 OS의 "앱 선택" 다이얼로그를 방지한다.
   * registerTagEvent()는 enableForegroundDispatch를 사용하므로
   * HCE(Card Emulation)와 충돌하지 않는다.
   */
  private async setupAndroidForegroundDispatch(): Promise<void> {
    if (this.foregroundDispatchActive) return;

    NfcManager.setEventListener(NfcEvents.DiscoverTag, async (discoveredTag: TagEvent) => {
      try {
        // 디바운스: 3초 내 중복 이벤트 무시
        const now = Date.now();
        if (now - this.lastHandshakeTime < 3000) return;

        const ndefRecords = discoveredTag.ndefMessage;
        if (!ndefRecords || ndefRecords.length === 0) return;

        for (const record of ndefRecords) {
          if (record.tnf === Ndef.TNF_WELL_KNOWN) {
            try {
              const uri = Ndef.uri.decodePayload(new Uint8Array(record.payload as number[]));
              if (!uri.startsWith(ALIVE_HCE_URL_PREFIX + '/') && !uri.startsWith(ALIVE_BASE_URL + '/')) continue;

              const userId = uri.split('/').pop();
              if (!userId) continue;
              if (userId === this.currentProfileCard?.userId) continue;
              if (userId === this.lastHandshakeUserId && now - this.lastHandshakeTime < 10000) continue;

              this.lastHandshakeTime = now;
              this.lastHandshakeUserId = userId;

              const location = await this.captureLocation();
              await this.triggerSuccessFeedback();

              const result: NfcHandshakeResult = {
                success: true,
                receivedProfile: {
                  userId,
                  displayName: 'ALIVE User',
                  mode: 'business',
                  visibleLinks: {},
                },
                timestamp: new Date().toISOString(),
                location,
              };

              if (this.onHandshakeCallback) {
                this.onHandshakeCallback(result);
              } else {
                logger.log('[NFC] Tag detected but no handshake callback registered yet');
              }
              return;
            } catch { /* URI 파싱 실패 — 다음 레코드 시도 */ }
          }
        }
      } catch (err) {
        logger.error('[NFC] Foreground dispatch error:', err);
      }
    });

    await NfcManager.registerTagEvent();
    this.foregroundDispatchActive = true;
    logger.log('[NFC] Android foreground dispatch activated');
  }

  /**
   * Start listening for NFC handshake
   * This is the main "always ready" mode
   */
  async startHandshakeListener(
    onHandshakeComplete: (result: NfcHandshakeResult) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NFC not initialized. Call initialize() first.');
    }

    if (!this.currentProfileCard) {
      throw new Error('Profile card not set. Call setProfileCard() first.');
    }

    try {
      if (Platform.OS === 'android') {
        // 1. 콜백 등록 (Foreground Dispatch는 initialize()에서 이미 활성화됨)
        this.onHandshakeCallback = onHandshakeComplete;

        // 2. HCE 세션 시작 — 상대방이 읽을 수 있도록 프로필 URL 브로드캐스트
        const url = `${ALIVE_BASE_URL}/${this.currentProfileCard.userId}`;
        const tag = new NFCTagType4({
          type: NFCTagType4NDEFContentType.URL,
          content: url,
          writable: false
        });

        this.hceSession = await HCESession.getInstance();
        await this.hceSession.setApplication(tag);
        await this.hceSession.setEnabled(true);
      } else {
        // Register for tag discovery (iOS and others)
        await (NfcManager as any).registerTagEvent(
          async (tag: TagEvent) => {
            const result = await this.handleTagDiscovered(tag);
            onHandshakeComplete(result);
          },
          'Hold your phone near another ALIVE user',
          {
            alertMessage: 'Ready to connect',
          }
        );
      }
    } catch (error) {
      logger.error('Failed to start NFC listener:', error);
      throw error;
    }
  }

  /**
   * Stop the NFC handshake listener
   */
  async stopHandshakeListener(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        // HCE 정리 (Foreground Dispatch는 유지하여 "앱 선택" 다이얼로그 방지)
        if (this.hceSession) {
          await this.hceSession.setEnabled(false);
          this.hceSession = null;
        }
        // 콜백 & 디바운스 상태 초기화
        this.onHandshakeCallback = null;
        this.lastHandshakeUserId = null;
        this.lastHandshakeTime = 0;
      } else {
        await NfcManager.unregisterTagEvent();
      }
    } catch (error) {
      logger.error('Failed to stop NFC listener:', error);
    }
  }

  /**
   * Perform a single handshake scan (for manual trigger)
   */
  async performHandshake(): Promise<NfcHandshakeResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('NFC not initialized');
    }

    if (!this.currentProfileCard) {
      return this.createErrorResult('Profile card not set');
    }

    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Get the tag
      const tag = await NfcManager.getTag();
      if (!tag) {
        return this.createErrorResult('No tag found');
      }

      return await this.handleTagDiscovered(tag);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(message);
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  /**
   * Handle tag discovery and perform the actual exchange
   */
  private async handleTagDiscovered(tag: TagEvent): Promise<NfcHandshakeResult> {
    const timestamp = new Date().toISOString();

    try {
      // 1. Read incoming data from tag
      const receivedProfile = await this.readProfileFromTag(tag);
      if (!receivedProfile) {
        return this.createErrorResult('Could not read profile from tag');
      }

      // 2. Write our profile to the tag (bidirectional exchange)
      // Android: HCE 양방향 브로드캐스트이므로 쓰기 불필요 (상대폰의 HCE는 read-only)
      if (Platform.OS !== 'android' && this.currentProfileCard) {
        await this.writeProfileToTag(this.currentProfileCard);
      }

      // 3. Get current location for context
      const location = await this.captureLocation();

      // 4. Trigger success feedback
      await this.triggerSuccessFeedback();

      return {
        success: true,
        receivedProfile,
        timestamp,
        location,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Exchange failed';
      return this.createErrorResult(message);
    }
  }

  /**
   * Read profile data from NFC tag
   */
  private async readProfileFromTag(tag: TagEvent): Promise<ProfileCard | null> {
    try {
      const ndefRecords = tag.ndefMessage;
      if (!ndefRecords || ndefRecords.length === 0) {
        return null;
      }

      // Find our custom record type
      for (const record of ndefRecords) {
        if (record.tnf === Ndef.TNF_EXTERNAL_TYPE) {
          const typeString = Ndef.text.decodePayload(
            new Uint8Array(record.type as number[])
          );

          if (typeString === ALIVE_NFC_RECORD_TYPE) {
            const payloadString = Ndef.text.decodePayload(
              new Uint8Array(record.payload as number[])
            );
            const payload: NfcHandshakePayload = JSON.parse(payloadString);
            return payload.profileCard;
          }
        }

        // URI Support (Direct HTTPS links)
        if (record.tnf === Ndef.TNF_WELL_KNOWN && Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
          const uri = Ndef.uri.decodePayload(new Uint8Array(record.payload));
          if (uri.startsWith(ALIVE_BASE_URL + '/') || uri.startsWith(ALIVE_HCE_URL_PREFIX + '/')) {
            const userId = uri.split('/').pop();
            if (userId) {
              // Create a skeleton profile - real data will be fetched from Supabase
              return {
                userId,
                displayName: 'ALIVE User', // Placeholder
                mode: 'business',
                visibleLinks: {},
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to read profile from tag:', error);
      return null;
    }
  }

  /**
   * Write profile data to NFC tag
   */
  private async writeProfileToTag(profileCard: ProfileCard): Promise<boolean> {
    try {
      const url = `${ALIVE_BASE_URL}/${profileCard.userId}`;
      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(url),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to write profile to tag:', error);
      return false;
    }
  }

  /**
   * 현재 GPS 위치 획득 — LocationService 싱글톤에 위임
   */
  private async captureLocation(): Promise<LocationData | undefined> {
    const result = await LocationService.getInstance().getCurrentLocation();
    return result ?? undefined;
  }

  /**
   * Trigger haptic feedback and sound on successful connection
   */
  private async triggerSuccessFeedback(): Promise<void> {
    // Haptic feedback - distinct "connection made" pattern
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Double tap haptic for emphasis
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 100);

    // Play success sound
    await this.playSuccessSound();
  }

  /**
   * Load the success sound asset
   */
  private async loadSuccessSound(): Promise<void> {
    // 사운드 파일이 아직 없으므로 스킵 (추후 추가 시 require 활성화)
    logger.log('[NFC] Success sound skipped (asset not yet added)');
  }

  /**
   * Play the success sound
   */
  private async playSuccessSound(): Promise<void> {
    try {
      if (this.successSound) {
        await this.successSound.replayAsync();
      }
    } catch (error) {
      logger.log('Could not play success sound');
    }
  }

  /**
   * Create an error result object
   */
  private createErrorResult(error: string): NfcHandshakeResult {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopHandshakeListener();

      // Android: Foreground Dispatch 해제 (앱 완전 종료 시에만)
      if (Platform.OS === 'android' && this.foregroundDispatchActive) {
        try {
          NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
          await NfcManager.unregisterTagEvent();
          this.foregroundDispatchActive = false;
        } catch (e) {
          logger.warn('[NFC] Foreground dispatch cleanup warning:', e);
        }
      }

      if (this.successSound) {
        await this.successSound.unloadAsync();
      }
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }
}

// Export singleton instance
export const nfcExchanger = new NfcExchanger();
export default NfcExchanger;
