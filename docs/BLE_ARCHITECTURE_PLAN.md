# BLE 근접 감지 아키텍처 — 기술 분석 및 구현 계획

> 작성일: 2026-02-24
> 상태: Phase 1 (NFC v5 완료) → Phase 2 (BLE 신호 송출) 진행 예정

---

## 1. 현재 아키텍처 상태

### NFC 레이어 (v3~v5 진행, 버그 잔존)
- HCE로 `https://alive-connection.app/connect/{userId}` NDEF URL 브로드캐스트
- Foreground Dispatch로 태그 감지
- MainActivity.kt에서 NFC 인텐트 → ACTION_VIEW 변환
- **잔존 버그 5개** (아래 상세)

### BLE 레이어 (50% 구현)
- `react-native-ble-plx@3.5.1` — Central(스캔) 전용
- BLEScanner.ts — ✅ 동작 (RSSI 기반 근접 판정)
- BLEAdvertiser.ts — ❌ NO-OP (로그만 출력, 실제 송출 없음)
- ExchangeManager.ts — ✅ BLE+NFC 통합 조율 로직

### 서버 레이어 (100% 구현)
- handleAutomaticHandshake(userId) — Supabase 프로필 조회 + 저장
- interactions 테이블 기록
- ALIVE Engine 지식그래프 Person 노드 생성
- HandshakeSuccess 오버레이 UI

---

## 2. NFC 잔존 버그 목록 (v5 기준)

| # | 버그 | 심각도 | 원인 |
|---|------|--------|------|
| 1 | AndroidManifest 카테고리 이중 접두사 | CRITICAL | app.json `intentFilters`에서 풀네임 지정 → Expo가 접두사 중복 |
| 2 | onNewIntent()가 원본 NFC 인텐트 전달 | CRITICAL | `super.onNewIntent(intent)` — 원본 전달, VIEW 변환본 아님 |
| 3 | HCE가 https:// URL → 앱 선택 다이얼로그 | HIGH | 브라우저도 https:// 처리 가능 → 충돌 |
| 4 | Foreground Dispatch 콜백 미등록 타이밍 | MEDIUM | initialize() 시점에 콜백 없음 |
| 5 | BLE Advertiser NO-OP | HIGH | react-native-ble-plx는 Peripheral 미지원 |

---

## 3. BLE vs NFC 비교 분석

| 항목 | NFC | BLE |
|------|-----|-----|
| 유효 거리 | 1-4cm (물리 한계) | 10-30m (RSSI로 거리 제한 가능) |
| 앱 꺼진 상태 | ✅ 동작 (하드웨어 레벨) | ❌ 불가 (서비스 필요) |
| 앱 선택 다이얼로그 | ⚠️ 발생 (Android) | ✅ 없음 |
| 사용자 행동 | 폰을 맞대야 함 | 가까이만 가면 자동 |
| 양방향 동시 교환 | ❌ 한쪽씩 (리더/카드) | ✅ 양쪽 동시 감지 |
| 배터리 소모 | 없음 | Low Energy (미미) |
| OS 호환성 이슈 | Samsung NFC 스택 문제 다수 | 표준화 잘 되어있음 |

### 결론: BLE가 완전히 동작하면 NFC는 불필요

---

## 4. BLE 신호 송출 구현 방안

### 문제
`react-native-ble-plx`는 **Central 전용** — Peripheral(신호 송출) 모드 미지원

### 해결 방안 3가지

#### 방안 A: `react-native-ble-advertiser` 패키지
- npm: `react-native-ble-advertiser`
- Android: `BluetoothLeAdvertiser` 래핑
- iOS: `CBPeripheralManager` 래핑
- **장점**: 즉시 사용 가능, 커뮤니티 유지보수
- **단점**: Expo config plugin 없음 → 커스텀 플러그인 필요 (withHCE.js처럼)
- **난이도**: 중

#### 방안 B: 커스텀 Expo 네이티브 모듈
- Kotlin/Swift로 직접 구현
- GATT 서버 + userId Characteristic 제공
- BLEScanner.ts의 GATT 읽기 로직과 완벽 호환
- **장점**: 완전한 제어, 기존 BLEScanner와 정확히 맞는 인터페이스
- **단점**: 개발 시간 필요
- **난이도**: 상

#### 방안 C: BLE Manufacturer Data 방식 (GATT 서버 없이)
- 신호 송출 시 Manufacturer Data에 userId 직접 포함
- 스캔 시 GATT 연결 없이 Manufacturer Data에서 userId 추출
- **장점**: 연결 불필요 → 더 빠르고 안정적
- **단점**: BLEScanner.ts의 GATT 연결 로직 수정 필요
- **난이도**: 중하

### 권장: 방안 A (react-native-ble-advertiser) → 빠른 MVP

---

## 5. BLE 동작 시나리오 (구현 후)

```
앱 시작
  ↓
로그인 확인 → userId 획득
  ↓
BLE 신호 송출 시작: Service UUID + userId
  ↓
BLE 스캔 시작: ALIVE Service UUID 필터
  ↓
[상대방 감지] RSSI > -50dBm (약 30cm 이내)
  ↓
GATT 연결 → userId 읽기
  ↓
Supabase에서 상대방 프로필 조회
(이름, 회사, 직함, 아바타, 소셜링크)
  ↓
"김철수님을 추가하겠습니까?" 팝업
  ↓
[수락] → interactions 저장 + 지식그래프 + 로컬 저장
[거부] → 5분간 동일인 무시 (캐시 TTL)
```

---

## 6. 기존 코드 활용도

| 파일 | 역할 | BLE 전환 시 | 수정 필요 |
|------|------|------------|----------|
| `BLEScanner.ts` | BLE 스캔 + GATT 읽기 | 그대로 사용 | 없음 |
| `BLEAdvertiser.ts` | BLE 신호 송출 | **전면 재구현** | 핵심 작업 |
| `BLEExchangeService.ts` | 스캔+송출 통합 | 그대로 사용 | 최소 수정 |
| `ExchangeManager.ts` | BLE+NFC 통합 조율 | 그대로 사용 | NFC 비활성화 |
| `useConnectionStore.ts` | handleAutomaticHandshake | 그대로 사용 | 없음 |
| `HandshakeSuccess.tsx` | 성공 팝업 UI | 그대로 사용 | 없음 |
| `LocationService.ts` | GPS 위치 캡처 | 그대로 사용 | 없음 |
| `constants/ble.ts` | RSSI 임계값 등 | 그대로 사용 | 없음 |

### 핵심: BLEAdvertiser.ts 하나만 구현하면 전체 파이프라인 동작

---

## 7. RSSI 거리 매핑 (기존 설정)

```typescript
// constants/ble.ts
RSSI_THRESHOLD:  -50  // dBm → 약 30cm 이내 → 발견 이벤트
RSSI_VERY_CLOSE: -35  // dBm → 약 10cm 이내 → 자동 교환 트리거
```

| RSSI (dBm) | 추정 거리 | 동작 |
|------------|----------|------|
| -20 ~ -30 | 5cm 이내 | 즉시 교환 |
| -30 ~ -40 | 10-15cm | 자동 교환 트리거 |
| -40 ~ -50 | 15-30cm | 발견 알림 |
| -50 ~ -70 | 30cm-1m | 무시 |
| < -70 | 1m 이상 | 무시 |

---

## 8. 유사 서비스 레퍼런스

| 서비스 | 방식 | 설명 |
|--------|------|------|
| Apple AirDrop | BLE + Wi-Fi | BLE로 감지 → Wi-Fi로 전송. 우리와 동일 구조 |
| Samsung Quick Share | BLE + Wi-Fi | AirDrop과 같은 원리 |
| Happn | GPS (250m) | 스쳐 지나간 사람 매칭. 2억+ 다운로드 |
| AroundU | BLE (10-30m) | BLE 기반 소셜 디스커버리. 가장 유사 |
| Unilink | BLE | 대학생 BLE 소셜 네트워킹 (오픈소스) |

---

## 9. 구현 로드맵

### Phase 1 ✅ (완료) — NFC 기반 핸드셰이크
- HCE 브로드캐스트
- Foreground Dispatch
- MainActivity NFC 인텐트 변환
- Deep link 디바운싱
- **결과**: 작동하지만 Samsung 호환성 문제 잔존

### Phase 2 🔜 (다음) — BLE 신호 송출
1. `react-native-ble-advertiser` 설치 + Expo config plugin 작성
2. `BLEAdvertiser.ts` 실제 구현 (Service UUID + GATT 서버)
3. ExchangeManager에서 BLE를 primary로 전환
4. 테스트: 두 폰 앱 실행 → 10-20cm → 자동 감지 확인
5. NFC 레이어 비활성화 (옵션)

### Phase 3 (추후) — 고도화
- 백그라운드 BLE 스캔 (Android Foreground Service)
- iOS CBPeripheralManager 연동
- 배터리 최적화 (스캔 주기 조절)
- "수락 없이 자동 교환" 옵션 (설정)

---

## 10. 기술 제약 사항

1. **양쪽 앱 실행 필수**: BLE는 앱이 꺼지면 동작 불가 (백그라운드 서비스로 완화 가능)
2. **RSSI 정확도**: 환경(벽, 사람, 간섭)에 따라 ±30% 오차
3. **Android 12+ 권한**: BLUETOOTH_ADVERTISE 런타임 권한 필요 (app.json에 이미 선언됨)
4. **iOS 백그라운드**: BLE 송출은 백그라운드에서 제한적 (UUID만 포함, 이름 제거)
5. **동시 사용자 수**: BLE 스캔은 주변 모든 기기를 감지하므로, 네트워킹 행사에서 50명+ 시 필터링 필요
