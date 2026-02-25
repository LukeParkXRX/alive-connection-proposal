/**
 * Graph Store - ALIVE Engine 지식 그래프 상태 관리
 *
 * BLE 핸드셰이크 후 온톨로지 노드 생성, 관계 추가, 메모에서 엔티티 추출 등
 * 온라인/오프라인 모드 지원, 오프라인 큐를 통한 동기화
 */

import { create } from 'zustand';
import { logger } from '@/lib/logger';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, Interaction } from '@/types';
import type { OntologyNode, OntologyGraph } from '@/services/alive-engine/types';
import { graphApi } from '@/services/alive-engine/graph-api';
import { memoryApi } from '@/services/alive-engine/memory-api';
import {
  checkApiHealth,
  getBeingId,
  ensureBeingExists,
} from '@/services/alive-engine/client';
import {
  enqueue,
  processQueue,
  createEdgeOperation,
  createConversationOperation,
} from '@/services/alive-engine/offline-queue';
import { buildHandshakeGraph } from '@/services/alive-engine/graph-builders';
import {
  executeOnline,
  enqueueOffline,
  buildOptimisticNodes,
  buildOptimisticEdges,
} from '@/services/alive-engine/graph-sync';

interface GraphState {
  // ============================================================================
  // 상태 (State)
  // ============================================================================

  /** 온톨로지 그래프 (노드 + 엣지) */
  graph: OntologyGraph;

  /** ALIVE Engine API 연결 상태 */
  isOnline: boolean;

  /** 마지막 동기화 시간 (ISO 8601) */
  lastSyncAt: string | null;

  /** 초기화 완료 여부 */
  isInitialized: boolean;

  /** 로딩 상태 */
  isLoading: boolean;

  // ============================================================================
  // 액션 (Actions)
  // ============================================================================

  /**
   * 그래프 초기화
   *
   * - API 상태 체크 (온라인/오프라인)
   * - Being 존재 확인 및 생성
   * - 서버에서 최신 그래프 로드 (온라인 시)
   * - 오프라인 큐 동기화
   */
  initializeGraph: () => Promise<void>;

  /**
   * 노드 생성 - BLE 핸드셰이크 후 호출
   *
   * @param profile - 상대방 프로필 정보
   * @param interaction - 만남 정보 (위치, 시간, 이벤트)
   *
   * 생성 노드:
   * - [person] 노드 (상대방)
   * - [organization] 노드 (회사, 있을 경우)
   * - [location] 노드 (장소명, 있을 경우)
   * - [event] 노드 (이벤트 컨텍스트, 있을 경우)
   *
   * 생성 엣지:
   * - me → KNOWS → [person]
   * - [person] → WORKS_AT → [organization]
   * - me → ATTENDS → [event]
   */
  addPersonNode: (profile: UserProfile, interaction: Interaction) => Promise<void>;

  /**
   * 관계 엣지 추가
   *
   * @param sourceId - 출발 노드 ID
   * @param targetId - 도착 노드 ID
   * @param relationType - 관계 타입 (예: KNOWS, WORKS_AT, ATTENDS)
   */
  addRelationshipEdge: (
    sourceId: string,
    targetId: string,
    relationType: string
  ) => Promise<void>;

  /**
   * 메모에서 엔티티 추출 및 그래프 추가
   *
   * @param personNodeId - 대상 person 노드 ID
   * @param memo - 사용자가 작성한 메모
   *
   * 프로세스:
   * 1. person 노드의 이름을 그래프에서 찾기
   * 2. memoryApi.processConversation() 호출 (LLM 엔티티 추출)
   * 3. 추출된 엔티티를 노드로 생성
   * 4. 추출된 관계를 엣지로 생성
   */
  enrichFromMemo: (personNodeId: string, memo: string) => Promise<void>;

  /**
   * 그래프 검색
   *
   * @param query - 검색 쿼리
   * @returns 매칭되는 노드 목록
   *
   * - 온라인: graphApi.searchNodes() 또는 graphApi.semanticSearch() 사용
   * - 오프라인: 로컬 그래프에서 label 매칭
   */
  searchGraph: (query: string) => Promise<OntologyNode[]>;

  /**
   * 오프라인 큐 동기화
   *
   * - 큐에 쌓인 작업들을 API로 전송
   * - 성공 후 refreshGraph() 호출하여 최신 상태 반영
   */
  syncPendingOperations: () => Promise<void>;

  /**
   * 온라인 상태 체크
   *
   * checkApiHealth()를 호출하여 isOnline 상태 업데이트
   */
  checkOnlineStatus: () => Promise<void>;

  /**
   * 그래프 리프레시
   *
   * 서버에서 최신 그래프 데이터를 받아와 로컬 상태 갱신
   */
  refreshGraph: () => Promise<void>;
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set, get) => ({
      // ========================================================================
      // 초기 상태
      // ========================================================================
      graph: { nodes: [], edges: [] },
      isOnline: false,
      lastSyncAt: null,
      isInitialized: false,
      isLoading: false,

      // ========================================================================
      // 그래프 초기화
      // ========================================================================
      initializeGraph: async () => {
        const state = get();
        if (state.isInitialized) {
          logger.log('[GraphStore] 이미 초기화됨, 스킵');
          return;
        }

        set({ isLoading: true });

        try {
          // 1. API 상태 체크
          await get().checkOnlineStatus();

          if (get().isOnline) {
            logger.log('[GraphStore] 온라인 모드 - 서버에서 그래프 로드');

            // 2. Being 존재 확인
            const beingId = await getBeingId();
            if (!beingId) {
              logger.warn('[GraphStore] beingId 없음 — 인증 필요');
              set({ isInitialized: true, isOnline: false });
              return;
            }
            await ensureBeingExists(beingId);

            // 3. 최신 그래프 로드
            await get().refreshGraph();

            // 4. 오프라인 큐 동기화
            await get().syncPendingOperations();
          } else {
            logger.log('[GraphStore] 오프라인 모드 - 로컬 캐시 사용');
            // 오프라인 시 AsyncStorage에 persist된 그래프 사용 (Zustand 자동 처리)
          }

          set({ isInitialized: true });
          logger.log('[GraphStore] 초기화 완료');
        } catch (error) {
          logger.warn('[GraphStore] 초기화 실패 (오프라인 캐시 사용)', error);
          // 초기화 실패해도 오프라인 모드로 동작 가능
          set({ isInitialized: true, isOnline: false });
        } finally {
          set({ isLoading: false });
        }
      },

      // ========================================================================
      // 노드 생성 - BLE 핸드셰이크 후 호출
      // ========================================================================
      addPersonNode: async (profile, interaction) => {
        set({ isLoading: true });

        try {
          const { isOnline } = get();
          const beingId = await getBeingId();
          if (!beingId) {
            logger.warn('[GraphStore] addPersonNode: beingId 없음 — 인증 필요');
            return;
          }

          const { nodes, edges } = buildHandshakeGraph(profile, interaction);

          if (isOnline) {
            await executeOnline(nodes, edges, beingId);
            await get().refreshGraph();
          } else {
            await enqueueOffline(nodes, edges, beingId);

            // 로컬 그래프 상태 업데이트 (낙관적 업데이트)
            set((state) => ({
              graph: {
                nodes: [...state.graph.nodes, ...buildOptimisticNodes(nodes)],
                edges: [...state.graph.edges, ...buildOptimisticEdges(edges)],
              },
            }));
          }

          logger.log('[GraphStore] addPersonNode 완료');
        } catch (error) {
          logger.error('[GraphStore] addPersonNode 에러', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // ========================================================================
      // 관계 엣지 추가
      // ========================================================================
      addRelationshipEdge: async (sourceId, targetId, relationType) => {
        set({ isLoading: true });

        try {
          const { isOnline } = get();
          const beingId = await getBeingId();
          if (!beingId) {
            logger.warn('[GraphStore] addRelationshipEdge: beingId 없음 — 인증 필요');
            return;
          }

          const edgeData = { source: sourceId, target: targetId, relation: relationType };

          if (isOnline) {
            await executeOnline([], [edgeData], beingId);
            await get().refreshGraph();
          } else {
            await enqueueOffline([], [edgeData], beingId);

            set((state) => ({
              graph: {
                ...state.graph,
                edges: [...state.graph.edges, ...buildOptimisticEdges([edgeData])],
              },
            }));
          }
        } catch (error) {
          logger.error('[GraphStore] addRelationshipEdge 에러', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // ========================================================================
      // 메모에서 엔티티 추출 및 그래프 추가
      // ========================================================================
      enrichFromMemo: async (personNodeId, memo) => {
        set({ isLoading: true });

        try {
          const { isOnline, graph } = get();

          // 1. person 노드의 이름 찾기
          const personNode = graph.nodes.find((n) => n.id === personNodeId);
          if (!personNode) {
            logger.warn(`[GraphStore] 노드 ID ${personNodeId}를 찾을 수 없음`);
            return;
          }

          const personName = personNode.label;

          // 2. 대화 형식으로 포맷팅
          const userMessage = `${personName}에 대한 메모: ${memo}`;
          const assistantResponse = ''; // 빈 응답 (엔티티 추출만 수행)

          if (isOnline) {
            // 온라인: memoryApi 호출 (LLM 엔티티 추출)
            const result = await memoryApi.processConversation({
              user_message: userMessage,
              assistant_response: assistantResponse,
            });

            logger.log('[GraphStore] LLM 엔티티 추출 완료', result);

            // 백엔드에서 자동으로 노드/엣지가 생성되었으므로 그래프 리프레시
            await get().refreshGraph();
          } else {
            // 오프라인: 큐에 추가
            const beingIdForQueue = await getBeingId();
            if (!beingIdForQueue) {
              logger.warn('[GraphStore] enrichFromMemo: beingId 없음 — 인증 필요');
              return;
            }
            await enqueue(
              createConversationOperation(beingIdForQueue, {
                user_message: userMessage,
                assistant_response: assistantResponse,
              })
            );
            logger.log('[GraphStore] 오프라인 모드 - 대화 처리 작업 큐에 추가');
          }
        } catch (error) {
          logger.error('[GraphStore] enrichFromMemo 에러', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // ========================================================================
      // 그래프 검색
      // ========================================================================
      searchGraph: async (query) => {
        try {
          const { isOnline, graph } = get();

          if (isOnline) {
            // 온라인: API 검색 사용
            const beingId = await getBeingId();
            if (!beingId) {
              logger.warn('[GraphStore] searchGraph: beingId 없음 — 오프라인 검색으로 폴백');
              // beingId 없으면 로컬 검색으로 폴백
              const lowerQuery = query.toLowerCase();
              return graph.nodes.filter((node) =>
                node.label.toLowerCase().includes(lowerQuery) ||
                node.content?.toLowerCase().includes(lowerQuery)
              );
            }

            // 일반 검색 (graphApi가 이미 OntologyNode[]로 변환)
            const results = await graphApi.searchNodes(query, beingId);
            logger.log(`[GraphStore] 검색 결과: ${results.length}개 노드`);
            return results;
          } else {
            // 오프라인: 로컬 그래프에서 label 매칭
            const lowerQuery = query.toLowerCase();
            const matchedNodes = graph.nodes.filter((node) =>
              node.label.toLowerCase().includes(lowerQuery) ||
              node.content?.toLowerCase().includes(lowerQuery)
            );

            logger.log(`[GraphStore] 오프라인 검색 결과: ${matchedNodes.length}개 노드`);
            return matchedNodes;
          }
        } catch (error) {
          logger.error('[GraphStore] searchGraph 에러', error);
          return [];
        }
      },

      // ========================================================================
      // 오프라인 큐 동기화
      // ========================================================================
      syncPendingOperations: async () => {
        try {
          const { isOnline } = get();

          if (!isOnline) {
            logger.log('[GraphStore] 오프라인 상태 - 동기화 스킵');
            return;
          }

          logger.log('[GraphStore] 오프라인 큐 동기화 시작');

          const beingId = await getBeingId();
          if (!beingId) {
            logger.warn('[GraphStore] syncPendingOperations: beingId 없음 — 인증 필요');
            return;
          }

          // executor: 작업 타입별로 API 호출 (성공: true, 실패: false)
          const executor = async (operation: any): Promise<boolean> => {
            try {
              switch (operation.type) {
                case 'CREATE_NODE':
                  await graphApi.createNode(operation.payload, beingId);
                  return true;

                case 'CREATE_EDGE':
                  await graphApi.createEdge(operation.payload, beingId);
                  return true;

                case 'IMPORT':
                  await graphApi.importJson(operation.payload, beingId);
                  return true;

                case 'PROCESS_CONVERSATION':
                  await memoryApi.processConversation(operation.payload);
                  return true;

                default:
                  logger.warn(`[GraphStore] 알 수 없는 작업 타입: ${operation.type}`);
                  return false;
              }
            } catch (error) {
              logger.warn(`[GraphStore] 큐 작업 실패: ${operation.type}`, error);
              return false;
            }
          };

          // 큐 처리
          await processQueue(executor);
          logger.log('[GraphStore] 큐 동기화 완료');

          // 최신 그래프 상태 반영
          await get().refreshGraph();
        } catch (error) {
          logger.error('[GraphStore] syncPendingOperations 에러', error);
        }
      },

      // ========================================================================
      // 온라인 상태 체크
      // ========================================================================
      checkOnlineStatus: async () => {
        try {
          const isHealthy = await checkApiHealth();
          set({ isOnline: isHealthy });
          logger.log(`[GraphStore] API 상태: ${isHealthy ? '온라인' : '오프라인'}`);
        } catch (error) {
          logger.warn('[GraphStore] API 상태 체크 실패 (오프라인 간주)', error);
          set({ isOnline: false });
        }
      },

      // ========================================================================
      // 그래프 리프레시
      // ========================================================================
      refreshGraph: async () => {
        try {
          const beingId = await getBeingId();
          if (!beingId) {
            logger.warn('[GraphStore] refreshGraph: beingId 없음 — 인증 필요');
            return;
          }
          // graphApi.getGraph()는 이미 OntologyGraph 형식으로 변환된 결과를 반환
          const graph = await graphApi.getGraph(beingId);

          set({
            graph,
            lastSyncAt: new Date().toISOString(),
          });

          logger.log(
            `[GraphStore] 그래프 리프레시 완료 (노드: ${graph.nodes.length}, 엣지: ${graph.edges.length})`
          );
        } catch (error) {
          logger.error('[GraphStore] refreshGraph 에러', error);
        }
      },
    }),
    {
      // ======================================================================
      // Persist 설정
      // ======================================================================
      name: 'alive-graph-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // 그래프와 동기화 시간만 persist (isOnline 등은 제외)
        graph: state.graph,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);

export default useGraphStore;
