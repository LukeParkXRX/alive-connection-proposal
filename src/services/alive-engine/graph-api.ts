/**
 * ALIVE Engine Graph API
 *
 * Knowledge Graph 조작을 위한 API 클라이언트
 * ALIVE Engine의 지식 그래프 엔드포인트를 React Native 환경에서 호출
 */

import { apiFetch, ApiError, getBeingId, ensureBeingExists } from './client';
import type {
  OntologyGraph,
  OntologyNode,
  OntologyEdge,
  GraphStats,
  ApiGraphResponse,
  ApiGraphNode,
  ApiGraphEdge,
  ApiNodeResponse,
  ApiStatsResponse,
} from './types';

// ============================================================================
// 내부 변환 헬퍼 함수
// ============================================================================

/**
 * API 노드 배열을 OntologyNode 배열로 변환
 */
function toOntologyNodes(apiNodes: ApiGraphNode[]): OntologyNode[] {
  return apiNodes.map(toOntologyNode);
}

/**
 * API 노드를 OntologyNode로 변환
 */
function toOntologyNode(apiNode: ApiGraphNode): OntologyNode {
  return {
    id: apiNode.id,
    label: apiNode.label,
    type: apiNode.type as OntologyNode['type'],
    content: apiNode.content || undefined,
    metadata: apiNode.data as OntologyNode['metadata'],
    createdAt: apiNode.created_at || new Date().toISOString(),
    updatedAt: apiNode.created_at || new Date().toISOString(),
  };
}

/**
 * API 엣지 배열을 OntologyEdge 배열로 변환
 */
function toOntologyEdges(apiEdges: ApiGraphEdge[]): OntologyEdge[] {
  return apiEdges.map((edge, index) => ({
    id: `edge-${edge.from}-${edge.to}-${index}`,
    source: edge.from,
    target: edge.to,
    relation: edge.type,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * API 통계를 GraphStats로 변환
 */
function toGraphStats(apiStats: ApiStatsResponse): GraphStats {
  // node_types 배열을 Record로 변환
  const typeDistribution = apiStats.node_types.reduce(
    (acc, type) => {
      acc[type as OntologyNode['type']] = 0;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalNodes: apiStats.total_nodes,
    totalEdges: apiStats.total_edges,
    typeDistribution: typeDistribution as GraphStats['typeDistribution'],
  };
}

// ============================================================================
// Graph API
// ============================================================================

export const graphApi = {
  /**
   * 전체 지식 그래프 조회
   *
   * GET /api/v1/beings/{id}/knowledge
   *
   * - Being이 없으면 자동 생성 후 재시도
   * - 실패 시 빈 그래프 반환
   *
   * @param beingId - Being ID (선택적, 기본값: AsyncStorage에서 조회)
   * @returns 온톨로지 그래프 (nodes, edges)
   */
  getGraph: async (beingId?: string): Promise<OntologyGraph> => {
    try {
      const id = beingId || (await getBeingId());
      if (!id) {
        // Being ID가 없으면 빈 그래프 반환
        return { nodes: [], edges: [] };
      }

      const data = await apiFetch<ApiGraphResponse>(`/api/v1/beings/${id}/knowledge`);
      return {
        nodes: toOntologyNodes(data.nodes),
        edges: toOntologyEdges(data.edges),
      };
    } catch (err) {
      // Being 404 → 자동 생성 후 재시도
      if (err instanceof ApiError && err.status === 404 && beingId) {
        await ensureBeingExists(beingId);
        const data = await apiFetch<ApiGraphResponse>(`/api/v1/beings/${beingId}/knowledge`);
        return {
          nodes: toOntologyNodes(data.nodes),
          edges: toOntologyEdges(data.edges),
        };
      }

      // 기타 에러는 빈 그래프 반환 (오프라인 허용)
      console.warn('graphApi.getGraph 실패:', err);
      return { nodes: [], edges: [] };
    }
  },

  /**
   * 그래프 통계 조회
   *
   * GET /api/v1/beings/{id}/knowledge/stats
   *
   * @param beingId - Being ID (선택적)
   * @returns 그래프 통계 (노드/엣지 수, 타입 분포)
   */
  getStats: async (beingId?: string): Promise<GraphStats> => {
    try {
      const id = beingId || (await getBeingId());
      if (!id) {
        return { totalNodes: 0, totalEdges: 0, typeDistribution: {} as GraphStats['typeDistribution'] };
      }

      const data = await apiFetch<ApiStatsResponse>(`/api/v1/beings/${id}/knowledge/stats`);
      return toGraphStats(data);
    } catch (err) {
      console.warn('graphApi.getStats 실패:', err);
      return { totalNodes: 0, totalEdges: 0, typeDistribution: {} as GraphStats['typeDistribution'] };
    }
  },

  /**
   * 노드 생성
   *
   * POST /api/v1/beings/{id}/knowledge/nodes
   *
   * @param nodeData - 노드 데이터 (label, type, content)
   * @param beingId - Being ID (선택적)
   * @returns 생성된 노드
   */
  createNode: async (
    nodeData: { label: string; type: string; content?: string },
    beingId?: string
  ): Promise<OntologyNode> => {
    const id = beingId || (await getBeingId());
    if (!id) {
      throw new Error('Being ID가 없습니다. 먼저 Being을 생성하세요.');
    }

    const data = await apiFetch<ApiNodeResponse>(`/api/v1/beings/${id}/knowledge/nodes`, {
      method: 'POST',
      body: JSON.stringify({
        label: nodeData.label,
        type: nodeData.type,
        content: nodeData.content || '',
      }),
    });

    return toOntologyNode(data);
  },

  /**
   * 엣지 생성
   *
   * POST /api/v1/beings/{id}/knowledge/edges
   *
   * 주의: 백엔드는 from_id/to_id를 사용하지만, 프론트는 source/target 사용
   * 백엔드는 엣지 ID를 반환하지 않으므로 로컬에서 생성
   *
   * @param edgeData - 엣지 데이터 (source, target, relation)
   * @param beingId - Being ID (선택적)
   * @returns 생성된 엣지
   */
  createEdge: async (
    edgeData: { source: string; target: string; relation: string },
    beingId?: string
  ): Promise<OntologyEdge> => {
    const id = beingId || (await getBeingId());
    if (!id) {
      throw new Error('Being ID가 없습니다. 먼저 Being을 생성하세요.');
    }

    await apiFetch(`/api/v1/beings/${id}/knowledge/edges`, {
      method: 'POST',
      body: JSON.stringify({
        from_id: edgeData.source,
        to_id: edgeData.target,
        relation: edgeData.relation,
      }),
    });

    // 백엔드는 엣지 ID를 반환하지 않으므로 로컬 생성
    return {
      id: `edge-${Date.now()}`,
      source: edgeData.source,
      target: edgeData.target,
      relation: edgeData.relation,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * 노드 검색 (키워드 기반)
   *
   * GET /api/v1/beings/{id}/knowledge/search?query=...
   *
   * @param query - 검색 쿼리
   * @param beingId - Being ID (선택적)
   * @returns 검색된 노드 목록
   */
  searchNodes: async (query: string, beingId?: string): Promise<OntologyNode[]> => {
    try {
      const id = beingId || (await getBeingId());
      if (!id) {
        return [];
      }

      const data = await apiFetch<{ query: string; count: number; results: ApiGraphNode[] }>(
        `/api/v1/beings/${id}/knowledge/search?query=${encodeURIComponent(query)}`
      );

      return toOntologyNodes(data.results);
    } catch (err) {
      console.warn('graphApi.searchNodes 실패:', err);
      return [];
    }
  },

  /**
   * 시맨틱 검색 (하이브리드: 키워드 30% + 벡터 70%)
   *
   * GET /api/v1/beings/{id}/knowledge/semantic-search?query=...&limit=...
   *
   * @param query - 검색 쿼리
   * @param limit - 결과 개수 제한 (기본값: 10)
   * @param beingId - Being ID (선택적)
   * @returns 검색된 노드 목록
   */
  semanticSearch: async (query: string, limit = 10, beingId?: string): Promise<OntologyNode[]> => {
    try {
      const id = beingId || (await getBeingId());
      if (!id) {
        return [];
      }

      const data = await apiFetch<{ query: string; count: number; results: ApiGraphNode[] }>(
        `/api/v1/beings/${id}/knowledge/semantic-search?query=${encodeURIComponent(query)}&limit=${limit}`
      );

      return toOntologyNodes(data.results);
    } catch (err) {
      console.warn('graphApi.semanticSearch 실패:', err);
      return [];
    }
  },

  /**
   * JSON 데이터 임포트
   *
   * POST /api/v1/beings/{id}/knowledge/import
   *
   * @param jsonData - 임포트할 JSON 데이터
   * @param beingId - Being ID (선택적)
   * @returns 생성된 노드/엣지 수
   */
  importJson: async (
    jsonData: Record<string, unknown>,
    beingId?: string
  ): Promise<{ created_nodes: number; created_edges: number }> => {
    const id = beingId || (await getBeingId());
    if (!id) {
      throw new Error('Being ID가 없습니다. 먼저 Being을 생성하세요.');
    }

    const result = await apiFetch<{ created_nodes: number; created_edges: number; message: string }>(
      `/api/v1/beings/${id}/knowledge/import`,
      {
        method: 'POST',
        body: JSON.stringify({ data: jsonData }),
      }
    );

    return {
      created_nodes: result.created_nodes,
      created_edges: result.created_edges,
    };
  },
};
