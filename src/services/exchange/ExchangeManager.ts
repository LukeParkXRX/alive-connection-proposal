/**
 * ExchangeManager — 통합 교환 조율 싱글톤
 *
 * BLE (Primary) + QR (Fallback) 교환 방식 통합 관리.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import BLEExchangeService from '../ble/BLEExchangeService';
import { supabase } from '../supabase';
import { mapDbUserToProfile, createSkeletonProfile } from '../supabase/mappers';
import LocationService from '../location/LocationService';
import { useAuthStore } from '@/store/useAuthStore';
import { useConnectionStore } from '@/store/useConnectionStore';
import type { ExchangeEvent, ExchangeMethod } from '@/types/ble';
import type { ProfileCard, LocationData, Connection, UserProfile } from '@/types';

/** 오프라인 대기 중인 interaction 저장 키 (AsyncStorage) */
const PENDING_INTERACTIONS_KEY = 'alive-pending-interactions';

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

  // ─── 분리된 메서드 (광고/스캔 독립 제어) ───

  /** BLE 권한 일괄 요청 */
  async requestPermissions(): Promise<boolean> {
    return this.bleService.requestAllPermissions();
  }

  /** 광고만 시작 — 다른 기기가 나를 발견 가능 */
  async startAdvertisingOnly(userId: string): Promise<boolean> {
    // 이벤트 리스너 등록 (아직 안 되어있으면)
    if (!this.bleCleanup) {
      this.bleCleanup = this.bleService.on((event: ExchangeEvent) => {
        this.handleExchangeEvent(event);
      });
    }
    return this.bleService.startAdvertising(userId);
  }

  /** 스캔만 시작 — 근처 기기 탐색 */
  async startScanningOnly(): Promise<boolean> {
    // 이벤트 리스너 등록 (아직 안 되어있으면)
    if (!this.bleCleanup) {
      this.bleCleanup = this.bleService.on((event: ExchangeEvent) => {
        this.handleExchangeEvent(event);
      });
    }
    return this.bleService.startScanning();
  }

  /** 스캔만 중지 (광고는 유지) */
  stopScanningOnly(): void {
    this.bleService.stopScanning();
  }

  /** 광고 중인지 확인 */
  getIsAdvertising(): boolean {
    return this.bleService.isAdvertising();
  }

  /**
   * 교환 모드 시작 — BLE 스캔 + 광고 동시 시작 (기존 호환)
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

      // 4. Interaction 저장 — 중복 체크 포함 스토어 메서드 사용 (Fix 2)
      //    재시도 최대 2회, 1초 간격 적용 (Fix 3)
      const metAt = new Date().toISOString();
      const interactionPayload = {
        sourceUserId: myUser.id,
        targetUserId: partnerId,
        metAt,
        location: location || { latitude: 0, longitude: 0 },
      };

      const MAX_RETRIES = 2;
      const RETRY_DELAY_MS = 1000;
      let interactionId: string | null = null;

      for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
        // useConnectionStore.saveInteractionToSupabase — 5분 중복 방지 포함
        interactionId = await useConnectionStore.getState().saveInteractionToSupabase(interactionPayload);
        if (interactionId) break;

        if (attempt <= MAX_RETRIES) {
          logger.warn(`[ExchangeManager] Interaction 저장 실패 — ${attempt}/${MAX_RETRIES}회 재시도 대기 중...`);
          await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }

      if (!interactionId) {
        // 모든 재시도 실패 — 오프라인 대기 큐에 저장하여 추후 동기화
        logger.warn('[ExchangeManager] 모든 재시도 실패 — 오프라인 대기 큐에 저장');
        await this.saveToPendingQueue(interactionPayload);
        interactionId = `local_${Date.now()}`;
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
   * 오프라인 대기 큐에 interaction 데이터 저장
   * Supabase 저장이 완전히 실패했을 때 추후 동기화를 위해 AsyncStorage에 보관
   */
  private async saveToPendingQueue(payload: {
    sourceUserId: string;
    targetUserId: string;
    metAt: string;
    location: LocationData;
  }): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_INTERACTIONS_KEY);
      const queue: typeof payload[] = raw ? JSON.parse(raw) : [];
      queue.push(payload);
      await AsyncStorage.setItem(PENDING_INTERACTIONS_KEY, JSON.stringify(queue));
      logger.log(`[ExchangeManager] 오프라인 대기 큐 저장 완료 (총 ${queue.length}건)`);
    } catch (err) {
      logger.error('[ExchangeManager] 오프라인 대기 큐 저장 실패:', err);
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
