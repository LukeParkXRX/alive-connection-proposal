/**
 * ExchangeManager Unit Tests
 *
 * BLE 교환 로직 및 오프라인 큐 동작 검증
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ExchangeManager from '../ExchangeManager';
import { useAuthStore } from '@/store/useAuthStore';
import { useConnectionStore } from '@/store/useConnectionStore';
import { supabase } from '../../supabase/client';
import LocationService from '../../location/LocationService';

// Mock modules
jest.mock('../../supabase/client');
jest.mock('../../location/LocationService');
jest.mock('@/store/useAuthStore');
jest.mock('@/store/useConnectionStore');

describe('ExchangeManager', () => {
  let manager: ExchangeManager;
  const mockUserId = 'test-user-123';
  const mockPartnerId = 'partner-456';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = (ExchangeManager as any).getInstance();

    // Mock AuthStore
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      dbUser: {
        id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
      },
    });

    // Mock LocationService
    (LocationService.getInstance as jest.Mock).mockReturnValue({
      getCurrentLocation: jest.fn().mockResolvedValue({
        latitude: 37.5665,
        longitude: 126.9780,
        address: 'Seoul, South Korea',
        city: 'Seoul',
        country: 'South Korea',
      }),
    });
  });

  describe('acceptExchange', () => {
    it('should successfully accept exchange and save interaction', async () => {
      // Mock ConnectionStore
      const mockInteractionId = 'interaction-789';
      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: jest.fn().mockResolvedValue(mockInteractionId),
      });

      // Mock Supabase user query
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: mockPartnerId,
            name: 'Partner User',
            email: 'partner@example.com',
          },
          error: null,
        }),
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(mockPartnerId);
      expect(result?.interaction.id).toBe(mockInteractionId);
      expect(result?.interaction.exchangeMethod).toBe('ble');
    });

    it('should retry interaction save on failure', async () => {
      const mockSave = jest.fn()
        .mockResolvedValueOnce(null) // 첫 시도 실패
        .mockResolvedValueOnce(null) // 두 번째 시도 실패
        .mockResolvedValueOnce('interaction-retry-success'); // 세 번째 시도 성공

      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: mockSave,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockPartnerId, name: 'Partner' },
          error: null,
        }),
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      expect(mockSave).toHaveBeenCalledTimes(3);
      expect(result?.interaction.id).toBe('interaction-retry-success');
    });

    it('should save to offline queue when all retries fail', async () => {
      const mockSave = jest.fn().mockResolvedValue(null);

      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: mockSave,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockPartnerId, name: 'Partner' },
          error: null,
        }),
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      // 최대 3회 시도 (1회 + 2회 재시도)
      expect(mockSave).toHaveBeenCalledTimes(3);

      // 오프라인 큐에 저장 확인
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'alive-pending-interactions',
        expect.any(String)
      );

      // local ID로 생성 확인
      expect(result?.interaction.id).toMatch(/^local_/);
    });

    it('should create skeleton profile when partner not found', async () => {
      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: jest.fn().mockResolvedValue('interaction-123'),
      });

      // Supabase 조회 실패
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      expect(result).not.toBeNull();
      expect(result?.user.id).toBe(mockPartnerId);
      expect(result?.user.name).toBe('Unknown User'); // skeleton profile
    });

    it('should return null when user not logged in', async () => {
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        dbUser: null,
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      expect(result).toBeNull();
    });

    it('should include location data in interaction', async () => {
      const mockLocation = {
        latitude: 37.5665,
        longitude: 126.9780,
        address: 'Gangnam, Seoul',
        city: 'Seoul',
        country: 'South Korea',
      };

      (LocationService.getInstance as jest.Mock).mockReturnValue({
        getCurrentLocation: jest.fn().mockResolvedValue(mockLocation),
      });

      const mockSave = jest.fn().mockResolvedValue('interaction-123');
      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: mockSave,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockPartnerId, name: 'Partner' },
          error: null,
        }),
      });

      const result = await manager.acceptExchange(mockPartnerId, 'ble');

      expect(result?.interaction.location).toEqual(mockLocation);
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          location: mockLocation,
        })
      );
    });
  });

  describe('Offline Queue', () => {
    it('should persist pending interactions to AsyncStorage', async () => {
      const mockSave = jest.fn().mockResolvedValue(null);

      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: mockSave,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockPartnerId, name: 'Partner' },
          error: null,
        }),
      });

      // AsyncStorage mock setup
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await manager.acceptExchange(mockPartnerId, 'ble');

      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      expect(setItemCalls.length).toBeGreaterThan(0);

      const savedData = JSON.parse(setItemCalls[0][1]);
      expect(Array.isArray(savedData)).toBe(true);
      expect(savedData[0]).toHaveProperty('sourceUserId', mockUserId);
      expect(savedData[0]).toHaveProperty('targetUserId', mockPartnerId);
      expect(savedData[0]).toHaveProperty('metAt');
      expect(savedData[0]).toHaveProperty('location');
    });

    it('should append to existing queue', async () => {
      const existingQueue = [
        {
          sourceUserId: 'user-1',
          targetUserId: 'user-2',
          metAt: '2026-02-25T00:00:00.000Z',
          location: { latitude: 0, longitude: 0 },
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existingQueue));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const mockSave = jest.fn().mockResolvedValue(null);
      (useConnectionStore.getState as jest.Mock).mockReturnValue({
        saveInteractionToSupabase: mockSave,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: mockPartnerId, name: 'Partner' },
          error: null,
        }),
      });

      await manager.acceptExchange(mockPartnerId, 'ble');

      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const savedQueue = JSON.parse(setItemCalls[0][1]);

      expect(savedQueue).toHaveLength(2);
      expect(savedQueue[0]).toEqual(existingQueue[0]);
      expect(savedQueue[1]).toHaveProperty('targetUserId', mockPartnerId);
    });
  });

  describe('Exchange Event Listeners', () => {
    it('should notify listeners on exchange events', () => {
      const listener = jest.fn();
      manager.addEventListener(listener);

      const mockEvent = {
        type: 'discovered' as const,
        userId: mockPartnerId,
        rssi: -35,
      };

      // Emit event (using private method access for testing)
      (manager as any).emitEvent(mockEvent);

      expect(listener).toHaveBeenCalledWith(mockEvent);
    });

    it('should remove event listeners', () => {
      const listener = jest.fn();
      manager.addEventListener(listener);
      manager.removeEventListener(listener);

      const mockEvent = {
        type: 'discovered' as const,
        userId: mockPartnerId,
        rssi: -35,
      };

      (manager as any).emitEvent(mockEvent);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
