/**
 * NFCExchangeService — NFC 교환 서비스 (v2 인터페이스 래퍼)
 *
 * 기존 NfcExchanger를 래핑하여 ExchangeManager 호환 인터페이스 제공.
 * NFC는 v2 Hybrid Architecture에서 보조 레이어 (Layer 3 — Boost).
 */

import { nfcExchanger } from './NfcExchanger';
import type { ExchangeEvent } from '@/types/ble';
import type { ProfileCard, NfcHandshakeResult } from '@/types';

type EventListener = (event: ExchangeEvent) => void;

class NFCExchangeService {
  private listeners: EventListener[] = [];
  private isListening = false;

  /**
   * NFC 지원 여부 확인
   */
  async isSupported(): Promise<boolean> {
    try {
      await nfcExchanger.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * NFC 리스닝 시작 (HCE + Tag Reader)
   */
  async startListening(profileCard: ProfileCard): Promise<boolean> {
    try {
      const initialized = await nfcExchanger.initialize();
      if (!initialized) {
        console.warn('[NFC Service] NFC 초기화 실패');
        return false;
      }

      nfcExchanger.setProfileCard(profileCard);

      await nfcExchanger.startHandshakeListener((result: NfcHandshakeResult) => {
        this.handleNfcResult(result);
      });

      this.isListening = true;
      console.log('[NFC Service] NFC 리스닝 시작');
      return true;
    } catch (err) {
      console.warn('[NFC Service] 리스닝 시작 실패:', err);
      return false;
    }
  }

  /**
   * NFC 리스닝 중지
   */
  async stopListening(): Promise<void> {
    try {
      await nfcExchanger.stopHandshakeListener();
      this.isListening = false;
      console.log('[NFC Service] NFC 리스닝 중지');
    } catch (err) {
      console.warn('[NFC Service] 리스닝 중지 실패:', err);
    }
  }

  /**
   * NFC 결과를 ExchangeEvent로 변환하여 발행
   */
  private handleNfcResult(result: NfcHandshakeResult): void {
    if (result.success && result.receivedProfile) {
      const event: ExchangeEvent = {
        type: 'request',
        partnerId: result.receivedProfile.userId,
        method: 'nfc',
        data: {
          displayName: result.receivedProfile.displayName,
          location: result.location,
          timestamp: result.timestamp,
        },
      };
      this.emit(event);
    } else {
      const event: ExchangeEvent = {
        type: 'error',
        method: 'nfc',
        error: result.error || 'NFC 교환 실패',
      };
      this.emit(event);
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

  private emit(event: ExchangeEvent): void {
    this.listeners.forEach(l => l(event));
  }

  /**
   * 현재 리스닝 상태
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * 리소스 정리
   */
  async cleanup(): Promise<void> {
    await this.stopListening();
    await nfcExchanger.cleanup();
    this.listeners = [];
  }
}

export default NFCExchangeService;
