# ALIVE Connection — 프로젝트 규칙

## 프로젝트 개요

BLE 기반 제로입력 관계 지능 플랫폼. 스마트폰을 가까이 가져다 대면 양쪽 사용자의 프로필이 자동 교환되고, 만남의 맥락(시간, 장소)이 자동 기록된다.

- **교환 방식**: BLE (Bluetooth Low Energy) 양방향 동시 교환
- **프레임워크**: React Native 0.73 (Expo 50 Bare Workflow) + TypeScript 5.3
- **백엔드**: Supabase (Auth + PostgreSQL + Realtime)
- **지식그래프**: ALIVE Engine (FastAPI + Neo4j) — 오프라인 큐 지원
- **웹 대시보드**: React 19 + Vite 7 + Tailwind CSS 4 (Vercel 배포)
- **빌드**: EAS Build (Android/iOS)

> NFC는 완전히 제거되었다. NFC 관련 코드를 추가하지 않는다.

## 기술 스택

| 범주 | 기술 | 버전 |
|------|------|------|
| 모바일 | React Native + Expo (Bare) | 0.73.6 / ~50.0 |
| 언어 | TypeScript | ^5.3.3 |
| 상태관리 | Zustand | ^4.4.7 |
| BLE Central | react-native-ble-plx | ^3.5.1 |
| BLE Peripheral | Custom AliveBlePeripheral (Kotlin/Swift) | 자체 구현 |
| 인증/DB/실시간 | Supabase JS | ^2.39.0 |
| 내비게이션 | React Navigation v6 | 6.x |
| 위치 | expo-location | ~16.5.2 |
| 로컬 저장 | AsyncStorage | 1.21.0 |
| 웹 대시보드 | React 19 + Vite 7 | — |

## BLE 프로토콜 참조

```
Service UUID:       A11FE000-C0FF-EC10-8000-000500D10000
Char userId:        A11FE001-C0FF-EC10-8000-000500D10000
Char ExchangeReq:   A11FE002-C0FF-EC10-8000-000500D10000
Char ExchangeRes:   A11FE003-C0FF-EC10-8000-000500D10000

Manufacturer Data Signature: 0xA1 0x1F
Fast Path: Manufacturer Data에서 userId 추출 (~100ms)
GATT Fallback: Characteristic 읽기 (~10s)

RSSI -50 dBm → 약 30cm (발견)
RSSI -35 dBm → 약 10cm (자동 교환 트리거)
Discovery Cache TTL: 5분
GATT Connection Timeout: 10초
```

## 교환 파이프라인

```
BLEScanner (감지)
  → BLEExchangeService (userId 추출)
    → ExchangeManager (교환 조율)
      → useConnectionStore.handleAutomaticHandshake()
        → Supabase interactions 저장
        → ALIVE Engine Person 노드 생성
        → HandshakeSuccess 오버레이 표시
```

## 디렉토리 구조

```
src/
  screens/             → 6개 화면
    LoginScreen.tsx          Supabase OAuth 로그인
    ExchangeReadyScreen.tsx  BLE 교환 메인 (PulseAnimation + RequestSheet)
    TimelineScreen.tsx       만남 타임라인 (날짜 그룹핑, 검색)
    ProfileScreen.tsx        내 프로필 편집
    ProfileDetailScreen.tsx  연결 상대 상세 + 메모
    ChatScreen.tsx           1:1 실시간 메시지
  store/               → 6개 Zustand 스토어
    useAuthStore.ts          세션 + DB 유저
    useConnectionStore.ts    타임라인 + 자동 핸드셰이크
    useExchangeStore.ts      교환 UI 상태
    useProfileStore.ts       프로필 카드
    useMessageStore.ts       실시간 메시지
    useGraphStore.ts         ALIVE Engine 지식그래프
  services/
    ble/                → BLE 교환 서비스
      BLEScanner.ts          스캔 (Fast Path + GATT Fallback)
      BLEAdvertiser.ts       광고 (네이티브 모듈 래핑)
      BLEExchangeService.ts  스캔+광고 통합
    exchange/           → 교환 매니저
      ExchangeManager.ts     BLE 교환 생명주기 관리
    location/           → 위치 서비스
      LocationService.ts     GPS 캡처 (3초 타임아웃 + 최근 위치 폴백)
    messaging/          → 메시징
      realtime.ts            Supabase Realtime 구독
      storage.ts             메시지 퍼시스턴스
      types.ts               메시지 타입
    supabase/           → Supabase 클라이언트
      client.ts              초기화 + 설정
      mappers.ts             데이터 변환
    alive-engine/       → ALIVE Engine 통합
      client.ts              HTTP 클라이언트 (apiFetch, ensureBeingExists)
      graph-api.ts           지식그래프 CRUD
      memory-api.ts          메모리/대화 API
      types.ts               OntologyNode, OntologyEdge, OntologyGraph
      constants.ts           8 도메인, 21 노드 타입, 37 관계
      offline-queue.ts       AsyncStorage 기반 오프라인 큐 (3회 재시도)
  components/
    HandshakeSuccess/        교환 성공 오버레이
    exchange/                PulseAnimation, ExchangeRequestSheet
    ErrorBoundary.tsx        에러 바운더리
  hooks/               → useExchangeManager, useResponsive, useThemeColors
  constants/           → ble.ts, api.ts, theme.ts
  types/               → 핵심 타입 정의
  navigation/          → AppNavigator (Tab + Stack)
  lib/                 → logger

plugins/
  ble-peripheral/      → 커스텀 네이티브 BLE Peripheral 모듈
    AliveBlePeripheralModule.kt     Android (BluetoothGattServer + Advertiser)
    AliveBlePeripheralModule.swift  iOS (CBPeripheralManager)
    AliveBlePeripheralBridge.m      ObjC → Swift 브릿지

withBLEPeripheral.js   → Expo Config Plugin (네이티브 모듈 빌드 시 주입)
server/                → 백엔드 REST API (Express)
web/                   → 웹 대시보드 (React 19 + Vite 7, Vercel 배포)
database/              → DB 스키마 (schema.sql, expansion_schema.sql)
scripts/               → setup-mac.sh (개발환경 원클릭 세팅)
docs/                  → 프로젝트 문서
```

## ALIVE Engine 통합 규칙

- 유저 매핑: `Supabase users.id === ALIVE Engine being_id` (1:1)
- 오프라인 전략: 네트워크 실패 시 AsyncStorage 큐에 저장, 재연결 시 자동 동기화
- `graphApi.createNode(nodeData, beingId)` — data first, beingId second
- `graphApi.getGraph()`는 `OntologyGraph`를 직접 반환 — 이중 변환 불필요
- `QueuedOperation.payload` (`.data`가 아님)
- `processQueue` executor는 `Promise<boolean>` 반환
- AsyncStorage는 비동기 — `getBeingId()` 호출 시 await 필수

## 설치된 플러그인 & 스킬 자동 발동 규칙

아래 플러그인이 프로젝트에 활성화되어 있다. **사용자가 별도로 지시하지 않아도**, 작업 상황에 맞는 스킬을 자동 판단하여 발동해야 한다.

### 자동 발동 매트릭스

| 플러그인 | 자동 발동 조건 | 발동 방식 |
|---|---|---|
| **frontend-design** | UI 컴포넌트/화면 신규 생성 또는 대폭 수정 시 | 디자인 씽킹 → 대담한 미적 방향 설정 후 코드 작성 |
| **feature-dev** | 새 기능 개발 요청 시 (3개+ 파일 변경 예상) | `/feature-dev` 워크플로우로 탐색→설계→구현→리뷰 |
| **skill-creator** | 반복 작업 패턴 3회 이상 감지 시 | 커스텀 스킬 생성 제안 → 사용자 승인 후 생성 |
| **typescript-lsp** | TS 파일 수정 시 항상 | 타입 에러 자동 감지 |
| **security-guidance** | 인증/토큰/개인정보 관련 코드 수정 시 | 보안 취약점 자동 경고 |
| **supabase** | DB 스키마, 인증, 스토리지 관련 작업 시 | Supabase MCP로 직접 조회/수정 |

### 발동 우선순위

1. **안전**: security-guidance는 항상 활성 (인증/토큰/개인정보 코드에서 자동 경고)
2. **품질**: typescript-lsp는 TS 파일 작업 시 항상 활성
3. **워크플로우**: feature-dev는 기능 단위 작업에서 자동 발동
4. **디자인**: frontend-design은 UI 작업에서 자동 발동
5. **데이터**: supabase는 백엔드/DB 작업에서 자동 발동
6. **메타**: skill-creator는 반복 패턴 감지 시에만 제안

### 스킬 발동 행동 규칙

- 스킬이 유용하다고 판단되면 **묻지 않고 즉시 발동**한다 (사용자가 승인한 룰).
- 단, skill-creator로 새 스킬을 생성할 때는 사용자 확인을 받는다.
- 여러 스킬이 동시에 적용 가능하면 병렬로 활용한다.
- 스킬 발동 시 어떤 스킬을 왜 사용하는지 한 줄로 알려준다.

### BLE/네이티브 모듈 작업 시 추가 규칙

- `plugins/ble-peripheral/` 네이티브 코드 수정 시 → Android(Kotlin) + iOS(Swift) 동시 업데이트
- BLE 프로토콜 변경 시 → `src/constants/ble.ts`와 네이티브 모듈 양쪽 동기화
- `withBLEPeripheral.js` Config Plugin 수정 시 → `npx expo prebuild` 필요

## 빌드 & 테스트 명령어

```bash
npm start              # Expo 개발 서버
npm run android        # Android 실행
npm run ios            # iOS 실행
npm run dashboard      # 웹 대시보드 (web/ 폴더)
npm test               # Jest 테스트
npm run lint           # ESLint
npx expo prebuild      # 네이티브 디렉토리 재생성
eas build              # EAS 클라우드 빌드
```

## 현재 MVP 상태

- **MVP 1 (Core BLE Connection)**: 완료 — BLE 교환, 위치, 타임라인, 프로필, 메시징, 웹 대시보드
- **MVP 2 (Relationship Graph)**: 다음 — 그래프 시각화, 태그, 백그라운드 BLE, Apple Sign-In
- **MVP 3 (Relationship Intelligence)**: 계획 — AI 인사이트, 소개 추천, 네트워킹 리포트
