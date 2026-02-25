# ALIVE Project Memory

## Architecture Transition: NFC → BLE (2026년 2월)

### 전환 배경
- NFC HCE 방식은 Android 간에만 작동, iOS에서 서드파티 P2P NFC가 제한적
- Samsung NFC 스택 호환성 문제 다수 발생 (인텐트 변환, 앱 선택 다이얼로그 등)
- iPhone ↔ Android 크로스 플랫폼 필수 → BLE를 기본 교환 레이어로 채택

### 핵심 결정 사항

1. **react-native-ble-advertiser 대신 커스텀 네이티브 모듈 선택**
   - 이유: GATT 서버와 광고를 단일 모듈에서 제어, Fast Path Manufacturer Data 인코딩 지원
   - 구현: Android `AliveBlePeripheralModule.kt`, iOS `AliveBlePeripheralModule.swift`

2. **Fast Path 프로토콜 설계**
   - Manufacturer Data에 userId를 바이너리로 직접 인코딩 (20바이트)
   - 시그니처: `0xA1 0x1F` (ALIVE 식별)
   - GATT 연결 없이 ~100ms 교환 → 사용자 체감 "즉시"

3. **NFC 레이어 완전 제거**
   - 커밋: `5657a17` (feat: NFC 제거 + BLE 양방향 교환 시스템 완성)
   - 제거된 파일: `src/services/nfc/`, `src/hooks/useNfcHandshake.ts`, `withHCE.js`
   - 앱 빌드 레이블: `BLE-v2`

4. **GPS 3초 타임아웃 + 최근 위치 폴백**
   - NFC 시절 실내에서 GPS 무한 대기 버그 있었음
   - `Promise.race([getCurrentPosition, 3초 setTimeout])` + `getLastKnownPositionAsync` 폴백

### 현재 BLE 구성
- Service UUID: `A11FE000-C0FF-EC10-8000-000500D10000`
- RSSI -50 dBm (발견), -35 dBm (자동 교환)
- Discovery Cache TTL: 5분
- Deep Link Debounce: 10초

### 알려진 제약사항
- 양쪽 앱 실행 필수 (백그라운드 BLE 미구현)
- RSSI ±30% 환경 오차
- iOS 백그라운드 광고 제한 (UUID만, 이름 제거)
- 50명+ 동시 감지 시 필터링 필요

### ALIVE Engine 통합 상태
- 지식그래프 API 연동 완료 (graph-api.ts)
- 오프라인 큐 구현 완료 (offline-queue.ts, AsyncStorage)
- 유저 매핑: Supabase users.id === ALIVE Engine being_id (1:1)
- 만남 시 Person 노드 + MET_AT 엣지 자동 생성

---

*갱신일: 2026-02-25*
