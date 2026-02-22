/**
 * Profile Store - Zustand State Management
 * AsyncStorage 로컬 캐시 + Supabase 동기화
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, ProfileCard, ProfileMode, SocialLinks } from '@/types';
import { supabase } from '@/services/supabase';
import { mapProfileToDbUser, mapDbUserToProfile } from '@/services/supabase/mappers';
import { useAuthStore } from '@/store/useAuthStore';
import { logger } from '@/lib/logger';

interface ProfileState {
  // Current user profile
  profile: UserProfile | null;

  // Active profile card for sharing
  activeCard: ProfileCard | null;

  // Current sharing mode
  currentMode: ProfileMode;

  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setCurrentMode: (mode: ProfileMode) => void;
  generateActiveCard: () => ProfileCard | null;
  clearProfile: () => void;

  // Supabase 동기화
  syncToSupabase: () => Promise<boolean>;
  loadFromSupabase: () => Promise<boolean>;
  initializeFromAuth: () => void;
}

/**
 * profile과 mode로 ProfileCard를 생성하는 순수 헬퍼 함수.
 * store 외부에 두어 중복 카드 생성 로직을 단일화 (DRY).
 */
function buildProfileCard(profile: UserProfile, mode: ProfileMode): ProfileCard {
  const visibleLinks: SocialLinks = {};
  const keys =
    mode === 'business'
      ? ['email', 'phone', 'linkedin', 'website']
      : ['twitter', 'instagram', 'whatsapp'];
  keys.forEach((key) => {
    if (profile.socialLinks[key]) visibleLinks[key] = profile.socialLinks[key];
  });
  return {
    userId: profile.id,
    mode,
    displayName: profile.name,
    displayTitle: profile.title,
    displayCompany: profile.company,
    avatarUrl: profile.avatarUrl,
    visibleLinks,
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      activeCard: null,
      currentMode: 'business',

      setProfile: (profile) => {
        // profile과 activeCard를 단일 set()으로 동시 업데이트 (이중 리렌더 방지)
        const card = buildProfileCard(profile, get().currentMode);
        set({ profile, activeCard: card });
      },

      updateProfile: (updates) => {
        const current = get().profile;
        if (!current) return;
        const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
        // profile과 activeCard를 단일 set()으로 동시 업데이트 (이중 리렌더 방지)
        const card = buildProfileCard(updated, get().currentMode);
        set({ profile: updated, activeCard: card });
        // Supabase 비동기 동기화
        get().syncToSupabase().catch((err) => {
          logger.warn('[Profile] Supabase 동기화 실패:', err);
        });
      },

      setCurrentMode: (mode) => {
        const profile = get().profile;
        // currentMode와 activeCard를 단일 set()으로 동시 업데이트 (이중 리렌더 방지)
        const card = profile ? buildProfileCard(profile, mode) : null;
        set({ currentMode: mode, activeCard: card });
      },

      generateActiveCard: () => {
        const { profile, currentMode } = get();
        if (!profile) return null;
        return buildProfileCard(profile, currentMode);
      },

      clearProfile: () => {
        set({ profile: null, activeCard: null });
      },

      // Supabase에 프로필 저장
      syncToSupabase: async () => {
        const profile = get().profile;
        if (!profile) return false;

        try {
          const dbRow = mapProfileToDbUser(profile);
          const { error } = await supabase
            .from('users')
            .update(dbRow)
            .eq('id', profile.id);

          if (error) throw error;
          return true;
        } catch (err) {
          logger.error('[Profile] syncToSupabase 실패:', err);
          return false;
        }
      },

      // Supabase에서 프로필 로드
      loadFromSupabase: async () => {
        const profile = get().profile;
        if (!profile) return false;

        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', profile.id)
            .single();

          if (error) throw error;

          const loaded = mapDbUserToProfile(data);
          // profile과 activeCard를 단일 set()으로 동시 업데이트 (이중 리렌더 방지)
          const card = buildProfileCard(loaded, get().currentMode);
          set({ profile: loaded, activeCard: card });
          return true;
        } catch (err) {
          logger.error('[Profile] loadFromSupabase 실패:', err);
          return false;
        }
      },

      // Auth 완료 후 프로필 초기화 (dbUser를 profile로 설정)
      initializeFromAuth: () => {
        // useAuthStore를 lazy import하여 순환 의존성 방지
        // useAuthStore는 상단에서 정적 import됨
        const dbUser = useAuthStore.getState().dbUser;
        if (!dbUser) return;

        // 이미 같은 유저의 프로필이 있으면 DB 데이터로 병합
        const currentProfile = get().profile;
        if (currentProfile?.id === dbUser.id) {
          // 로컬에 더 최신 데이터가 있을 수 있으므로, DB 기본값만 채움
          return;
        }

        // profile과 activeCard를 단일 set()으로 동시 업데이트 (이중 리렌더 방지)
        const card = buildProfileCard(dbUser, get().currentMode);
        set({ profile: dbUser, activeCard: card });
      },
    }),
    {
      name: 'alive-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useProfileStore;
