# ALIVE Connection — 바이브코딩 프롬프트 모음
# 사용법: 각 프롬프트를 Claude Code / Cursor / Windsurf에 복사-붙여넣기
# 순서: Phase 0 → Phase 1 → ... 순서대로 진행
# 주의: 반드시 ALIVE_CONNECTION_DEV_CONTEXT.md를 먼저 읽게 한 후 프롬프트 실행

---

## 🔥 PHASE 0: 현황 분석 + 마이그레이션 계획 (가장 먼저 실행)

```
당신은 시니어 React Native 개발자입니다.

먼저 이 프로젝트 루트의 ALIVE_CONNECTION_DEV_CONTEXT.md 파일을 전체 읽어주세요.
이것이 우리가 목표하는 최종 아키텍처입니다.

그 다음, 현재 프로젝트의 기존 코드를 분석해주세요:

1. package.json — 현재 설치된 의존성과 스크립트 확인
2. app.json, eas.json — Expo 설정 확인 (Managed vs Bare Workflow)
3. App.tsx — 앱 진입점 구조 확인
4. src/ 폴더 — 기존 화면, 컴포넌트, 서비스 구조 파악
5. withHCE.js — 기존 HCE 플러그인 코드 분석
6. database/ 폴더 — 기존 로컬 DB 구조 파악
7. shared/ 폴더 — 공유 모듈 확인
8. android/ 폴더 — 네이티브 Android 코드 확인 (HCE 서비스 등)
9. web/ 폴더 — 기존 웹 관련 코드 확인

분석 후 다음을 보고해주세요:

[A] 현재 상태 요약
- 어떤 기능이 이미 구현되어 있는가
- 기술 스택: Expo Managed인지 Bare인지, 어떤 라이브러리를 쓰고 있는지
- HCE 기능의 현재 구현 상태

[B] DEV_CONTEXT.md 대비 Gap 분석
- 이미 있는 것 (재사용 가능)
- 수정/확장이 필요한 것
- 새로 만들어야 하는 것

[C] 마이그레이션 계획
- 기존 코드를 최대한 살리면서 Hybrid Architecture(BLE + Server + NFC)로 전환하는 단계별 계획
- 파일 이동/리네임이 필요한 것
- 새로 설치해야 할 npm 패키지

코드를 수정하지 말고, 분석과 계획만 제시해주세요.
```

---

## 🏗️ PHASE 1: 프로젝트 구조 리팩토링

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 프로젝트 디렉토리 구조를 참고하여,
현재 프로젝트를 다음과 같이 리팩토링해주세요.

[목표]
기존 코드를 최대한 보존하면서, DEV_CONTEXT.md의 디렉토리 구조에 맞게 재배치합니다.

[작업 내용]

1. src/ 하위 폴더 구조를 DEV_CONTEXT 기준으로 정리:
   - src/screens/ (auth, home, contacts, mycard, settings)
   - src/components/ (cards, exchange, common)
   - src/services/ (ble, nfc, exchange, location, api)
   - src/stores/ (Zustand 상태 관리)
   - src/hooks/
   - src/utils/
   - src/types/
   - src/constants/

2. 기존 화면/컴포넌트를 적절한 폴더로 이동
   - 기존 파일의 import 경로도 모두 업데이트

3. constants/ble.ts 파일 생성:
   - DEV_CONTEXT.md의 ALIVE_BLE_CONFIG 그대로 복사

4. constants/api.ts 파일 생성:
   - API_BASE_URL 등 환경 변수 참조

5. types/ 폴더에 타입 정의 파일 생성:
   - types/user.ts, types/exchange.ts, types/ble.ts, types/api.ts
   - DEV_CONTEXT.md의 데이터 모델 기준

기존 withHCE.js와 android/ 네이티브 코드는 건드리지 마세요.
기존 기능이 깨지지 않도록 주의해주세요.
```

---

## 📡 PHASE 2: BLE 서비스 구현 (핵심)

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 BLE 상세 스펙과 ExchangeManager를 참고하여,
BLE 근접 교환 서비스를 구현해주세요.

[사전 작업]
1. 필요한 패키지 설치:
   - react-native-ble-plx (BLE Central)
   - react-native-ble-advertiser (BLE Peripheral) — 또는 네이티브 모듈
   - 설치 후 iOS/Android 네이티브 설정도 해주세요 (Info.plist, AndroidManifest)

[구현할 파일]

1. src/services/ble/BLEScanner.ts
   - BLE Central 모드: ALIVE_SERVICE_UUID 필터링 스캔
   - RSSI 임계값 기반 근접 판정 (-50dBm)
   - 포그라운드 스캔 (2초 간격)
   - 중복 발견 방지 (동일 기기 5분 캐싱)

2. src/services/ble/BLEAdvertiser.ts
   - BLE Peripheral 모드: ALIVE_SERVICE_UUID + userId 해시 광고
   - iOS: CBPeripheralManager 네이티브 브릿지 필요 시 구현
   - Android: BluetoothLeAdvertiser 네이티브 브릿지 필요 시 구현

3. src/services/ble/BLEExchangeService.ts
   - Scanner + Advertiser 통합
   - GATT 연결 → userId Characteristic 읽기
   - BLEState 상태 머신 관리
   - EventEmitter 패턴으로 이벤트 발행

4. src/stores/bleStore.ts
   - Zustand 스토어: BLE 상태, 발견된 기기 목록, 스캔 상태

5. src/hooks/useBLEExchange.ts
   - 커스텀 훅: BLE 서비스 제어 + UI 상태 연동

[테스트]
- 실제 디바이스 2대에서 서로를 발견하는지 확인하는 방법도 알려주세요.

DEV_CONTEXT.md의 BLE 상세 스펙 섹션을 정확히 따라주세요.
특히 Service UUID, Characteristic UUID, RSSI 임계값을 그대로 사용하세요.
```

---

## 🔌 PHASE 3: NFC/HCE 서비스 통합

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 NFC/HCE 상세 스펙을 참고하여,
기존 withHCE.js와 android/ 네이티브 HCE 코드를 새 아키텍처에 통합해주세요.

[현황]
- withHCE.js 파일에 기존 HCE Expo 플러그인이 있음
- android/ 폴더에 기존 네이티브 HCE 서비스 코드가 있을 수 있음
- 이 기존 코드를 최대한 활용

[구현할 파일]

1. src/services/nfc/NFCExchangeService.ts
   - react-native-nfc-manager 사용
   - NDEF 태그 감지 → ALIVE 페이로드 파싱
   - NDEF 쓰기 (Android: 내 정보를 NFC로 방출)
   - iOS Core NFC 태그 읽기 지원

2. src/services/nfc/HCEService.ts
   - 기존 withHCE.js / android 네이티브 코드를 래핑
   - AID: F0414C495645 ("ALIVE" hex)
   - NDEF Payload: { type, version, userId, aliveLink, timestamp }
   - 백그라운드 서비스로 상시 실행 (Android)

3. 기존 withHCE.js 코드 분석 후:
   - 재사용 가능한 부분은 그대로 유지
   - DEV_CONTEXT의 NDEF 페이로드 구조에 맞게 조정

[주의]
- 기존 HCE 로직을 망가뜨리지 않도록 주의
- NFC는 BLE의 보조 레이어임 (BLE가 Primary)
- iOS에서는 NFC 읽기만 가능, P2P는 불가
```

---

## ⚡ PHASE 4: ExchangeManager 통합 조율기

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 ExchangeManager 코드를 참고하여,
BLE + NFC + QR 모든 교환 방식을 통합 관리하는 싱글톤 서비스를 구현해주세요.

[구현할 파일]

1. src/services/exchange/ExchangeManager.ts
   - DEV_CONTEXT.md의 ExchangeManager 코드를 기반으로 구현
   - BLEExchangeService + NFCExchangeService 통합 조율
   - startExchangeMode(): 홈 화면 진입 시 BLE + NFC 동시 시작
   - acceptExchange(): 교환 수락 → GPS 획득 → 서버 API 호출 → 로컬 저장
   - stopExchangeMode(): 모든 서비스 중지
   - EventEmitter 패턴: discovered, request, confirmed, completed, error

2. src/services/location/LocationService.ts
   - react-native-geolocation-service 사용
   - getCurrentLocation(): 현재 GPS 좌표 반환
   - reverseGeocode(): 좌표 → 장소명 변환 (Google Maps API)

3. src/stores/exchangeStore.ts
   - Zustand 스토어: 교환 목록, 현재 교환 상태, 오프라인 큐

4. src/hooks/useExchangeManager.ts
   - 커스텀 훅: ExchangeManager 제어 + React 컴포넌트 연동

[오프라인 처리]
- 네트워크 없을 때: BLE userId 교환은 로컬에서 완료
- 서버 API 호출은 오프라인 큐에 저장
- 네트워크 복구 시 자동 동기화 (NetInfo 감지)

DEV_CONTEXT.md의 ExchangeManager 코드를 그대로 따르되,
실제 동작하도록 import와 에러 핸들링을 완성해주세요.
```

---

## 🖥️ PHASE 5: Backend API 서버

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 Backend API 명세를 참고하여,
Express.js + TypeScript 백엔드 서버를 구축해주세요.

[프로젝트 위치]
프로젝트 루트에 server/ 폴더를 새로 생성하고 별도 Node.js 프로젝트로 셋업합니다.

[셋업]
1. server/ 폴더에 Express.js + TypeScript 프로젝트 초기화
2. Prisma 설치 + PostgreSQL 스키마 (DEV_CONTEXT.md의 SQL 그대로)
3. Docker Compose: PostgreSQL + Redis 로컬 개발 환경
4. JWT 인증 미들웨어

[구현할 API — MVP 범위]

1. Auth 라우터 (server/src/routes/auth.ts)
   - POST /auth/register
   - POST /auth/login
   - POST /auth/oauth/google
   - POST /auth/oauth/apple
   - POST /auth/refresh

2. Profile 라우터 (server/src/routes/profile.ts)
   - GET /profile/me
   - POST /profile/cards
   - PUT /profile/cards/:id
   - POST /profile/cards/:id/image (S3 업로드)
   - GET /profile/public/:slug

3. Exchange 라우터 (server/src/routes/exchange.ts) ← 핵심
   - POST /exchanges
     - 양쪽 사용자 검증
     - 프로필 카드 스냅샷 저장
     - GPS 역지오코딩 (Google Maps API)
     - 5분 내 중복 교환 방지
     - 상대방에게 푸시 알림
   - GET /exchanges (페이지네이션: cursor 기반)
   - GET /exchanges/:id
   - PUT /exchanges/:id/memo
   - PUT /exchanges/:id/tags

4. Device 라우터 (server/src/routes/device.ts)
   - POST /devices/register (FCM 토큰)

[서비스 레이어]
- ExchangeService.ts: 교환 비즈니스 로직
- GeocodingService.ts: Google Maps 역지오코딩
- PushService.ts: Firebase Admin SDK 푸시 알림

DEV_CONTEXT.md의 Request/Response 형식을 정확히 따라주세요.
Rate Limiting (분당 10회)도 적용해주세요.
```

---

## 📱 PHASE 6: 핵심 화면 UI 구현

```
ALIVE_CONNECTION_DEV_CONTEXT.md의 앱 화면 구조와 디자인 가이드라인을 참고하여,
MVP 핵심 화면들을 구현해주세요.

[디자인 원칙]
- 다크 모드 기본 (XRX Antigravity 스타일)
- Primary: #00D4AA (ALIVE Emerald)
- Background: #0F172A, Surface: #1E293B
- 가벼운 font-weight, 넓은 여백
- Lucide React Icons 사용
- NativeWind (Tailwind for RN)

[구현할 화면]

1. screens/home/ExchangeReadyScreen.tsx — 메인 홈
   - 중앙: 펄스 애니메이션 (BLE 스캔 중 표시)
   - "폰을 가까이 대세요" 텍스트
   - BLE 스캔 상태 인디케이터 (● 스캔 중...)
   - 하단: 최근 교환 목록 (FlatList, 최근 5개)
   - useBLEExchange 훅 연결: 근접 기기 발견 시 모달 트리거

2. screens/home/ExchangeRequestModal.tsx — 교환 요청 바텀시트
   - 상대방 프로필 미리보기 (이름, 직함, 회사, 사진)
   - "교환하기" / "거절" 버튼
   - 교환 중 로딩 → 완료 애니메이션
   - react-native-reanimated + react-native-gesture-handler 사용

3. screens/home/ExchangeCompleteScreen.tsx — 교환 완료
   - 상대방 프로필 카드 (풀사이즈)
   - 교환 맥락: 시간, 장소, 방식 표시
   - "메모 추가" 입력란
   - "연락처에 저장" 버튼

4. screens/mycard/MyCardViewScreen.tsx — 내 명함
   - 명함 카드 UI (비주얼 카드 컴포넌트)
   - QR 코드 표시 버튼
   - "편집" 버튼 → MyCardEditScreen

5. screens/mycard/MyCardEditScreen.tsx — 명함 편집
   - 프로필 이미지 업로드
   - 이름, 직함, 회사, 한줄 소개
   - 연락처: 이메일, 전화번호
   - 소셜: LinkedIn, Twitter, Instagram, Website, Kakao
   - 공유 필드 선택 토글 (어떤 정보를 교환 시 공개할지)
   - 저장 시 API 호출

6. screens/contacts/ContactListScreen.tsx — 연락처 목록
   - 검색바 (이름, 회사로 검색)
   - 정렬: 최신순 / 이름순
   - 필터: 태그별
   - FlatList with pull-to-refresh

[공통 컴포넌트]
- components/cards/ProfileCard.tsx — 명함 카드 UI 컴포넌트 (재사용)
- components/exchange/PulseAnimation.tsx — BLE 스캔 펄스 효과
- components/common/BottomSheet.tsx — 바텀시트 래퍼

[네비게이션]
- React Navigation 7: BottomTab + Stack 구조
- DEV_CONTEXT.md의 Navigation Stack 정확히 따르기
- Tab 아이콘: Home(Wifi), Contacts(Users), MyCard(CreditCard), Settings(Settings)
```

---

## 🌐 PHASE 7: ALIVE Link 웹 프로필

```
ALIVE_CONNECTION_DEV_CONTEXT.md를 참고하여,
alive.link/{slug} 웹 프로필 페이지를 구현해주세요.

[위치]
프로젝트 루트의 web/ 폴더 (기존 web/ 폴더 활용)

[기술 스택]
- Next.js 14+ (App Router)
- Tailwind CSS
- 다크 모드 기본 (ALIVE 브랜딩)

[구현]

1. app/[slug]/page.tsx — 공개 프로필 페이지
   - SSR로 서버에서 프로필 데이터 fetch (GET /profile/public/:slug)
   - 프로필 카드: 이름, 직함, 회사, 사진, 한줄 소개
   - 연락처 버튼들: 이메일, 전화, LinkedIn, Twitter 등
   - "연락처 저장" 버튼 → vCard(.vcf) 다운로드
   - "ALIVE 앱에서 연결하기" → 앱 딥링크 (Universal Link / App Link)
   - 앱 미설치 시 → 앱스토어/플레이스토어 링크
   - OG 메타태그 (소셜 공유 시 미리보기)

2. SEO 최적화
   - 동적 메타태그: 이름, 직함, 회사, 프로필 이미지
   - robots.txt, sitemap

[디자인]
- ALIVE 브랜드 컬러 (#00D4AA, #0F172A)
- 모바일 퍼스트 (카드형 레이아웃)
- 깔끔하고 프로페셔널한 느낌

이 페이지는 NFC 탭 시 앱 미설치 상대방에게 보여지는 핵심 Fallback이므로,
첫인상이 매우 중요합니다. 세련되게 만들어주세요.
```

---

## 🔗 PHASE 8: 전체 연동 + E2E 테스트

```
ALIVE_CONNECTION_DEV_CONTEXT.md를 참고하여,
모든 레이어를 연결하고 End-to-End 교환 플로우를 완성해주세요.

[연동 작업]

1. Mobile ↔ Backend 연결
   - src/services/api/client.ts: Axios 인스턴스 + JWT 인터셉터
   - src/services/api/auth.ts: 로그인/회원가입 API 함수
   - src/services/api/profile.ts: 프로필 CRUD API 함수
   - src/services/api/exchange.ts: 교환 API 함수

2. ExchangeManager ↔ Backend 완전 연동
   - 교환 수락 → POST /exchanges → 응답 받아 UI 업데이트
   - 상대방 프로필 표시
   - GPS 역지오코딩 결과 표시

3. 푸시 알림 연동
   - FCM 토큰 등록 (앱 시작 시)
   - 교환 완료 시 상대방에게 푸시 (서버에서 발송)

4. 오프라인 동기화
   - NetInfo로 네트워크 상태 감지
   - 오프라인 큐 → 온라인 복구 시 일괄 동기화

[E2E 테스트 시나리오]

시나리오 1: BLE 교환 (Android ↔ iPhone)
- 두 디바이스에서 앱 실행
- 홈 화면 진입 → BLE 스캔 시작
- 디바이스를 가까이 가져감
- 양쪽에 교환 요청 모달 표시
- 양쪽 수락 → 서버에 교환 기록
- 양쪽에 상대방 프로필 표시
- 연락처 탭에서 교환 이력 확인

시나리오 2: NFC 교환 (Android ↔ Android)
- Phone A: HCE 서비스 실행 중
- Phone B: NFC 탭 → NDEF 읽기 → 교환 처리

시나리오 3: 오프라인 교환
- 비행기 모드에서 BLE 교환 시도
- userId만 로컬 저장
- 네트워크 복구 후 서버 동기화 확인

각 시나리오를 단계별로 테스트할 수 있는 디버그 로그를 추가해주세요.
```

---

## 🚀 PHASE 9: 출시 준비

```
ALIVE Connection MVP 출시를 위한 마무리 작업을 해주세요.

[작업 목록]

1. 앱 아이콘 + 스플래시 스크린
   - assets/ 폴더에 앱 아이콘 설정
   - 스플래시: ALIVE 로고 + #0F172A 배경

2. app.json / eas.json 업데이트
   - 앱 이름: "ALIVE Connection"
   - 번들 ID: com.xrx.alive.connection
   - 버전: 1.0.0
   - 권한 설명문 (BLE, NFC, 위치, 카메라, 푸시)
     - iOS: NSBluetoothAlwaysUsageDescription
     - iOS: NFCReaderUsageDescription
     - iOS: NSLocationWhenInUseUsageDescription
     - Android: BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, NFC, ACCESS_FINE_LOCATION

3. 개인정보처리방침 + 이용약관
   - 앱 내 설정 화면에서 접근 가능
   - 웹 페이지로 호스팅 (web/ 폴더)

4. EAS Build 설정
   - eas.json: development, preview, production 프로필
   - Android: AAB 빌드 (Play Store)
   - iOS: IPA 빌드 (App Store)

5. 에러 모니터링
   - Sentry React Native 설치 + 설정
   - 핵심 에러 포인트: BLE 서비스, API 호출, 교환 프로세스

6. 성능 최적화
   - FlatList 가상화 확인
   - 이미지 캐싱 (react-native-fast-image)
   - BLE 스캔 배터리 최적화

빌드가 성공하고, 두 디바이스에서 교환이 작동하는 상태로 만들어주세요.
```

---

## 💡 유틸리티 프롬프트 (필요할 때 사용)

### 디버깅용
```
ALIVE Connection에서 BLE 교환이 작동하지 않습니다.
ALIVE_CONNECTION_DEV_CONTEXT.md를 참고하여 다음을 점검해주세요:

1. BLE 권한이 올바르게 설정되어 있는지 (iOS Info.plist, Android Manifest)
2. Service UUID가 양쪽에서 동일한지
3. RSSI 임계값이 적절한지
4. Peripheral 광고가 정상 작동하는지
5. Central 스캔에서 필터링이 올바른지

각 단계에 console.log를 추가하여 디버깅해주세요.
```

### QR 코드 대체 교환 추가
```
ALIVE_CONNECTION_DEV_CONTEXT.md를 참고하여,
BLE가 작동하지 않는 환경을 위한 QR 코드 교환 기능을 추가해주세요.

1. screens/mycard/QRCodeScreen.tsx — 내 QR 코드 표시
   - react-native-qrcode-skia 또는 react-native-qrcode-svg 사용
   - QR 내용: alive.link/{slug} URL
   - ALIVE 브랜딩 QR 디자인

2. QR 스캔 기능
   - react-native-camera-kit 또는 expo-camera
   - 스캔 → URL 파싱 → 교환 프로세스 시작

3. ExchangeManager에 'qr' method 추가
```

### Neo4j 관계 그래프 확장 (Phase 2)
```
ALIVE_CONNECTION_DEV_CONTEXT.md의 Neo4j 관계 그래프 스키마를 참고하여,
백엔드에 Neo4j 연동을 추가해주세요.

1. neo4j-driver 설치
2. 교환 발생 시 Neo4j에도 관계 저장:
   - (PersonA)-[:MET {context}]->(PersonB)
   - (Person)-[:BELONGS_TO]->(Organization)
   - (Person)-[:ATTENDED]->(Event)
3. 관계 조회 API:
   - GET /graph/connections — 내 인맥 그래프
   - GET /graph/mutual/:userId — 공통 인맥

이것은 Phase 2 (Relationship Intelligence)의 기반이 됩니다.
```

---

## 📋 프롬프트 사용 순서 요약

| 순서 | Phase | 설명 | 예상 시간 |
|------|-------|------|-----------|
| 1 | Phase 0 | 현황 분석 + Gap 분석 | 1시간 |
| 2 | Phase 1 | 프로젝트 구조 리팩토링 | 2-3시간 |
| 3 | Phase 5 | Backend API 서버 (병렬 진행 가능) | 1-2일 |
| 4 | Phase 2 | BLE 서비스 구현 | 2-3일 |
| 5 | Phase 3 | NFC/HCE 통합 | 1-2일 |
| 6 | Phase 4 | ExchangeManager 통합 | 1일 |
| 7 | Phase 6 | 핵심 화면 UI | 2-3일 |
| 8 | Phase 7 | ALIVE Link 웹 프로필 | 1일 |
| 9 | Phase 8 | 전체 연동 + E2E 테스트 | 2-3일 |
| 10 | Phase 9 | 출시 준비 | 1-2일 |

**총 예상: 약 10 Sprint(5주) — MVP 출시 가능**
