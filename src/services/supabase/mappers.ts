/**
 * Supabase DB ↔ App Type 매퍼
 * snake_case (DB) ↔ camelCase (App) 변환
 */

import type { UserProfile, Interaction, LocationData } from '@/types';

// DB row → UserProfile
export function mapDbUserToProfile(dbUser: any): UserProfile {
  return {
    id: dbUser.id,
    name: dbUser.name,
    gender: dbUser.gender,
    bio: dbUser.bio,
    avatarUrl: dbUser.avatar_url,
    company: dbUser.company,
    title: dbUser.title,
    viewCount: dbUser.profile_view_count,
    socialLinks: dbUser.social_links || {},
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// UserProfile → DB row (for upsert)
export function mapProfileToDbUser(profile: Partial<UserProfile>): Record<string, any> {
  const dbRow: Record<string, any> = {};
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
export function mapDbInteractionToModel(dbRow: any): Interaction {
  return {
    id: dbRow.id,
    sourceUserId: dbRow.source_user_id,
    targetUserId: dbRow.target_user_id,
    metAt: dbRow.met_at,
    location: {
      latitude: dbRow.location_lat || 0,
      longitude: dbRow.location_lng || 0,
      address: dbRow.location_address,
      placeName: dbRow.location_place_name,
      city: dbRow.location_city,
      country: dbRow.location_country,
    },
    eventContext: dbRow.event_context,
    memo: dbRow.memo,
    voiceMemoUrl: dbRow.voice_memo_url,
    tags: dbRow.tags,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
}

// Interaction → DB row (for insert)
export function mapInteractionToDbRow(
  interaction: Partial<Interaction> & { sourceUserId: string; targetUserId: string }
): Record<string, any> {
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
    tags: interaction.tags || [],
  };
}
