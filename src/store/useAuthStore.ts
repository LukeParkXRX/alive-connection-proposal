/**
 * Auth Store - Manages Supabase Session + DB User Profile
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import { mapDbUserToProfile } from '@/services/supabase/mappers';
import type { UserProfile } from '@/types';

interface AuthState {
    session: Session | null;
    user: User | null;           // Supabase Auth user (auth.users)
    dbUser: UserProfile | null;  // public.users 테이블 프로필
    isLoading: boolean;

    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
    fetchDbUser: () => Promise<UserProfile | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    session: null,
    user: null,
    dbUser: null,
    isLoading: true,

    setSession: (session) => {
        set({ session, user: session?.user ?? null });
        // 세션 해제 시 dbUser도 초기화
        if (!session) {
            set({ dbUser: null });
        }
    },

    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null, dbUser: null });
    },

    // auth_id로 users 테이블에서 프로필 조회
    fetchDbUser: async () => {
        const authUser = get().user;
        if (!authUser) return null;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('auth_id', authUser.id)
                .single();

            if (error) {
                // 트리거가 아직 실행 안 됐을 수 있음 — 짧은 재시도
                if (error.code === 'PGRST116') {
                    await new Promise((r) => setTimeout(r, 1000));
                    const { data: retryData, error: retryError } = await supabase
                        .from('users')
                        .select('*')
                        .eq('auth_id', authUser.id)
                        .single();

                    if (retryError) {
                        console.error('[Auth] DB user fetch 재시도 실패:', retryError);
                        return null;
                    }
                    const profile = mapDbUserToProfile(retryData);
                    set({ dbUser: profile });
                    return profile;
                }
                console.error('[Auth] DB user fetch 실패:', error);
                return null;
            }

            const profile = mapDbUserToProfile(data);
            set({ dbUser: profile });
            return profile;
        } catch (err) {
            console.error('[Auth] DB user fetch 예외:', err);
            return null;
        }
    },
}));

export default useAuthStore;
