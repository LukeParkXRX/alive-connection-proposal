import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// 타입 정의
// ============================================

/**
 * 큐에 저장되는 작업 타입
 */
export type OperationType = 'CREATE_NODE' | 'CREATE_EDGE' | 'IMPORT' | 'PROCESS_CONVERSATION';

/**
 * 큐에 저장되는 작업 인터페이스
 */
export interface QueuedOperation {
  id: string;           // 고유 ID (timestamp + random)
  type: OperationType;  // 작업 타입
  payload: unknown;     // API 호출에 필요한 데이터
  beingId: string;      // 대상 Being ID
  createdAt: string;    // ISO timestamp
  retryCount: number;   // 현재 재시도 횟수
}

/**
 * 큐 처리 결과
 */
export interface ProcessQueueResult {
  processed: number;  // 성공적으로 처리된 작업 수
  failed: number;     // 실패한 작업 수
  remaining: number;  // 남은 작업 수
}

// ============================================
// 상수
// ============================================

const STORAGE_KEY = 'alive-engine-pending-ops';
const MAX_RETRIES = 3;

// ============================================
// 내부 유틸리티 함수
// ============================================

/**
 * 고유 ID 생성
 * @returns timestamp 기반 고유 ID
 */
function generateId(): string {
  return Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

/**
 * AsyncStorage에서 큐 로드
 * @returns 큐에 저장된 작업 배열
 */
async function loadQueue(): Promise<QueuedOperation[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('[OfflineQueue] 큐 로드 실패:', error);
    return [];
  }
}

/**
 * AsyncStorage에 큐 저장
 * @param queue 저장할 작업 배열
 */
async function saveQueue(queue: QueuedOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[OfflineQueue] 큐 저장 실패:', error);
    throw error;
  }
}

// ============================================
// 공개 API
// ============================================

/**
 * 큐에 작업 추가
 * @param operation 추가할 작업
 */
export async function enqueue(operation: QueuedOperation): Promise<void> {
  const queue = await loadQueue();
  queue.push(operation);
  await saveQueue(queue);
  console.log(`[OfflineQueue] 작업 추가: ${operation.type} (ID: ${operation.id})`);
}

/**
 * 큐에서 첫 번째 작업 제거
 * @returns 제거된 작업 (없으면 undefined)
 */
export async function dequeue(): Promise<QueuedOperation | undefined> {
  const queue = await loadQueue();
  const operation = queue.shift();
  if (operation) {
    await saveQueue(queue);
    console.log(`[OfflineQueue] 작업 제거: ${operation.type} (ID: ${operation.id})`);
  }
  return operation;
}

/**
 * 현재 큐 조회
 * @returns 큐에 저장된 모든 작업
 */
export async function getQueue(): Promise<QueuedOperation[]> {
  return loadQueue();
}

/**
 * 큐 크기 조회
 * @returns 큐에 저장된 작업 수
 */
export async function getQueueSize(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}

/**
 * 큐 전체 삭제
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  console.log('[OfflineQueue] 큐 전체 삭제 완료');
}

/**
 * 큐 처리
 * @param executor 각 작업을 처리하는 함수 (성공 시 true, 실패 시 false 반환)
 * @returns 처리 결과 통계
 */
export async function processQueue(
  executor: (op: QueuedOperation) => Promise<boolean>
): Promise<ProcessQueueResult> {
  const queue = await loadQueue();
  let processed = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  for (const operation of queue) {
    try {
      const success = await executor(operation);

      if (success) {
        // 성공: 큐에서 제거
        processed++;
        console.log(`[OfflineQueue] 작업 성공: ${operation.type} (ID: ${operation.id})`);
      } else {
        // 실패: 재시도 카운트 증가
        operation.retryCount++;

        if (operation.retryCount >= MAX_RETRIES) {
          // 최대 재시도 횟수 초과: 큐에서 제거하고 경고 로그
          failed++;
          console.warn(
            `[OfflineQueue] 작업 최종 실패 (최대 재시도 초과): ${operation.type} (ID: ${operation.id})`
          );
        } else {
          // 재시도 가능: 큐에 유지
          remaining.push(operation);
          console.warn(
            `[OfflineQueue] 작업 실패 (재시도 ${operation.retryCount}/${MAX_RETRIES}): ${operation.type} (ID: ${operation.id})`
          );
        }
      }
    } catch (error) {
      // 예외 발생: 재시도 카운트 증가
      operation.retryCount++;

      if (operation.retryCount >= MAX_RETRIES) {
        failed++;
        console.error(
          `[OfflineQueue] 작업 처리 중 예외 발생 (최대 재시도 초과): ${operation.type} (ID: ${operation.id})`,
          error
        );
      } else {
        remaining.push(operation);
        console.error(
          `[OfflineQueue] 작업 처리 중 예외 발생 (재시도 ${operation.retryCount}/${MAX_RETRIES}): ${operation.type} (ID: ${operation.id})`,
          error
        );
      }
    }
  }

  // 남은 작업만 다시 저장
  await saveQueue(remaining);

  const result = {
    processed,
    failed,
    remaining: remaining.length,
  };

  console.log('[OfflineQueue] 큐 처리 완료:', result);
  return result;
}

// ============================================
// 작업 생성 헬퍼 함수
// ============================================

/**
 * CREATE_NODE 작업 생성
 * @param beingId 대상 Being ID
 * @param nodeData 노드 데이터
 * @returns 생성된 작업
 */
export function createNodeOperation(beingId: string, nodeData: unknown): QueuedOperation {
  return {
    id: generateId(),
    type: 'CREATE_NODE',
    payload: nodeData,
    beingId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

/**
 * CREATE_EDGE 작업 생성
 * @param beingId 대상 Being ID
 * @param edgeData 엣지 데이터
 * @returns 생성된 작업
 */
export function createEdgeOperation(beingId: string, edgeData: unknown): QueuedOperation {
  return {
    id: generateId(),
    type: 'CREATE_EDGE',
    payload: edgeData,
    beingId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

/**
 * IMPORT 작업 생성
 * @param beingId 대상 Being ID
 * @param jsonData 임포트할 JSON 데이터
 * @returns 생성된 작업
 */
export function createImportOperation(beingId: string, jsonData: unknown): QueuedOperation {
  return {
    id: generateId(),
    type: 'IMPORT',
    payload: jsonData,
    beingId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

/**
 * PROCESS_CONVERSATION 작업 생성
 * @param beingId 대상 Being ID
 * @param conversationData 대화 데이터
 * @returns 생성된 작업
 */
export function createConversationOperation(beingId: string, conversationData: unknown): QueuedOperation {
  return {
    id: generateId(),
    type: 'PROCESS_CONVERSATION',
    payload: conversationData,
    beingId,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}
