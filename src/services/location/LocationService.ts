/**
 * LocationService — 위치 서비스 추상화
 * expo-location 기반, 추후 react-native-geolocation-service로 교체 가능
 */

import * as Location from 'expo-location';
import type { LocationData } from '@/types';

class LocationService {
  private static instance: LocationService;

  static getInstance(): LocationService {
    if (!this.instance) {
      this.instance = new LocationService();
    }
    return this.instance;
  }

  /**
   * 현재 GPS 위치 획득 + 역지오코딩
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[Location] 위치 권한 거부됨');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 역지오코딩
      let address: Location.LocationGeocodedAddress | null = null;
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        address = results[0] || null;
      } catch {
        console.warn('[Location] 역지오코딩 실패');
      }

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address: address
          ? `${address.street || ''} ${address.city || ''}`.trim() || undefined
          : undefined,
        placeName: address?.name || undefined,
        city: address?.city || undefined,
        country: address?.country || undefined,
      };
    } catch (err) {
      console.warn('[Location] 위치 획득 실패:', err);
      return null;
    }
  }
}

export default LocationService;
