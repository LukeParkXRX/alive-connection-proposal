/**
 * Supabase DB ↔ App Type 매퍼
 * snake_case (DB) ↔ camelCase (App) 변환
 */

import type { UserProfile, Interaction, LocationData, SocialLinks } from '@/types';

// ============================================================================
// 타입 가드 헬퍼
// ============================================================================

/** DB에서 온 값이 Record 타입인지 확인 (JSONB 필드용) */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ============================================================================
// DB Row 타입 정의 (Supabase 스키마 기반)
// ============================================================================

/** public.users 테이블 row */
export interface DbUserRow {
  id: string;
  name: string;
  gender?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  company?: string | null;
  title?: string | null;
  profile_view_count?: number | null;
  social_links?: SocialLinks | null;
  created_at: string;
  updated_at: string;
}

/** public.interactions 테이블 row */
export interface DbInteractionRow {
  id: string;
  source_user_id: string;
  target_user_id: string;
  met_at: string;
  location_lat?: number | null;
  location_lng?: number | null;
  location_address?: string | null;
  location_place_name?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  event_context?: string | null;
  memo?: string | null;
  voice_memo_url?: string | null;
  tags?: string[] | null;
  status?: string | null;
  created_at: string;
  updated_at: string;
}

// DB row → UserProfile
export function mapDbUserToProfile(dbUser: DbUserRow): UserProfile {
  return {
    id: dbUser.id,
    name: dbUser.name ?? '',
    gender: dbUser.gender,
    bio: dbUser.bio,
    avatarUrl: dbUser.avatar_url,
    company: dbUser.company,
    title: dbUser.title,
    viewCount: dbUser.profile_view_count ?? 0,
    socialLinks: isRecord(dbUser.social_links) ? dbUser.social_links as SocialLinks : {},
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// UserProfile → DB row (for upsert)
export function mapProfileToDbUser(profile: Partial<UserProfile>): Partial<DbUserRow> {
  const dbRow: Partial<DbUserRow> = {};
  if (profile.name !== undefined) dbRow.name = profile.name;
  if (profile.gender !== undefined) dbRow.gender = profile.gender;
  if (profile.bio !== undefined) dbRow.bio = profile.bio;
  if (profile.avatarUrl !== undefined) dbRow.avatar_url = profile.avatarUrl;
  if (profile.company !== undefined) dbRow.company = profile.company;
  if (profile.title !== undefined) dbRow.title = profile.title;
  if (profile.socialLinks !== undefined) dbRow.social_links = profile.socialLinks;
  dbRow.updated_at = new Date().toISOString();
  return dbRow;
}

// DB row → Interaction
export function mapDbInteractionToModel(dbRow: DbInteractionRow): Interaction {
  return {
    id: dbRow.id,
    sourceUserId: dbRow.source_user_id,
    targetUserId: dbRow.target_user_id,
    metAt: dbRow.met_at,
    location: {
      latitude: dbRow.location_lat ?? 0,
      longitude: dbRow.location_lng ?? 0,
      address: dbRow.location_address ?? undefined,
      placeName: dbRow.location_place_name ?? undefined,
      city: dbRow.location_city ?? undefined,
      country: dbRow.location_country ?? undefined,
    },
    eventContext: dbRow.event_context ?? undefined,
    memo: dbRow.memo ?? undefined,
    voiceMemoUrl: dbRow.voice_memo_url ?? undefined,
    tags: dbRow.tags ?? undefined,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

/**
 * DB 조회 실패 시 BLE 수신 데이터로 만드는 최소 스켈레톤 프로필
 * - userId: 반드시 실제 유저 ID (UUID)
 * - partialData: BLE 교환 등 부분 정보 (선택)
 */
export function createSkeletonProfile(
  userId: string,
  partialData?: Partial<Pick<UserProfile, 'name' | 'title' | 'company' | 'avatarUrl' | 'socialLinks'>>
): UserProfile {
  const now = new Date().toISOString();
  return {
    id: userId,
    name: partialData?.name || `User ${userId.slice(0, 8)}`,
    title: partialData?.title,
    company: partialData?.company,
    avatarUrl: partialData?.avatarUrl,
    socialLinks: partialData?.socialLinks || {},
    createdAt: now,
    updatedAt: now,
  };
}

// Interaction → DB row (for insert)
export function mapInteractionToDbRow(
  interaction: Partial<Interaction> & { sourceUserId: string; targetUserId: string }
): Omit<DbInteractionRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    source_user_id: interaction.sourceUserId,
    target_user_id: interaction.targetUserId,
    met_at: interaction.metAt || new Date().toISOString(),
    location_lat: interaction.location?.latitude,
    location_lng: interaction.location?.longitude,
    location_address: interaction.location?.address,
    location_place_name: interaction.location?.placeName,
    location_city: interaction.location?.city,
    location_country: interaction.location?.country,
    event_context: interaction.eventContext,
    memo: interaction.memo,
    tags: Array.isArray(interaction.tags) ? interaction.tags : [],
    status: 'active',
  };
}
