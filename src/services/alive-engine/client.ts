/**
 * ALIVE Engine API Client
 * FastAPI 백엔드와 통신하는 HTTP 클라이언트 (React Native 환경)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// === 설정 ===

const API_BASE = process.env.EXPO_PUBLIC_ALIVE_ENGINE_URL || 'http://localhost:8000';
const API_TIMEOUT = 5000; // 5초 타임아웃 (Render free tier 콜드 스타트 대응)

// Being ID 저장소 키
const BEING_ID_KEY = 'alive-engine-being-id';

// === 커스텀 API 에러 클래스 ===

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(`API Error ${status}: ${detail}`);
    this.name = 'ApiError';
  }
}

// === 공통 fetch 래퍼 (타임아웃 + 에러 핸들링) ===

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new ApiError(res.status, errorText);
    }

    return res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // React Native의 AbortError 처리
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, '서버 응답 시간 초과');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// === 백엔드 연결 상태 빠른 확인 ===

export async function checkApiHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

// === Being ID 관리 (AsyncStorage - React Native 환경) ===

/**
 * 저장된 Being ID 조회 (AsyncStorage)
 */
export async function getBeingId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(BEING_ID_KEY);
  } catch {
    // AsyncStorage 접근 불가 시 null
    return null;
  }
}

/**
 * Being ID 저장 (AsyncStorage)
 */
export async function setBeingId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(BEING_ID_KEY, id);
  } catch {
    // AsyncStorage 접근 불가 시 무시
  }
}

/**
 * Being ID 삭제 (AsyncStorage)
 */
export async function clearBeingId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BEING_ID_KEY);
  } catch {
    // AsyncStorage 접근 불가 시 무시
  }
}

// === Being 자동 생성 (404 시 자동 등록) ===

let _beingEnsured = false;

/**
 * Being 존재 여부 확인 및 자동 생성
 * - Being이 없으면 자동으로 생성 (POST /api/v1/beings)
 * - 서버 연결 실패 시 무시 (오프라인 모드 허용)
 */
export async function ensureBeingExists(beingId: string): Promise<void> {
  if (_beingEnsured) return;

  try {
    // Being 존재 여부 확인
    await apiFetch(`/api/v1/beings/${beingId}`);
    _beingEnsured = true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Being이 없으면 자동 생성
      await apiFetch('/api/v1/beings', {
        method: 'POST',
        body: JSON.stringify({
          name: '나',
          description: 'ALIVE Connection 사용자',
        }),
      });
      _beingEnsured = true;
    }
    // 서버 연결 실패는 무시 (오프라인 모드)
  }
}

// === Export ===

export { API_BASE };
