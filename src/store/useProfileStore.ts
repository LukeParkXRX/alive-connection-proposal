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

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      activeCard: null,
      currentMode: 'business',

      setProfile: (profile) => {
        set({ profile });
        // Auto-generate active card
        const card = get().generateActiveCard();
        set({ activeCard: card });
      },

      updateProfile: (updates) => {
        const current = get().profile;
        if (current) {
          const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
          set({ profile: updated });
          // Regenerate active card
          const card = get().generateActiveCard();
          set({ activeCard: card });
          // Supabase 비동기 동기화
          get().syncToSupabase().catch((err) => {
            console.warn('[Profile] Supabase 동기화 실패:', err);
          });
        }
      },

      setCurrentMode: (mode) => {
        set({ currentMode: mode });
        // Regenerate active card with new mode
        const card = get().generateActiveCard();
        set({ activeCard: card });
      },

      generateActiveCard: () => {
        const { profile, currentMode } = get();
        if (!profile) return null;

        // Filter visible links based on mode
        const visibleLinks: SocialLinks = {};

        if (currentMode === 'business') {
          // Business mode: all professional links
          const businessKeys = ['email', 'phone', 'linkedin', 'website'];
          businessKeys.forEach((key) => {
            if (profile.socialLinks[key]) {
              visibleLinks[key] = profile.socialLinks[key];
            }
          });
        } else {
          // Casual mode: social links only
          const casualKeys = ['twitter', 'instagram', 'whatsapp'];
          casualKeys.forEach((key) => {
            if (profile.socialLinks[key]) {
              visibleLinks[key] = profile.socialLinks[key];
            }
          });
        }

        return {
          userId: profile.id,
          mode: currentMode,
          displayName: profile.name,
          displayTitle: profile.title,
          displayCompany: profile.company,
          avatarUrl: profile.avatarUrl,
          visibleLinks,
        };
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
          console.error('[Profile] syncToSupabase 실패:', err);
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
          set({ profile: loaded });
          const card = get().generateActiveCard();
          set({ activeCard: card });
          return true;
        } catch (err) {
          console.error('[Profile] loadFromSupabase 실패:', err);
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

        set({ profile: dbUser });
        const card = get().generateActiveCard();
        set({ activeCard: card });
      },
    }),
    {
      name: 'alive-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useProfileStore;
