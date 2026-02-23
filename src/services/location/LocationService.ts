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

      // 1. 빠른 응답을 위해 마지막으로 알려진 위치를 먼저 시도
      let loc = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 5, // 5분이내 데이터면 사용
      });

      // 2. 최근 위치가 없으면 현재 위치 요청 (단, 무한 로딩 방지를 위해 3초 타임아웃)
      if (!loc) {
        const fetchCurrent = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Location timeout')), 3000)
        );

        try {
          loc = (await Promise.race([fetchCurrent, timeout])) as Location.LocationObject;
        } catch (e) {
          console.warn('[Location] 현재 위치 요청 타임아웃 또는 실패', e);
          return null;
        }
      }

      if (!loc) return null;

      // 역지오코딩 (이 부분도 너무 오래 걸릴 수 있으므로, 2초 타임아웃 적용)
      let address: Location.LocationGeocodedAddress | null = null;
      try {
        const reverseGeocode = Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        const geocodeTimeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Geocode timeout')), 2000)
        );

        const results = (await Promise.race([reverseGeocode, geocodeTimeout])) as Location.LocationGeocodedAddress[];
        address = results?.[0] || null;
      } catch {
        console.warn('[Location] 역지오코딩 타임아웃 또는 실패');
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
