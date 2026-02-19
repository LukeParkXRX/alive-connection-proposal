/**
 * Profile Store - Zustand State Management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, ProfileCard, ProfileMode, SocialLinks } from '@/types';

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
    }),
    {
      name: 'alive-profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useProfileStore;
