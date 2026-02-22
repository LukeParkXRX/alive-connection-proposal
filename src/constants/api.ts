/**
 * API 설정 상수
 */

// 현재는 Supabase 직접 사용, 추후 자체 서버로 전환 시 변경
export const API_CONFIG = {
  // Backend API (추후 Express.js 서버)
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1',

  // Supabase (현재 사용 중)
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // ALIVE Engine
  ALIVE_ENGINE_URL: process.env.EXPO_PUBLIC_ALIVE_ENGINE_URL || 'http://localhost:8000',

  // 타임아웃
  REQUEST_TIMEOUT: 10000,  // 10초

  // Rate Limiting
  EXCHANGE_RATE_LIMIT: 10,  // 분당 최대 교환 수
} as const;

// API 엔드포인트 (자체 서버 전환 시 사용)
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    OAUTH_GOOGLE: '/auth/oauth/google',
    OAUTH_APPLE: '/auth/oauth/apple',
    REFRESH: '/auth/refresh',
  },
  PROFILE: {
    ME: '/profile/me',
    CARDS: '/profile/cards',
    CARD_IMAGE: (id: string) => `/profile/cards/${id}/image`,
    PUBLIC: (slug: string) => `/profile/public/${slug}`,
  },
  EXCHANGES: {
    CREATE: '/exchanges',
    LIST: '/exchanges',
    DETAIL: (id: string) => `/exchanges/${id}`,
    MEMO: (id: string) => `/exchanges/${id}/memo`,
    TAGS: (id: string) => `/exchanges/${id}/tags`,
    STATS: '/exchanges/stats',
  },
  DEVICES: {
    REGISTER: '/devices/register',
  },
} as const;
