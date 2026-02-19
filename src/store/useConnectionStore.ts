/**
 * Connection Store - Manages timeline and connections
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Connection, Interaction, UserProfile } from '@/types';
import { useGraphStore } from '@/store/useGraphStore';

interface ConnectionState {
  // All connections (cached locally)
  connections: Connection[];

  // Loading state
  isLoading: boolean;

  // Actions
  addConnection: (connection: Connection) => void;
  updateInteraction: (interactionId: string, updates: Partial<Interaction>) => void;
  removeConnection: (interactionId: string) => void;
  setConnections: (connections: Connection[]) => void;
  getConnectionsByDate: () => Map<string, Connection[]>;
  searchConnections: (query: string) => Connection[];
  setLoading: (loading: boolean) => void;
  handleAutomaticHandshake: (userId: string) => Promise<void>;

  // Handshake Feedback State
  lastReceivedConnection: Connection | null;
  clearLastConnection: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      connections: [],
      isLoading: false,
      lastReceivedConnection: null,

      addConnection: (connection) => {
        set((state) => ({
          connections: [connection, ...state.connections],
        }));
      },

      updateInteraction: (interactionId, updates) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.interaction.id === interactionId
              ? {
                ...conn,
                interaction: { ...conn.interaction, ...updates },
              }
              : conn
          ),
        }));

        // 메모가 변경되면 지식그래프에서 엔티티 추출 (비동기)
        if (updates.memo) {
          const conn = get().connections.find((c) => c.interaction.id === interactionId);
          if (conn) {
            const personNodeId = conn.user.id;
            useGraphStore.getState().enrichFromMemo(personNodeId, updates.memo).catch((err) => {
              console.warn('[Graph] 메모 엔티티 추출 실패:', err);
            });
          }
        }
      },

      removeConnection: (interactionId) => {
        set((state) => ({
          connections: state.connections.filter(
            (conn) => conn.interaction.id !== interactionId
          ),
        }));
      },

      setConnections: (connections) => {
        set({ connections });
      },

      // Group connections by date for timeline view
      getConnectionsByDate: () => {
        const { connections } = get();
        const grouped = new Map<string, Connection[]>();

        connections.forEach((conn) => {
          const date = new Date(conn.interaction.metAt).toDateString();
          const existing = grouped.get(date) || [];
          grouped.set(date, [...existing, conn]);
        });

        return grouped;
      },

      // Search connections by name, company, or memo
      searchConnections: (query) => {
        const { connections } = get();
        const lowerQuery = query.toLowerCase();

        return connections.filter((conn) => {
          const name = conn.user.name.toLowerCase();
          const company = conn.user.company?.toLowerCase() || '';
          const memo = conn.interaction.memo?.toLowerCase() || '';
          const context = conn.interaction.eventContext?.toLowerCase() || '';

          return (
            name.includes(lowerQuery) ||
            company.includes(lowerQuery) ||
            memo.includes(lowerQuery) ||
            context.includes(lowerQuery)
          );
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      handleAutomaticHandshake: async (userId) => {
        set({ isLoading: true });
        try {
          // 1. Get current location (Simplified for now - should use expo-location)
          const metAt = new Date().toISOString();

          // 2. Mock profile (In production, fetch from Supabase)
          const mockUser: UserProfile = {
            id: userId,
            name: `User ${userId.slice(0, 4)}`,
            company: 'Unknown Company',
            title: 'Professional',
            socialLinks: {},
            createdAt: metAt,
            updatedAt: metAt,
          };

          const connection: Connection = {
            user: mockUser,
            interaction: {
              id: `auto_${Date.now()}`,
              sourceUserId: 'me', // Should get from auth
              targetUserId: userId,
              metAt,
              location: {
                latitude: 0,
                longitude: 0,
                address: 'Incoming Connection',
              },
              createdAt: metAt,
              updatedAt: metAt,
            },
          };

          get().addConnection(connection);

          // 3. 지식그래프에 자동 연결 노드 생성 (비동기)
          useGraphStore.getState().addPersonNode(mockUser, connection.interaction).catch((err) => {
            console.warn('[Graph] 자동 핸드셰이크 그래프 동기화 실패:', err);
          });

          // 4. Update feedback state for global overlay
          set({ lastReceivedConnection: connection });
        } finally {
          set({ isLoading: false });
        }
      },

      clearLastConnection: () => {
        set({ lastReceivedConnection: null });
      },
    }),
    {
      name: 'alive-connections-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useConnectionStore;
