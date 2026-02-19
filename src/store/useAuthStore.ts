/**
 * Auth Store - Manages Supabase Session
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

interface AuthState {
    session: Session | null;
    user: User | null;
    isLoading: boolean;

    setSession: (session: Session | null) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    user: null,
    isLoading: true,

    setSession: (session) => set({ session, user: session?.user ?? null }),
    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ isLoading: loading }),

    signOut: async () => {
        await supabase.auth.signOut();
        set({ session: null, user: null });
    },
}));

export default useAuthStore;
