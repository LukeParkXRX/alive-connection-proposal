/**
 * ExchangeManager — 통합 교환 조율 싱글톤
 *
 * BLE (Primary) + NFC (Boost) + QR (Fallback) 모든 교환 방식 통합 관리.
 * DEV_CONTEXT.md 아키텍처 기준 구현.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import BLEExchangeService from '../ble/BLEExchangeService';
import NFCExchangeService from '../nfc/NFCExchangeService';
import { supabase } from '../supabase';
import { mapDbUserToProfile } from '../supabase/mappers';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExchangeEvent, ExchangeMethod, CreateExchangeRequest } from '@/types/ble';
import type { ProfileCard, LocationData, Connection, UserProfile } from '@/types';

type ExchangeListener = (event: ExchangeEvent) => void;

class ExchangeManager {
  private static instance: ExchangeManager;

  private bleService: BLEExchangeService;
  private nfcService: NFCExchangeService;
  private listeners: ExchangeListener[] = [];
  private bleCleanup: (() => void) | null = null;
  private nfcCleanup: (() => void) | null = null;
  private isActive = false;

  private constructor() {
    this.bleService = new BLEExchangeService();
    this.nfcService = new NFCExchangeService();
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): ExchangeManager {
    if (!this.instance) {
      this.instance = new ExchangeManager();
    }
    return this.instance;
  }

  /**
   * 교환 모드 시작 (홈 화면 진입 시 호출)
   * BLE 스캔 + NFC 리스닝 동시 시작
   */
  async startExchangeMode(userId: string, profileCard: ProfileCard): Promise<boolean> {
    if (this.isActive) {
      console.log('[ExchangeManager] Already active');
      return true;
    }

    let anyStarted = false;

    // 1. BLE 발견 시작 (Primary Layer)
    try {
      const bleStarted = await this.bleService.startDiscovery(userId);
      if (bleStarted) {
        this.bleCleanup = this.bleService.on((event: ExchangeEvent) => {
          this.handleExchangeEvent(event);
        });
        anyStarted = true;
        console.log('[ExchangeManager] BLE layer started');
      }
    } catch (err) {
      console.warn('[ExchangeManager] BLE 시작 실패:', err);
    }

    // 2. NFC 리스너 시작 (Boost Layer — 가능한 기기만)
    try {
      const nfcSupported = await this.nfcService.isSupported();
      if (nfcSupported) {
        const nfcStarted = await this.nfcService.startListening(profileCard);
        if (nfcStarted) {
          this.nfcCleanup = this.nfcService.on((event: ExchangeEvent) => {
            this.handleExchangeEvent(event);
          });
          anyStarted = true;
          console.log('[ExchangeManager] NFC layer started');
        }
      }
    } catch (err) {
      console.warn('[ExchangeManager] NFC 시작 실패:', err);
    }

    this.isActive = anyStarted;
    return anyStarted;
  }

  /**
   * 교환 모드 중지
   */
  stopExchangeMode(): void {
    this.bleService.stopDiscovery();
    this.nfcService.stopListening();

    if (this.bleCleanup) {
      this.bleCleanup();
      this.bleCleanup = null;
    }
    if (this.nfcCleanup) {
      this.nfcCleanup();
      this.nfcCleanup = null;
    }

    this.isActive = false;
    console.log('[ExchangeManager] Exchange mode stopped');
  }

  /**
   * 교환 수락 — 서버에 기록 + 상대 프로필 조회
   */
  async acceptExchange(partnerId: string, method: ExchangeMethod): Promise<Connection | null> {
    try {
      // 1. GPS 위치 획득
      const location = await this.captureLocation();

      // 2. 내 DB 유저 정보
      const myUser = useAuthStore.getState().dbUser;
      if (!myUser) {
        console.warn('[ExchangeManager] 로그인된 유저 없음');
        return null;
      }

      // 3. 상대방 프로필 조회 (Supabase)
      let targetUser: UserProfile;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', partnerId)
          .single();

        if (error || !data) {
          console.warn('[ExchangeManager] 상대방 조회 실패:', error);
          targetUser = this.createSkeletonProfile(partnerId);
        } else {
          targetUser = mapDbUserToProfile(data);
        }
      } catch {
        targetUser = this.createSkeletonProfile(partnerId);
      }

      // 4. Supabase interactions 테이블에 저장
      const metAt = new Date().toISOString();
      const { data: interactionData, error: insertError } = await supabase
        .from('interactions')
        .insert({
          source_user_id: myUser.id,
          target_user_id: partnerId,
          met_at: metAt,
          exchange_method: method,
          location_lat: location?.latitude || 0,
          location_lng: location?.longitude || 0,
          location_address: location?.address || null,
          location_place_name: location?.placeName || null,
          location_city: location?.city || null,
          location_country: location?.country || null,
          status: 'active',
        })
        .select()
        .single();

      const interactionId = interactionData?.id || `local_${Date.now()}`;
      if (insertError) {
        console.warn('[ExchangeManager] Interaction 저장 실패:', insertError);
      }

      // 5. Connection 객체 생성
      const connection: Connection = {
        user: targetUser,
        interaction: {
          id: interactionId,
          sourceUserId: myUser.id,
          targetUserId: partnerId,
          metAt,
          location: location || { latitude: 0, longitude: 0 },
          createdAt: metAt,
          updatedAt: metAt,
        },
      };

      // 6. 완료 이벤트 발행
      this.emit({
        type: 'completed',
        partnerId,
        method,
        data: connection,
      });

      return connection;
    } catch (err) {
      console.error('[ExchangeManager] Exchange accept failed:', err);
      this.emit({
        type: 'error',
        partnerId,
        method,
        error: (err as Error).message,
      });
      return null;
    }
  }

  /**
   * GPS 위치 캡처
   */
  private async captureLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address
          ? `${address.street || ''} ${address.city || ''}`.trim()
          : undefined,
        placeName: address?.name || undefined,
        city: address?.city || undefined,
        country: address?.country || undefined,
      };
    } catch (err) {
      console.warn('[ExchangeManager] 위치 캡처 실패:', err);
      return null;
    }
  }

  /**
   * 스켈레톤 프로필 생성 (DB 조회 실패 시)
   */
  private createSkeletonProfile(userId: string): UserProfile {
    const now = new Date().toISOString();
    return {
      id: userId,
      name: `User ${userId.slice(0, 8)}`,
      socialLinks: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 교환 이벤트 처리 (BLE/NFC → 통합)
   */
  private handleExchangeEvent(event: ExchangeEvent): void {
    console.log(`[ExchangeManager] Event: ${event.type} via ${event.method || 'unknown'}`);
    this.emit(event);
  }

  /**
   * 이벤트 리스너 등록
   */
  on(listener: ExchangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: ExchangeEvent): void {
    this.listeners.forEach(l => l(event));
  }

  /**
   * 현재 교환 모드 활성 여부
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    this.stopExchangeMode();
    this.bleService.destroy();
    this.nfcService.cleanup();
    this.listeners = [];
  }
}

export default ExchangeManager;
