/**
 * Offline Queue Unit Tests
 *
 * ALIVE Engine 오프라인 큐 동작 검증
 * - AsyncStorage 기반 큐 관리
 * - 재시도 로직 (최대 3회)
 * - 작업 타입별 처리
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
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
  type QueuedOperation,
} from '../offline-queue';

describe('Offline Queue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearQueue();
  });

  describe('Basic Queue Operations', () => {
    it('should enqueue operation', async () => {
      const operation = createNodeOperation('being-123', { type: 'person', name: 'Test' });

      await enqueue(operation);

      const queue = await getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'CREATE_NODE',
        beingId: 'being-123',
        retryCount: 0,
      });
    });

    it('should dequeue operation', async () => {
      const op1 = createNodeOperation('being-1', { type: 'person' });
      const op2 = createNodeOperation('being-2', { type: 'organization' });

      await enqueue(op1);
      await enqueue(op2);

      const dequeued = await dequeue();
      expect(dequeued?.beingId).toBe('being-1');

      const remaining = await getQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].beingId).toBe('being-2');
    });

    it('should return undefined when dequeuing empty queue', async () => {
      const result = await dequeue();
      expect(result).toBeUndefined();
    });

    it('should get queue size', async () => {
      expect(await getQueueSize()).toBe(0);

      await enqueue(createNodeOperation('being-1', {}));
      expect(await getQueueSize()).toBe(1);

      await enqueue(createEdgeOperation('being-2', {}));
      expect(await getQueueSize()).toBe(2);
    });

    it('should clear queue', async () => {
      await enqueue(createNodeOperation('being-1', {}));
      await enqueue(createNodeOperation('being-2', {}));

      expect(await getQueueSize()).toBe(2);

      await clearQueue();

      expect(await getQueueSize()).toBe(0);
    });
  });

  describe('Operation Creators', () => {
    it('should create CREATE_NODE operation', () => {
      const nodeData = { type: 'person', name: 'John Doe' };
      const operation = createNodeOperation('being-123', nodeData);

      expect(operation).toMatchObject({
        type: 'CREATE_NODE',
        payload: nodeData,
        beingId: 'being-123',
        retryCount: 0,
      });
      expect(operation.id).toBeDefined();
      expect(operation.createdAt).toBeDefined();
    });

    it('should create CREATE_EDGE operation', () => {
      const edgeData = { from: 'node-1', to: 'node-2', type: 'KNOWS' };
      const operation = createEdgeOperation('being-123', edgeData);

      expect(operation.type).toBe('CREATE_EDGE');
      expect(operation.payload).toEqual(edgeData);
    });

    it('should create IMPORT operation', () => {
      const jsonData = { nodes: [], edges: [] };
      const operation = createImportOperation('being-123', jsonData);

      expect(operation.type).toBe('IMPORT');
      expect(operation.payload).toEqual(jsonData);
    });

    it('should create PROCESS_CONVERSATION operation', () => {
      const conversationData = { messages: ['Hello', 'Hi'] };
      const operation = createConversationOperation('being-123', conversationData);

      expect(operation.type).toBe('PROCESS_CONVERSATION');
      expect(operation.payload).toEqual(conversationData);
    });
  });

  describe('Process Queue', () => {
    it('should process queue successfully', async () => {
      await enqueue(createNodeOperation('being-1', {}));
      await enqueue(createEdgeOperation('being-2', {}));

      const executor = jest.fn().mockResolvedValue(true);

      const result = await processQueue(executor);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(0);
      expect(executor).toHaveBeenCalledTimes(2);
      expect(await getQueueSize()).toBe(0);
    });

    it('should retry failed operations', async () => {
      await enqueue(createNodeOperation('being-1', {}));

      const executor = jest.fn()
        .mockResolvedValueOnce(false) // 첫 번째 실패
        .mockResolvedValueOnce(false) // 두 번째 실패
        .mockResolvedValueOnce(true);  // 세 번째 성공

      // 첫 번째 처리
      let result = await processQueue(executor);
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);

      // 두 번째 처리
      result = await processQueue(executor);
      expect(result.processed).toBe(0);
      expect(result.remaining).toBe(1);

      // 세 번째 처리
      result = await processQueue(executor);
      expect(result.processed).toBe(1);
      expect(result.remaining).toBe(0);

      expect(await getQueueSize()).toBe(0);
    });

    it('should remove operation after max retries', async () => {
      await enqueue(createNodeOperation('being-1', {}));

      const executor = jest.fn().mockResolvedValue(false);

      // 첫 번째 처리 (재시도 1/3)
      let result = await processQueue(executor);
      expect(result.remaining).toBe(1);

      // 두 번째 처리 (재시도 2/3)
      result = await processQueue(executor);
      expect(result.remaining).toBe(1);

      // 세 번째 처리 (재시도 3/3 - 최대 초과, 제거)
      result = await processQueue(executor);
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.remaining).toBe(0);

      expect(await getQueueSize()).toBe(0);
    });

    it('should handle executor exceptions', async () => {
      await enqueue(createNodeOperation('being-1', {}));

      const executor = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(true);

      // 첫 번째 처리 (예외 발생)
      let result = await processQueue(executor);
      expect(result.remaining).toBe(1);

      // 두 번째 처리 (예외 발생)
      result = await processQueue(executor);
      expect(result.remaining).toBe(1);

      // 세 번째 처리 (성공)
      result = await processQueue(executor);
      expect(result.processed).toBe(1);
      expect(result.remaining).toBe(0);
    });

    it('should process mixed success and failure', async () => {
      await enqueue(createNodeOperation('being-1', {}));
      await enqueue(createEdgeOperation('being-2', {}));
      await enqueue(createImportOperation('being-3', {}));

      const executor = jest.fn()
        .mockResolvedValueOnce(true)   // 첫 번째 성공
        .mockResolvedValueOnce(false)  // 두 번째 실패
        .mockResolvedValueOnce(true);  // 세 번째 성공

      const result = await processQueue(executor);

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.remaining).toBe(1);
      expect(await getQueueSize()).toBe(1);
    });

    it('should preserve operation data through retries', async () => {
      const nodeData = { type: 'person', name: 'Test User' };
      const operation = createNodeOperation('being-123', nodeData);
      await enqueue(operation);

      const executor = jest.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      // 첫 번째 처리 (실패)
      await processQueue(executor);

      // executor가 올바른 데이터로 호출되었는지 확인
      expect(executor.mock.calls[0][0]).toMatchObject({
        type: 'CREATE_NODE',
        payload: nodeData,
        beingId: 'being-123',
      });

      // 두 번째 처리 (성공)
      await processQueue(executor);

      // 재시도 시에도 동일한 데이터 유지
      expect(executor.mock.calls[1][0]).toMatchObject({
        type: 'CREATE_NODE',
        payload: nodeData,
        beingId: 'being-123',
      });
    });
  });

  describe('AsyncStorage Integration', () => {
    it('should persist queue to AsyncStorage', async () => {
      const operation = createNodeOperation('being-123', { type: 'person' });
      await enqueue(operation);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'alive-engine-pending-ops',
        expect.any(String)
      );

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const queue = JSON.parse(savedData);

      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'CREATE_NODE',
        beingId: 'being-123',
      });
    });

    it('should load queue from AsyncStorage', async () => {
      const mockQueue = [
        createNodeOperation('being-1', { type: 'person' }),
        createEdgeOperation('being-2', { type: 'KNOWS' }),
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockQueue)
      );

      const queue = await getQueue();

      expect(queue).toHaveLength(2);
      expect(queue[0].type).toBe('CREATE_NODE');
      expect(queue[1].type).toBe('CREATE_EDGE');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const queue = await getQueue();

      // 에러 발생 시 빈 배열 반환
      expect(queue).toEqual([]);
    });

    it('should handle empty AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('Concurrency and Edge Cases', () => {
    it('should handle multiple operations of same type', async () => {
      await enqueue(createNodeOperation('being-1', { type: 'person' }));
      await enqueue(createNodeOperation('being-2', { type: 'organization' }));
      await enqueue(createNodeOperation('being-3', { type: 'skill' }));

      const executor = jest.fn().mockResolvedValue(true);
      const result = await processQueue(executor);

      expect(result.processed).toBe(3);
      expect(executor).toHaveBeenCalledTimes(3);
    });

    it('should maintain operation order', async () => {
      const op1 = createNodeOperation('being-1', { order: 1 });
      const op2 = createNodeOperation('being-2', { order: 2 });
      const op3 = createNodeOperation('being-3', { order: 3 });

      await enqueue(op1);
      await enqueue(op2);
      await enqueue(op3);

      const executedOrder: number[] = [];
      const executor = jest.fn().mockImplementation((op: QueuedOperation) => {
        executedOrder.push((op.payload as any).order);
        return Promise.resolve(true);
      });

      await processQueue(executor);

      expect(executedOrder).toEqual([1, 2, 3]);
    });

    it('should generate unique operation IDs', () => {
      const op1 = createNodeOperation('being-1', {});
      const op2 = createNodeOperation('being-1', {});
      const op3 = createNodeOperation('being-1', {});

      expect(op1.id).not.toBe(op2.id);
      expect(op2.id).not.toBe(op3.id);
      expect(op1.id).not.toBe(op3.id);
    });
  });
});
