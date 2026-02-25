// ============================================================================
// ALIVE Engine Service - Barrel Export
// ============================================================================

// API 클라이언트 및 헬스 체크
export {
  ApiError,
  apiFetch,
  checkApiHealth,
  getBeingId,
  setBeingId,
  clearBeingId,
  ensureBeingExists,
  API_BASE,
} from './client';

// 타입 및 인터페이스
export * from './types';

// 상수 및 설정
export {
  DOMAIN_CLUSTERS,
  TYPE_TO_DOMAIN,
  NODE_TYPE_CONFIG,
  RELATION_TYPES,
  RELATION_ALIASES,
  getDomainForType,
  getDomainCluster,
  getNodeTypeConfig,
  normalizeRelation,
  getDomainClustersMap,
  getDomainClusterForType,
} from './constants';

// 그래프 API
export { graphApi } from './graph-api';

// 메모리 API
export { memoryApi } from './memory-api';

// 그래프 빌더 (순수 함수)
export {
  buildHandshakeGraph,
  type NodeBuildData,
  type EdgeBuildData,
  type HandshakeGraphData,
} from './graph-builders';

// 그래프 동기화 (온라인/오프라인)
export {
  executeOnline,
  enqueueOffline,
  buildOptimisticNodes,
  buildOptimisticEdges,
} from './graph-sync';

// 오프라인 큐
export {
  enqueue,
  dequeue,
  getQueue,
  getQueueSize,
  clearQueue,
  processQueue,
  createNodeOperation,
  createEdgeOperation,
  createImportOperation,
  createConversationOperation,
  QueuedOperation,
  OperationType,
} from './offline-queue';
