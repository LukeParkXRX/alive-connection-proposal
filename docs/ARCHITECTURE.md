# ALIVE Connection — 아키텍처

> BLE 기반 제로입력 관계 지능 플랫폼
> 최종 갱신: 2026-02-25

---

## 1. 시스템 개요

### 한 줄 정의
스마트폰을 가까이 대면 양쪽 사용자의 프로필이 BLE로 자동 교환되고, 만남의 맥락(시간, 장소)이 자동 기록되는 관계형 네트워킹 플랫폼.

### 핵심 UX 원칙
- **Zero-Input**: 폰 근접만으로 모든 로그 자동화
- **Context-Aware**: 시점, 장소 자동 태깅
- **Cross-Platform**: iPhone ↔ Android 완벽 호환

### 제품 비전 (3 Phase)
1. **Phase 1 (완료)**: Seamless Handshake — BLE 근접 교환 + 위치/시간 자동 기록
2. **Phase 2 (다음)**: Relationship Graph — 관계 강도 측정, 그래프 시각화
3. **Phase 3 (계획)**: Relationship Intelligence — AI 기반 관계 인사이트

### 상위 생태계
ALIVE Connection은 XRX Technology의 ALIVE 플랫폼에 속한다:
- **OntologyHub.ai**: 지식 그래프 설계 웹 플랫폼
- **ALIVE Engine**: AI 캐릭터 구동 엔진 (Orchestrator + Hybrid RAG + Memory Manager)
- **ALIVE Connection**: 사람 간 관계를 온톨로지 그래프로 축적하는 모바일 앱 ← 이 프로젝트

---

## 2. 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────┐
│               ALIVE Connection App                │
├──────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Layer 1     │  │      Layer 2             │  │
│  │  BLE         │  │      Server Exchange     │  │
│  │  Discovery   │  │                          │  │
│  │              │  │  • Supabase 프로필 조회   │  │
│  │  • 기기 감지  │  │  • interactions 저장     │  │
│  │  • userId    │  │  • GPS 위치 태깅         │  │
│  │    교환      │  │  • ALIVE Engine          │  │
│  │  • RSSI 근접 │  │    지식그래프 노드 생성   │  │
│  └──────┬───────┘  └──────────┬───────────────┘  │
│         └────────────┬────────┘                   │
│               ┌──────▼──────┐                     │
│               │  Exchange   │                     │
│               │  Manager    │                     │
│               └──────┬──────┘                     │
├──────────────────────┼───────────────────────────┤
│               ┌──────▼──────┐                     │
│               │  Zustand    │                     │
│               │  Stores (6) │                     │
│               └─────────────┘                     │
└──────────────────────────────────────────────────┘
                       │
                ┌──────▼──────┐
                │  Supabase   │
                │  Backend    │
                ├─────────────┤
                │ • Auth      │
                │ • PostgreSQL│
                │ • Realtime  │
                └──────┬──────┘
                       │
                ┌──────▼──────┐
                │ ALIVE Engine│
                ├─────────────┤
                │ • FastAPI   │
                │ • Neo4j     │
                │ (지식그래프) │
                └─────────────┘
```

---

## 3. BLE 교환 파이프라인

### 전체 흐름

```
1. 앱 시작 (App.tsx)
   ├─ Supabase Auth 세션 복원
   ├─ DB User 프로필 로드
   ├─ ALIVE Engine 지식그래프 초기화 (비동기)
   └─ Deep Link 리스너 등록

2. ExchangeReadyScreen 진입
   ├─ BLEExchangeService.startDiscovery(userId)
   │  ├─ BLEAdvertiser.startAdvertising() ← 네이티브 모듈
   │  └─ BLEScanner.startScanning() ← react-native-ble-plx
   └─ PulseAnimation 시작

3. 상대방 감지
   ├─ RSSI 필터링 (-50dBm 이상만)
   ├─ Fast Path: Manufacturer Data에서 userId 추출 (~100ms)
   │  └─ 실패 시 GATT 연결 Fallback (~10s)
   └─ ExchangeEvent { type: 'discovered' }

4. RSSI -35dBm 이상 → 자동 교환 트리거
   └─ ExchangeRequestSheet 표시 → 사용자 승인

5. 서버 저장
   ├─ LocationService.getCurrentLocation() (3초 타임아웃)
   ├─ Supabase.interactions.insert()
   ├─ ALIVE Engine.createNode(Person)
   └─ ALIVE Engine.createEdge(MET_AT)

6. HandshakeSuccess 오버레이 표시
```

### Manufacturer Data 바이너리 포맷 (Fast Path)
```
[0xA1][0x1F][version: 1byte][type: 1byte][userId: 16bytes]
Signature: 0xA1 0x1F (ALIVE 시그니처)
Total: 20 bytes
```

---

## 4. 네이티브 모듈 아키텍처

### 왜 커스텀 네이티브 모듈인가
`react-native-ble-plx`는 Central(스캔) 전용이다. Peripheral(광고/GATT 서버) 기능이 없다.
`react-native-ble-advertiser` 대신 커스텀 모듈을 선택한 이유:
- GATT 서버와 광고를 단일 모듈에서 제어
- Expo Config Plugin으로 빌드 자동화
- Fast Path Manufacturer Data 커스텀 인코딩 지원

### Android (Kotlin)
`plugins/ble-peripheral/AliveBlePeripheralModule.kt`
- `BluetoothGattServer` + `BluetoothLeAdvertiser`
- `startPeripheral(serviceUuid, charUuid, userId)`
- Characteristic read 시 userId를 UTF-8로 응답

### iOS (Swift)
`plugins/ble-peripheral/AliveBlePeripheralModule.swift`
- `CBPeripheralManager`
- 동일한 `startPeripheral` / `stopPeripheral` 인터페이스
- ObjC Bridge: `AliveBlePeripheralBridge.m`

### Config Plugin
`withBLEPeripheral.js`
- Android: 네이티브 모듈 파일 복사 + 패키지 등록
- iOS: Info.plist BLE 권한, 백그라운드 모드 설정

---

## 5. 데이터 모델

### Supabase (PostgreSQL)
```sql
users              — 프로필 (name, bio, avatar, social_links JSONB)
profile_cards      — 다중 명함 (business/casual 모드)
interactions       — 만남 기록 (source→target, location, memo, status)
messages           — 1:1 메시지 (Supabase Realtime)
notifications      — 알림
```

### ALIVE Engine (Neo4j)
- **8 도메인**: Identity, Personality, Knowledge, Relationships, Experiences, Preferences, Goals, Context
- **21 노드 타입**: person, organization, skill, life_event, memory 등
- **37 관계**: KNOWS, COLLEAGUE_OF, FRIEND_OF, WORKS_AT, SKILLED_IN 등

---

## 6. 상태 관리

6개 Zustand 스토어:

| 스토어 | 역할 | 퍼시스턴스 |
|--------|------|-----------|
| `useAuthStore` | Supabase 세션 + DB User | 세션 토큰 |
| `useConnectionStore` | 타임라인 + 자동 핸드셰이크 | AsyncStorage |
| `useExchangeStore` | 교환 UI 상태 (모달, 시트) | 없음 (휘발성) |
| `useProfileStore` | 프로필 카드 관리 | AsyncStorage |
| `useMessageStore` | 실시간 메시지 | Supabase |
| `useGraphStore` | ALIVE Engine 지식그래프 | AsyncStorage + 오프라인 큐 |

---

## 7. 웹 대시보드

React 19 + Vite 7 + Tailwind CSS 4, Vercel 배포.

```
web/src/
├── App.tsx              — 메인 레이아웃
├── components/
│   ├── Sidebar.tsx      — 타임라인 사이드바
│   ├── ConnectionDetail.tsx — 연결 상세
│   ├── ChatPanel.tsx    — 채팅 패널
│   └── LoginScreen.tsx  — 로그인
├── hooks/
│   ├── useMediaQuery.ts — 반응형
│   └── useDarkMode.ts   — 다크모드
└── lib/
    └── supabase.ts      — Supabase 클라이언트
```

---

## 8. 알려진 제약사항

1. **양쪽 앱 실행 필수**: BLE는 앱이 꺼지면 동작 안 함 (백그라운드 서비스로 개선 예정)
2. **RSSI 정확도**: 환경(벽, 사람)에 따라 ±30% 오차
3. **iOS 백그라운드 광고**: UUID만 포함, 이름 제거 (OS 제약)
4. **50명+ 동시 감지**: 네트워킹 행사에서 필터링 로직 필요
5. **Android 12+**: `BLUETOOTH_ADVERTISE` 런타임 권한 필요 (이미 처리됨)
