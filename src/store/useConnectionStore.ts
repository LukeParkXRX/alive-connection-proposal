/**
 * Connection Store - Manages timeline and connections
 * AsyncStorage 로컬 캐시 + Supabase 동기화
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import type { Connection, Interaction, UserProfile, LocationData } from '@/types';
import { useGraphStore } from '@/store/useGraphStore';
import { supabase } from '@/services/supabase';
import { mapDbUserToProfile, mapInteractionToDbRow } from '@/services/supabase/mappers';
import { useAuthStore } from '@/store/useAuthStore';

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

  // Supabase 동기화
  loadConnectionsFromSupabase: () => Promise<void>;
  saveInteractionToSupabase: (interaction: Partial<Interaction> & { sourceUserId: string; targetUserId: string }) => Promise<string | null>;

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

        // 메모 변경 시 Supabase에도 업데이트
        if (updates.memo !== undefined) {
          supabase
            .from('interactions')
            .update({ memo: updates.memo, updated_at: new Date().toISOString() })
            .eq('id', interactionId)
            .then(({ error }) => {
              if (error) console.warn('[Connections] 메모 Supabase 동기화 실패:', error);
            });
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

      // Supabase에 interaction 저장
      saveInteractionToSupabase: async (interaction) => {
        try {
          const dbRow = mapInteractionToDbRow(interaction);
          const { data, error } = await supabase
            .from('interactions')
            .insert(dbRow)
            .select()
            .single();

          if (error) {
            console.warn('[Connections] Interaction 저장 실패:', error);
            return null;
          }
          return data?.id || null;
        } catch (err) {
          console.error('[Connections] Interaction 저장 예외:', err);
          return null;
        }
      },

      handleAutomaticHandshake: async (userId) => {
        set({ isLoading: true });
        try {
          const metAt = new Date().toISOString();

          // useAuthStore를 lazy import (순환 의존성 방지)
          // useAuthStore는 상단에서 정적 import됨
          const myDbUser = useAuthStore.getState().dbUser;

          if (!myDbUser) {
            console.warn('[Handshake] 로그인된 DB 유저가 없음');
            return;
          }

          // 1. Supabase에서 상대방 프로필 조회
          let targetUser: UserProfile;
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();

            if (error || !data) {
              // 유저를 찾을 수 없는 경우 skeleton 프로필
              console.warn('[Handshake] 상대방 유저 조회 실패:', error);
              targetUser = {
                id: userId,
                name: `User ${userId.slice(0, 8)}`,
                socialLinks: {},
                createdAt: metAt,
                updatedAt: metAt,
              };
            } else {
              targetUser = mapDbUserToProfile(data);
            }
          } catch {
            targetUser = {
              id: userId,
              name: `User ${userId.slice(0, 8)}`,
              socialLinks: {},
              createdAt: metAt,
              updatedAt: metAt,
            };
          }

          // 2. 위치 캡처
          let location: LocationData = { latitude: 0, longitude: 0 };
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const [address] = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              location = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                address: address
                  ? `${address.street || ''} ${address.city || ''}`.trim()
                  : undefined,
                placeName: address?.name || undefined,
                city: address?.city || undefined,
                country: address?.country || undefined,
              };
            }
          } catch (locErr) {
            console.warn('[Handshake] 위치 캡처 실패:', locErr);
          }

          // 3. Supabase interactions 테이블에 저장
          const interactionId = await get().saveInteractionToSupabase({
            sourceUserId: myDbUser.id,
            targetUserId: userId,
            metAt,
            location,
          }) || `local_${Date.now()}`;

          // 4. 로컬 스토어에 Connection 추가
          const connection: Connection = {
            user: targetUser,
            interaction: {
              id: interactionId,
              sourceUserId: myDbUser.id,
              targetUserId: userId,
              metAt,
              location,
              createdAt: metAt,
              updatedAt: metAt,
            },
          };

          get().addConnection(connection);

          // 5. 지식그래프 동기화 (Optional)
          useGraphStore.getState().addPersonNode(targetUser, connection.interaction).catch((err) => {
            console.warn('[Graph] 자동 핸드셰이크 그래프 동기화 실패:', err);
          });

          // 6. HandshakeSuccess 오버레이 표시
          set({ lastReceivedConnection: connection });
        } finally {
          set({ isLoading: false });
        }
      },

      // Supabase에서 타임라인 로드
      loadConnectionsFromSupabase: async () => {
        const myDbUser = useAuthStore.getState().dbUser;
        if (!myDbUser) return;

        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('interactions')
            .select(`
              *,
              target_user:users!interactions_target_user_id_fkey(*),
              source_user:users!interactions_source_user_id_fkey(*)
            `)
            .or(`source_user_id.eq.${myDbUser.id},target_user_id.eq.${myDbUser.id}`)
            .eq('status', 'active')
            .order('met_at', { ascending: false });

          if (error) {
            console.error('[Connections] Supabase 로드 실패:', error);
            return;
          }
          if (!data) return;

          const connections: Connection[] = data.map((row: any) => {
            // If I am the source, the contact is the target. If I am the target, the contact is the source.
            const isSource = row.source_user_id === myDbUser.id;
            const contactUser = isSource ? row.target_user : row.source_user;
            const contactId = isSource ? row.target_user_id : row.source_user_id;

            return {
              user: contactUser
                ? mapDbUserToProfile(contactUser)
                : {
                  id: contactId,
                  name: 'Unknown User',
                  socialLinks: {},
                  createdAt: '',
                  updatedAt: '',
                },
              interaction: {
                id: row.id,
                sourceUserId: row.source_user_id,
                targetUserId: row.target_user_id,
                metAt: row.met_at,
                location: {
                  latitude: row.location_lat || 0,
                  longitude: row.location_lng || 0,
                  address: row.location_address,
                  placeName: row.location_place_name,
                  city: row.location_city,
                  country: row.location_country,
                },
                eventContext: row.event_context,
                memo: row.memo,
                voiceMemoUrl: row.voice_memo_url,
                tags: row.tags,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              },
            };
          });

          set({ connections });
        } catch (err) {
          console.error('[Connections] Supabase 로드 예외:', err);
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
