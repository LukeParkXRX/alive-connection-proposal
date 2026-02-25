/**
 * Graph Sync — 온라인/오프라인 그래프 동기화 서비스
 *
 * useGraphStore에서 추출됨. API 호출(온라인) 또는 큐 적재(오프라인) 담당.
 */

import { logger } from '@/lib/logger';
import { graphApi } from './graph-api';
import {
  enqueue,
  createNodeOperation,
  createEdgeOperation,
} from './offline-queue';
import type { OntologyNode, OntologyEdge } from './types';
import type { NodeBuildData, EdgeBuildData } from './graph-builders';

// ============================================================================
// 온라인: API 병렬 호출
// ============================================================================

/**
 * 노드/엣지를 API로 병렬 생성한다 (Promise.allSettled).
 * 개별 실패는 경고 로그만 남기고, 전체 실패를 throw하지 않는다.
 */
export async function executeOnline(
  nodes: NodeBuildData[],
  edges: EdgeBuildData[],
  beingId: string,
): Promise<void> {
  const nodeResults = await Promise.allSettled(
    nodes.map((node) => graphApi.createNode(node, beingId))
  );
  nodeResults.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      logger.log(`[GraphSync] 노드 생성 성공: ${nodes[i].label}`);
    } else {
      logger.warn(`[GraphSync] 노드 생성 실패: ${nodes[i].label}`, result.reason);
    }
  });

  const edgeResults = await Promise.allSettled(
    edges.map((edge) => graphApi.createEdge(edge, beingId))
  );
  edgeResults.forEach((result, i) => {
    const edge = edges[i];
    if (result.status === 'fulfilled') {
      logger.log(`[GraphSync] 엣지 생성 성공: ${edge.source} → ${edge.relation} → ${edge.target}`);
    } else {
      logger.warn(`[GraphSync] 엣지 생성 실패: ${edge.source} → ${edge.relation} → ${edge.target}`, result.reason);
    }
  });
}

// ============================================================================
// 오프라인: 큐 적재
// ============================================================================

/**
 * 노드/엣지를 오프라인 큐에 적재한다.
 */
export async function enqueueOffline(
  nodes: NodeBuildData[],
  edges: EdgeBuildData[],
  beingId: string,
): Promise<void> {
  for (const node of nodes) {
    await enqueue(createNodeOperation(beingId, node));
  }
  for (const edge of edges) {
    await enqueue(createEdgeOperation(beingId, edge));
  }
  logger.log('[GraphSync] 오프라인 모드 - 큐에 작업 추가');
}

// ============================================================================
// 낙관적 업데이트용 로컬 데이터 빌더
// ============================================================================

/** 오프라인 낙관적 업데이트용 노드 생성 */
export function buildOptimisticNodes(nodes: NodeBuildData[]): OntologyNode[] {
  return nodes.map((node) => ({
    id: `local_${Date.now()}_${Math.random()}`,
    label: node.label,
    type: node.type as OntologyNode['type'],
    content: node.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

/** 오프라인 낙관적 업데이트용 엣지 생성 */
export function buildOptimisticEdges(edges: EdgeBuildData[]): OntologyEdge[] {
  return edges.map((edge) => ({
    id: `local_${Date.now()}_${Math.random()}`,
    source: edge.source,
    target: edge.target,
    relation: edge.relation,
    createdAt: new Date().toISOString(),
  }));
}
