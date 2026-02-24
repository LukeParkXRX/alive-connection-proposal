/**
 * ExchangeManager — 통합 교환 조율 싱글톤
 *
 * BLE (Primary) + QR (Fallback) 교환 방식 통합 관리.
 */

import { logger } from '@/lib/logger';
import BLEExchangeService from '../ble/BLEExchangeService';
import { supabase } from '../supabase';
import { mapDbUserToProfile, createSkeletonProfile } from '../supabase/mappers';
import LocationService from '../location/LocationService';
import { useAuthStore } from '@/store/useAuthStore';
import type { ExchangeEvent, ExchangeMethod } from '@/types/ble';
import type { ProfileCard, LocationData, Connection, UserProfile } from '@/types';

type ExchangeListener = (event: ExchangeEvent) => void;

class ExchangeManager {
  private static instance: ExchangeManager;

  private bleService: BLEExchangeService;
  private listeners: ExchangeListener[] = [];
  private bleCleanup: (() => void) | null = null;
  private isActive = false;

  private constructor() {
    this.bleService = new BLEExchangeService();
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
   * 교환 모드 시작 — BLE 스캔 + 광고 동시 시작
   */
  async startExchangeMode(userId: string, _profileCard: ProfileCard): Promise<boolean> {
    if (this.isActive) {
      logger.log('[ExchangeManager] 이미 활성 상태');
      return true;
    }

    try {
      const bleStarted = await this.bleService.startDiscovery(userId);
      if (bleStarted) {
        this.bleCleanup = this.bleService.on((event: ExchangeEvent) => {
          this.handleExchangeEvent(event);
        });
        this.isActive = true;
        logger.log('[ExchangeManager] BLE 교환 모드 시작됨');
        return true;
      }

      logger.warn('[ExchangeManager] BLE 시작 실패');
      return false;
    } catch (err) {
      logger.warn('[ExchangeManager] 교환 모드 시작 실패:', err);
      return false;
    }
  }

  /**
   * 교환 모드 중지
   */
  stopExchangeMode(): void {
    this.bleService.stopDiscovery();

    if (this.bleCleanup) {
      this.bleCleanup();
      this.bleCleanup = null;
    }

    this.isActive = false;
    logger.log('[ExchangeManager] 교환 모드 중지됨');
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
        logger.warn('[ExchangeManager] 로그인된 유저 없음');
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
          logger.warn('[ExchangeManager] 상대방 조회 실패:', error);
          targetUser = createSkeletonProfile(partnerId);
        } else {
          targetUser = mapDbUserToProfile(data);
        }
      } catch {
        targetUser = createSkeletonProfile(partnerId);
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
        logger.warn('[ExchangeManager] Interaction 저장 실패:', insertError);
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
      logger.error('[ExchangeManager] 교환 수락 실패:', err);
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
   * GPS 위치 캡처 — LocationService 싱글톤에 위임
   */
  private async captureLocation(): Promise<LocationData | null> {
    return LocationService.getInstance().getCurrentLocation();
  }

  /**
   * 교환 이벤트 처리 (BLE → 통합)
   */
  private handleExchangeEvent(event: ExchangeEvent): void {
    logger.log(`[ExchangeManager] Event: ${event.type} via ${event.method || 'unknown'}`);
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
    this.listeners = [];
  }
}

export default ExchangeManager;
