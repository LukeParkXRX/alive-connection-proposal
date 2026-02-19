/**
 * ALIVE Engine Memory API
 * 대화 기반 기억 생성 및 컨텍스트 관리
 */

import { apiFetch, getBeingId } from './client';

// === 타입 정의 ===

/** 대화 처리 요청 데이터 */
interface ProcessConversationRequest {
  user_message: string;
  assistant_response: string;
  entities?: { label: string; type: string }[];
  relations?: { source: string; target: string; relation: string }[];
}

/** 대화 처리 응답 */
interface ProcessConversationResponse {
  message_stored: boolean;
  entities_extracted: number;
  relations_extracted: number;
  memory_id: string;
  importance: number;
}

/** 대화 이력 아이템 */
interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

/** 컨텍스트 윈도우 응답 */
interface ContextResponse {
  context: string;
  conversation_count: number;
  long_term_count: number;
}

/** 통합(Consolidation) 응답 */
interface ConsolidateResponse {
  consolidated_count: number;
  new_entities: number;
  new_relations: number;
}

/** 기억 통계 응답 */
interface MemoryStatsResponse {
  total_conversations: number;
  short_term_count: number;
  short_term_unconsolidated: number;
  long_term_count: number;
  total_entities: number;
  entity_types: Record<string, number>;
  consolidation_runs: number;
  last_consolidation: string | null;
}

/** 기억 검색 응답 */
interface SearchMemoriesResponse {
  query: string;
  count: number;
  results: any[];
}

// === Memory API ===

export const memoryApi = {
  /**
   * 대화 턴 처리 — 메시지 저장 + 엔티티 추출 + 기억 생성
   * 메모 → 엔티티 추출에 사용되는 핵심 함수
   */
  processConversation: async (
    data: ProcessConversationRequest,
    beingId?: string
  ): Promise<ProcessConversationResponse> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<ProcessConversationResponse>(`/api/v1/beings/${id}/memory/conversation`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * 대화 이력 조회
   * @param limit 조회할 최대 메시지 수 (기본값: 20)
   */
  getConversationHistory: async (
    limit: number = 20,
    beingId?: string
  ): Promise<ConversationMessage[]> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<ConversationMessage[]>(
      `/api/v1/beings/${id}/memory/conversation?limit=${limit}`
    );
  },

  /**
   * 컨텍스트 윈도우 조회 (LLM 프롬프트용)
   * 포맷팅된 Markdown 형태로 반환
   */
  getContext: async (beingId?: string): Promise<ContextResponse> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<ContextResponse>(`/api/v1/beings/${id}/memory/context`);
  },

  /**
   * 기억 통합 (단기 → 장기)
   * 단기 기억을 장기 기억으로 변환하는 프로세스 실행
   */
  consolidate: async (beingId?: string): Promise<ConsolidateResponse> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<ConsolidateResponse>(`/api/v1/beings/${id}/memory/consolidate`, {
      method: 'POST',
    });
  },

  /**
   * 기억 통계 조회
   * 단기/장기 기억 카운트, 엔티티 타입별 분포 등
   */
  getStats: async (beingId?: string): Promise<MemoryStatsResponse> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<MemoryStatsResponse>(`/api/v1/beings/${id}/memory/stats`);
  },

  /**
   * 기억 검색 (단기/장기 통합)
   * 자연어 쿼리로 관련 기억을 검색
   */
  searchMemories: async (query: string, beingId?: string): Promise<SearchMemoriesResponse> => {
    const id = beingId || (await getBeingId());
    if (!id) throw new Error('Being ID가 설정되지 않았습니다.');

    return apiFetch<SearchMemoriesResponse>(
      `/api/v1/beings/${id}/memory/search?query=${encodeURIComponent(query)}`
    );
  },
};
