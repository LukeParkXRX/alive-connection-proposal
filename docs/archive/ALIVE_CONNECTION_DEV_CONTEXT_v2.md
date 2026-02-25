# ALIVE Connection — 개발 컨텍스트 윈도우
# Version: 2.0 (Hybrid Architecture)
# Last Updated: 2026-02-22
# Company: XRX Technology (luke@xrx.studio)

---

## 🎯 프로젝트 개요

### 한 줄 정의
ALIVE Connection은 스마트폰을 가까이 가져다 대면 양쪽 사용자의 디지털 명함(프로필)이 자동으로 교환되고, 만남의 맥락(시간, 장소, 상황)이 자동 기록되는 **관계형 AI 네트워킹 플랫폼**이다.

### 핵심 UX 원칙
- **Zero-Input**: 폰을 맞대는 행위만으로 모든 로그 자동화
- **Context-Aware**: 만남의 시점, 장소, 행사 정보를 자동 태깅
- **Proactive**: AI가 관계 유지를 먼저 가이드
- **Cross-Platform**: iPhone ↔ Android 간 완벽 호환

### 제품 비전 (3 Phase)
1. **Phase 1 (MVP)**: Seamless Handshake — 폰 탭으로 명함 교환 + 위치/시간 자동 기록
2. **Phase 2**: Relationship Intelligence — 관계 강도 측정, 스마트 케어, 맥락 검색
3. **Phase 3**: Network Marketplace — 신뢰 기반 비즈니스 매칭 (Warm Intro)

### 상위 생태계
ALIVE Connection은 XRX Technology의 ALIVE 플랫폼 제품군에 속한다:
- **OntologyHub.ai**: AI 페르소나의 지식 그래프를 설계하는 웹 플랫폼
- **ALIVE Engine**: AI 캐릭터 구동 엔진 (Orchestrator + Hybrid RAG + Memory Manager)
- **ALIVE Connection**: 사람 간 관계를 온톨로지 그래프로 축적하는 모바일 네트워킹 앱 ← 이 프로젝트

---

## 🏗️ 아키텍처 개요 (v2 — Hybrid)

### 기존 v1 (HCE 방식) → v2 (Hybrid) 전환 사유
- HCE는 Android 간에만 작동, iOS에서 서드파티 P2P NFC가 제한적
- iPhone ↔ Android 크로스 플랫폼 필수 → BLE를 기본 발견/교환 레이어로 채택
- 서버를 통한 데이터 교환으로 풍부한 프로필 + 안정성 확보

### 3-Layer Hybrid Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ALIVE Connection App                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Layer 1    │  │   Layer 2    │  │    Layer 3     │  │
│  │  BLE        │  │   Server     │  │    NFC/HCE     │  │
│  │  Discovery  │  │   Exchange   │  │    Boost       │  │
│  │             │  │              │  │    (Optional)  │  │
│  │ • 기기 발견  │  │ • 프로필 교환 │  │ • Android 즉시 │  │
│  │ • 앱 설치   │  │ • 풍부한 데이터│  │   교환 경험    │  │
│  │   확인      │  │ • 만남 기록   │  │ • 앱 미설치 시 │  │
│  │ • user_id   │  │ • GPS/시간   │  │   웹 프로필    │  │
│  │   교환      │  │   태깅       │  │   전송         │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          │                               │
│                    ┌─────▼─────┐                         │
│                    │ Exchange  │                         │
│                    │ Manager   │                         │
│                    │ (통합 조율)│                         │
│                    └─────┬─────┘                         │
│                          │                               │
├──────────────────────────┼───────────────────────────────┤
│                    ┌─────▼─────┐                         │
│                    │  Local DB │                         │
│                    │ (SQLite)  │                         │
│                    └───────────┘                         │
└─────────────────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Backend   │
                    │   Server    │
                    │  (REST API) │
                    ├─────────────┤
                    │ • Auth      │
                    │ • Profile   │
                    │ • Exchange  │
                    │ • Meeting   │
                    │   Log       │
                    │ • Push      │
                    │   Notify    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Database   │
                    ├─────────────┤
                    │ PostgreSQL  │
                    │ + Neo4j     │
                    │ (관계 그래프)│
                    │ + Redis     │
                    │ (세션/캐시) │
                    └─────────────┘
```

---

## 📱 기술 스택

### Mobile App (Cross-Platform)
- **Framework**: React Native 0.76+ (Expo는 BLE/NFC 제약으로 Bare Workflow 필수)
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation 7
- **Local DB**: WatermelonDB (오프라인 우선) 또는 @op-engineering/op-sqlite
- **BLE**: react-native-ble-plx (BLE Central/Peripheral)
- **NFC**: react-native-nfc-manager (NDEF 읽기/쓰기)
- **HCE (Android)**: react-native-hce (Host Card Emulation 서비스)
- **Location**: react-native-geolocation-service
- **Push**: Firebase Cloud Messaging (FCM) + APNs
- **Auth**: @react-native-google-signin + Apple Sign-In
- **UI**: NativeWind (Tailwind for RN) 또는 Tamagui

### Backend Server
- **Runtime**: Node.js 20+ (Express.js 또는 Fastify)
- **Language**: TypeScript
- **API**: REST (v1) → GraphQL (v2 확장 시)
- **Auth**: JWT + OAuth2 (Google, Apple, Kakao)
- **Database**: PostgreSQL 16 (주 데이터) + Neo4j 5 (관계 그래프) + Redis 7 (세션/캐시)
- **ORM**: Prisma (PostgreSQL) + neo4j-driver (Neo4j)
- **File Storage**: AWS S3 또는 Cloudflare R2 (프로필 이미지)
- **Hosting**: AWS ECS 또는 Fly.io 또는 Railway
- **Push Service**: Firebase Admin SDK

### DevOps
- **Container**: Docker + Docker Compose (개발), ECS/Fly.io (프로덕션)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (에러), Grafana (메트릭)

---

## 📊 데이터 모델

### PostgreSQL — 주 데이터

```sql
-- 사용자 테이블
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  auth_provider VARCHAR(20) NOT NULL,  -- 'google' | 'apple' | 'kakao' | 'email'
  auth_uid      VARCHAR(255) NOT NULL, -- 외부 인증 UID
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT true
);

-- 디지털 명함 (프로필 카드)
CREATE TABLE profile_cards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  -- 기본 정보
  display_name  VARCHAR(100) NOT NULL,
  title         VARCHAR(100),          -- 직함
  company       VARCHAR(100),          -- 소속
  bio           TEXT,                  -- 한줄 소개
  profile_image_url VARCHAR(500),
  -- 연락처
  email_public  VARCHAR(255),          -- 공개용 이메일
  phone_public  VARCHAR(20),           -- 공개용 전화번호
  -- 소셜 링크
  linkedin_url  VARCHAR(500),
  twitter_url   VARCHAR(500),
  instagram_url VARCHAR(500),
  website_url   VARCHAR(500),
  kakao_id      VARCHAR(100),
  -- 공유 설정
  share_fields  JSONB DEFAULT '["display_name","title","company","email_public"]',
  -- ALIVE Link (고유 웹 프로필 URL)
  alive_link_slug VARCHAR(50) UNIQUE,  -- alive.link/{slug}
  -- 메타
  is_default    BOOLEAN DEFAULT true,  -- 기본 카드 여부 (복수 카드 지원)
  card_style    JSONB,                 -- 카드 디자인 커스텀
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 명함 교환 기록 (핵심 테이블)
CREATE TABLE exchanges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 교환 참여자
  initiator_id  UUID REFERENCES users(id),  -- 교환 시작자
  receiver_id   UUID REFERENCES users(id),  -- 교환 수신자
  -- 교환 방식
  method        VARCHAR(20) NOT NULL,       -- 'ble' | 'nfc' | 'hce' | 'qr' | 'link'
  -- 맥락 정보 (Auto-Tagging)
  location_lat  DECIMAL(10, 8),
  location_lng  DECIMAL(11, 8),
  location_name VARCHAR(200),              -- 역지오코딩 결과 (예: "코엑스 컨퍼런스홀")
  location_address VARCHAR(500),
  -- 교환 상태
  status        VARCHAR(20) DEFAULT 'completed', -- 'pending' | 'completed' | 'rejected'
  -- 교환된 카드 스냅샷 (교환 시점의 프로필 보존)
  initiator_card_snapshot JSONB,
  receiver_card_snapshot  JSONB,
  -- 메모 & 태그
  initiator_memo TEXT,                     -- 사용자가 나중에 추가하는 메모
  receiver_memo  TEXT,
  tags          JSONB DEFAULT '[]',        -- ["CES 2026", "투자자", "AI"]
  -- 메타
  exchanged_at  TIMESTAMPTZ DEFAULT NOW(),
  event_name    VARCHAR(200)               -- 행사명 (자동 감지 또는 수동 입력)
);

-- BLE 디바이스 등록 (기기 발견용)
CREATE TABLE user_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  device_type   VARCHAR(10) NOT NULL,       -- 'ios' | 'android'
  ble_service_uuid VARCHAR(36),             -- BLE 광고용 서비스 UUID
  fcm_token     VARCHAR(500),               -- 푸시 알림 토큰
  device_model  VARCHAR(100),
  os_version    VARCHAR(20),
  app_version   VARCHAR(20),
  nfc_capable   BOOLEAN DEFAULT false,
  hce_capable   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_exchanges_initiator ON exchanges(initiator_id, exchanged_at DESC);
CREATE INDEX idx_exchanges_receiver ON exchanges(receiver_id, exchanged_at DESC);
CREATE INDEX idx_exchanges_location ON exchanges USING GIST (
  point(location_lng, location_lat)
);
CREATE INDEX idx_profile_cards_user ON profile_cards(user_id);
CREATE INDEX idx_profile_cards_slug ON profile_cards(alive_link_slug);
```

### Neo4j — 관계 그래프 (Phase 2 확장)

```cypher
// 사용자 노드
CREATE (u:Person {
  userId: "uuid",
  name: "Luke",
  company: "XRX Technology",
  title: "CEO"
})

// 만남 관계
CREATE (a:Person)-[:MET {
  exchangeId: "uuid",
  method: "ble",
  location: "COEX Conference Hall",
  lat: 37.5116, lng: 127.0594,
  timestamp: datetime("2026-02-20T14:30:00+09:00"),
  event: "AI Summit 2026",
  tags: ["investor", "AI"],
  memo: "시리즈A 투자 관심",
  strength: 0.7  // 관계 강도 (Phase 2)
}]->(b:Person)

// 조직 노드
CREATE (o:Organization {
  name: "XRX Technology",
  industry: "AI/XR"
})
CREATE (u:Person)-[:BELONGS_TO]->(o:Organization)

// 행사 노드
CREATE (e:Event {
  name: "AI Summit 2026",
  location: "COEX",
  date: date("2026-02-20")
})
CREATE (u:Person)-[:ATTENDED]->(e:Event)
```

---

## 🔄 근접 교환 프로토콜 (Exchange Protocol)

### Flow 1: BLE 기반 교환 (Primary — iOS/Android 공통)

```
┌──────────┐                              ┌──────────┐
│  Phone A │                              │  Phone B │
│ (앱 실행)│                              │ (앱 실행)│
└────┬─────┘                              └────┬─────┘
     │                                         │
     │  1) BLE Peripheral 모드                  │  1) BLE Peripheral 모드
     │     Service UUID: ALIVE_SERVICE_UUID     │     Service UUID: ALIVE_SERVICE_UUID
     │     Advertising: { userId_hash }         │     Advertising: { userId_hash }
     │                                         │
     │  2) BLE Central 모드 (동시 스캔)          │  2) BLE Central 모드 (동시 스캔)
     │     ALIVE_SERVICE_UUID 필터링             │     ALIVE_SERVICE_UUID 필터링
     │                                         │
     │  3) 상대 기기 발견! (RSSI > -50dBm)      │  3) 상대 기기 발견!
     │     → "근접" 판정 (약 30cm 이내)          │
     │                                         │
     │  4) GATT 연결                            │
     │◄─────────────────────────────────────────►│
     │     Characteristic 교환:                  │
     │     { userId, timestamp, requestId }      │
     │                                         │
     │  5) 양쪽 UI 표시: "○○님과 교환할까요?"      │
     │                                         │
     │  6) 양쪽 수락                             │
     │                                         │
     │  7) Server API 호출 (각자)                │
     │     POST /api/exchanges                  │
     │     { partnerId, method: "ble",          │
     │       location, timestamp }              │
     │                                         │
     │  8) 서버에서 양쪽 프로필 카드 교환 처리     │
     │     → 양쪽에 상대방 카드 전달              │
     │     → 교환 기록 저장                      │
     │     → 푸시 알림 발송                      │
     │                                         │
     │  9) UI 업데이트: 교환 완료 + 상대 프로필    │
     │                                         │
```

### Flow 2: NFC/HCE 부스트 (Android ↔ Android 전용)

```
┌──────────────┐                    ┌──────────────┐
│  Phone A     │                    │  Phone B     │
│  (HCE Tag    │   NFC TAP (~4cm)   │  (NFC Reader │
│   Emulator)  │◄──────────────────►│   Mode)      │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  1) Phone A: HCE 서비스 백그라운드 상시 실행
       │     AID: F0414C495645 ("ALIVE" in hex)
       │     NDEF Payload: { userId, aliveLink }
       │
       │  2) Phone B: NFC 태그 감지
       │     → NDEF 읽기 → ALIVE 앱 딥링크
       │
       │  3) 이후 Flow는 BLE Flow의 Step 7~9와 동일
       │     (서버 API로 교환 처리)
       │
```

### Flow 3: 앱 미설치 상대방 (Fallback)

```
┌──────────────┐                    ┌──────────────┐
│  Phone A     │                    │  Phone B     │
│  (앱 설치)   │                    │  (앱 미설치)  │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  Option A) NFC 탭                  │
       │  → NDEF에 ALIVE Link URL 포함       │
       │  → Phone B 브라우저에서             │
       │    alive.link/{slug} 열림           │
       │  → 웹 프로필 표시 + 앱 설치 유도     │
       │                                   │
       │  Option B) QR 코드 표시             │
       │  → Phone B 카메라로 스캔            │
       │  → 동일하게 웹 프로필 열림           │
       │                                   │
```

---

## 📡 BLE 상세 스펙

### Service & Characteristic UUID
```typescript
const ALIVE_BLE_CONFIG = {
  // ALIVE Connection 전용 서비스 UUID
  SERVICE_UUID: "A11VE000-C0NN-EC10-N000-XRX5TUD10000",
  
  // Characteristic UUIDs
  CHAR_USER_ID:     "A11VE001-C0NN-EC10-N000-XRX5TUD10000",  // Read: userId hash
  CHAR_EXCHANGE_REQ:"A11VE002-C0NN-EC10-N000-XRX5TUD10000",  // Write: 교환 요청
  CHAR_EXCHANGE_RES:"A11VE003-C0NN-EC10-N000-XRX5TUD10000",  // Notify: 교환 응답
  
  // Advertising 설정
  ADVERTISING: {
    localName: "ALIVE",
    txPowerLevel: "medium",     // 근접 감지 최적화
    connectable: true,
  },
  
  // 근접 판정 RSSI 임계값
  RSSI_THRESHOLD: -50,          // dBm (약 30cm 이내)
  RSSI_VERY_CLOSE: -35,         // dBm (약 10cm 이내 → 자동 교환 트리거)
  
  // 스캔 주기
  SCAN_INTERVAL_FOREGROUND: 2000,   // ms (앱 활성 시)
  SCAN_INTERVAL_BACKGROUND: 10000,  // ms (백그라운드)
};
```

### BLE 상태 머신
```typescript
enum BLEState {
  IDLE = "idle",                    // 초기 상태
  ADVERTISING = "advertising",      // Peripheral 광고 중
  SCANNING = "scanning",            // Central 스캔 중
  DISCOVERED = "discovered",        // 상대 기기 발견
  CONNECTING = "connecting",        // GATT 연결 중
  EXCHANGING = "exchanging",        // 데이터 교환 중
  AWAITING_CONFIRM = "awaiting",    // 사용자 확인 대기
  COMPLETED = "completed",          // 교환 완료
  ERROR = "error",                  // 에러
}
```

### BLE 모듈 핵심 코드 구조
```typescript
// src/services/ble/BLEExchangeService.ts

import BleManager from 'react-native-ble-plx';

class BLEExchangeService {
  private manager: BleManager;
  private state: BLEState = BLEState.IDLE;
  
  // 동시에 Peripheral(광고) + Central(스캔) 모드 실행
  async startDiscovery(): Promise<void> {
    await this.startAdvertising();  // 나를 광고
    await this.startScanning();     // 상대 탐색
  }
  
  // BLE Peripheral: 나의 존재를 광고
  private async startAdvertising(): Promise<void> {
    // react-native-ble-plx는 Peripheral 미지원
    // → react-native-ble-advertiser 또는 네이티브 모듈 필요
    // Android: BluetoothLeAdvertiser API
    // iOS: CBPeripheralManager API
  }
  
  // BLE Central: ALIVE 앱 사용자 스캔
  private async startScanning(): Promise<void> {
    this.manager.startDeviceScan(
      [ALIVE_BLE_CONFIG.SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (device && device.rssi > ALIVE_BLE_CONFIG.RSSI_THRESHOLD) {
          this.onNearbyDeviceFound(device);
        }
      }
    );
  }
  
  // 근접 기기 발견 시
  private async onNearbyDeviceFound(device: Device): Promise<void> {
    this.state = BLEState.DISCOVERED;
    
    // GATT 연결 → userId 읽기
    const connected = await device.connect();
    const services = await connected.discoverAllServicesAndCharacteristics();
    const userIdChar = await connected.readCharacteristicForService(
      ALIVE_BLE_CONFIG.SERVICE_UUID,
      ALIVE_BLE_CONFIG.CHAR_USER_ID
    );
    
    const partnerUserId = decodeBase64(userIdChar.value);
    
    // UI에 교환 요청 표시
    this.emit('exchangeRequest', { 
      partnerUserId, 
      rssi: device.rssi,
      deviceName: device.localName 
    });
  }
  
  // 교환 수락 시 서버 API 호출
  async confirmExchange(partnerUserId: string): Promise<ExchangeResult> {
    const location = await getCurrentLocation();
    
    const result = await api.post('/exchanges', {
      partnerId: partnerUserId,
      method: 'ble',
      location: {
        lat: location.latitude,
        lng: location.longitude,
      },
      timestamp: new Date().toISOString(),
    });
    
    // 로컬 DB에도 저장 (오프라인 우선)
    await localDB.saveExchange(result.data);
    
    this.state = BLEState.COMPLETED;
    return result.data;
  }
  
  stopDiscovery(): void {
    this.manager.stopDeviceScan();
    // 광고도 중지
    this.state = BLEState.IDLE;
  }
}
```

---

## 🔌 NFC/HCE 상세 스펙 (Android 전용 Boost Layer)

### HCE 서비스 (Android)
```typescript
// android/app/src/main/java/.../AliveHceService.java 
// React Native 네이티브 모듈로 구현

// AID: F0414C495645 (hex for "ALIVE" prefix)
// NDEF Payload 구조:
{
  "type": "alive_exchange",
  "version": 1,
  "userId": "uuid-hash",
  "aliveLink": "https://alive.link/luke-xrx",
  "timestamp": 1708600000
}
```

### NFC 읽기 (iOS/Android)
```typescript
// src/services/nfc/NFCExchangeService.ts

import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';

class NFCExchangeService {
  async startListening(): Promise<void> {
    await NfcManager.start();
    
    // NDEF 태그 감지 대기
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    
    if (tag?.ndefMessage) {
      const payload = Ndef.text.decodePayload(
        tag.ndefMessage[0].payload
      );
      const data = JSON.parse(payload);
      
      if (data.type === 'alive_exchange') {
        // BLE Flow의 Step 7로 합류
        await this.processExchange(data.userId);
      }
    }
  }
  
  // Android: NDEF 쓰기 (내 정보를 NFC 태그로 방출)
  async writeNdefForExchange(userId: string, aliveLink: string): Promise<void> {
    const payload = JSON.stringify({
      type: "alive_exchange",
      version: 1,
      userId,
      aliveLink,
      timestamp: Date.now(),
    });
    
    const bytes = Ndef.encodeMessage([
      Ndef.textRecord(payload),
      Ndef.uriRecord(aliveLink),  // 앱 미설치 시 웹 프로필로 폴백
    ]);
    
    await NfcManager.requestTechnology(NfcTech.Ndef);
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  }
}
```

---

## 🖥️ Backend API 명세

### Base URL
```
Production: https://api.alive.link/v1
Development: http://localhost:3001/api/v1
```

### Authentication
```
Header: Authorization: Bearer <JWT_TOKEN>
JWT Payload: { userId, email, iat, exp }
Token Expiry: 7일 (refresh token: 30일)
```

### Endpoints

#### 1. Auth
```
POST   /auth/register          # 회원가입
POST   /auth/login             # 로그인 (email/password)
POST   /auth/oauth/google      # Google OAuth
POST   /auth/oauth/apple       # Apple Sign-In
POST   /auth/oauth/kakao       # Kakao OAuth
POST   /auth/refresh           # 토큰 갱신
DELETE /auth/account            # 회원탈퇴
```

#### 2. Profile Cards
```
GET    /profile/me              # 내 프로필 카드 목록
POST   /profile/cards           # 새 카드 생성
PUT    /profile/cards/:id       # 카드 수정
DELETE /profile/cards/:id       # 카드 삭제
PUT    /profile/cards/:id/default  # 기본 카드 설정
POST   /profile/cards/:id/image    # 프로필 이미지 업로드 (multipart)
GET    /profile/public/:slug    # 공개 프로필 조회 (alive.link용)
```

#### 3. Exchanges (핵심)
```
POST   /exchanges               # 교환 생성 (양쪽에서 호출)
GET    /exchanges                # 내 교환 목록 (페이지네이션)
GET    /exchanges/:id            # 교환 상세
PUT    /exchanges/:id/memo       # 메모 추가/수정
PUT    /exchanges/:id/tags       # 태그 추가/수정
DELETE /exchanges/:id            # 교환 기록 삭제
GET    /exchanges/stats          # 교환 통계 (총 교환수, 월별 등)
```

##### POST /exchanges — Request Body
```json
{
  "partnerId": "uuid",
  "method": "ble",              // "ble" | "nfc" | "hce" | "qr" | "link"
  "location": {
    "lat": 37.5116,
    "lng": 127.0594,
    "accuracy": 10.5            // meters
  },
  "cardId": "uuid",             // 교환할 내 카드 ID (선택, 기본값: default card)
  "eventName": "AI Summit 2026" // 선택
}
```

##### POST /exchanges — Response
```json
{
  "exchangeId": "uuid",
  "status": "completed",
  "partner": {
    "userId": "uuid",
    "displayName": "김철수",
    "title": "CTO",
    "company": "TechCorp",
    "profileImageUrl": "https://...",
    "emailPublic": "kim@techcorp.com",
    "linkedinUrl": "https://linkedin.com/in/...",
    "aliveLink": "alive.link/chulsu-kim"
  },
  "context": {
    "location": {
      "lat": 37.5116,
      "lng": 127.0594,
      "name": "COEX 컨퍼런스홀",
      "address": "서울 강남구 영동대로 513"
    },
    "exchangedAt": "2026-02-20T14:30:00+09:00",
    "method": "ble",
    "eventName": "AI Summit 2026"
  }
}
```

#### 4. Devices
```
POST   /devices/register        # 디바이스 등록 (FCM 토큰 포함)
PUT    /devices/:id             # 디바이스 정보 업데이트
DELETE /devices/:id             # 디바이스 삭제
```

#### 5. Web Profile (ALIVE Link)
```
GET    /link/:slug              # 웹 프로필 페이지 데이터
POST   /link/:slug/save         # 방문자가 연락처 저장 시 기록
```

---

## 📱 앱 화면 구조 (Screen Flow)

### Navigation Stack
```
App
├── AuthStack (미로그인)
│   ├── WelcomeScreen          # 온보딩/스플래시
│   ├── LoginScreen            # 로그인 (Google/Apple/Kakao)
│   └── ProfileSetupScreen     # 최초 프로필 카드 설정
│
├── MainTab (로그인 후)
│   ├── HomeTab                # 홈 (교환 대기 + 최근 교환)
│   │   ├── ExchangeReadyScreen    # "폰을 가까이 대세요" 화면 (BLE 스캔 중)
│   │   ├── ExchangeRequestModal   # "○○님과 교환할까요?" 바텀시트
│   │   ├── ExchangeCompleteScreen # 교환 완료 + 상대 프로필 표시
│   │   └── ExchangeDetailScreen   # 교환 상세 (메모, 태그 편집)
│   │
│   ├── ContactsTab            # 연락처 (교환된 사람 목록)
│   │   ├── ContactListScreen      # 전체 목록 (검색, 필터)
│   │   ├── ContactDetailScreen    # 연락처 상세 (교환 이력, 메모)
│   │   └── ContactMapScreen       # 지도 뷰 (어디서 만났는지)
│   │
│   ├── MyCardTab              # 내 카드 (프로필 관리)
│   │   ├── MyCardViewScreen       # 내 명함 미리보기
│   │   ├── MyCardEditScreen       # 명함 편집
│   │   ├── QRCodeScreen           # 내 QR 코드 표시
│   │   └── ShareSettingsScreen    # 공유 필드 선택
│   │
│   └── SettingsTab            # 설정
│       ├── AccountScreen          # 계정 관리
│       ├── PrivacyScreen          # 개인정보/공개 설정
│       ├── NotificationScreen     # 알림 설정
│       └── DeviceScreen           # BLE/NFC 설정
│
└── Modals (오버레이)
    ├── ExchangeSuccessModal   # 교환 성공 축하 애니메이션
    └── AppInstallModal        # 상대방 앱 미설치 시 공유 옵션
```

### 핵심 화면: HomeTab — ExchangeReadyScreen
```
┌─────────────────────────┐
│  ALIVE Connection       │
│                         │
│     ┌───────────┐       │
│     │           │       │
│     │   (펄스   │       │
│     │  애니메이션)│       │
│     │           │       │
│     └───────────┘       │
│                         │
│  "폰을 가까이 대세요"    │
│                         │
│  ● BLE 스캔 중...        │
│  ● NFC 대기 중...        │
│                         │
│  ─── 최근 교환 ─────── │
│  👤 김철수 CTO@TechCorp │
│     2시간 전 · COEX     │
│  👤 이영희 PM@StartupA  │
│     어제 · 강남역       │
│                         │
│  [🏠] [👥] [💳] [⚙️]  │
└─────────────────────────┘
```

---

## 🔐 보안 & 개인정보

### 데이터 보호 원칙
1. **최소 수집**: 교환에 필요한 최소한의 정보만 수집
2. **사용자 제어**: 공유할 필드를 사용자가 직접 선택 (share_fields)
3. **동의 기반**: 양쪽 모두 수락해야 교환 성립
4. **암호화**: 전송 중 TLS 1.3, 저장 시 AES-256
5. **삭제권**: 교환 기록을 언제든 삭제 가능

### BLE 보안
- BLE 광고에는 userId의 SHA-256 해시만 포함 (원본 UUID 노출 방지)
- GATT 연결 시 Bonding 사용하지 않음 (일회성 교환)
- RSSI 기반 근접 검증으로 원거리 스니핑 방지

### API 보안
- JWT + HTTPS 필수
- Rate Limiting: 교환 API는 분당 10회 제한
- 교환 요청 시 양쪽 timestamp 차이 30초 이내 검증

---

## 🚀 개발 우선순위 (MVP Scope)

### Sprint 1 (2주): 기초 인프라
- [ ] React Native 프로젝트 셋업 (TypeScript, NativeWind)
- [ ] Backend Express.js 프로젝트 셋업
- [ ] PostgreSQL 스키마 생성 + Prisma 설정
- [ ] Auth API (Google/Apple OAuth)
- [ ] 기본 네비게이션 스택

### Sprint 2 (2주): 프로필 카드
- [ ] 프로필 카드 CRUD API
- [ ] MyCardEditScreen (프로필 편집 UI)
- [ ] 프로필 이미지 업로드 (S3)
- [ ] ALIVE Link 웹 프로필 페이지 (Next.js 또는 SSR)

### Sprint 3 (2주): BLE 교환 (핵심)
- [ ] BLE Peripheral + Central 동시 모드 구현
- [ ] 근접 기기 발견 + RSSI 필터링
- [ ] 교환 요청/수락 UI (ExchangeRequestModal)
- [ ] Exchange API + 교환 기록 저장
- [ ] GPS 자동 태깅 + 역지오코딩

### Sprint 4 (2주): NFC Boost + 폴리시
- [ ] Android HCE 서비스 구현
- [ ] NFC NDEF 읽기/쓰기
- [ ] QR 코드 대체 교환
- [ ] 푸시 알림 (교환 완료 시)
- [ ] 오프라인 모드 (로컬 큐잉 → 온라인 시 동기화)

### Sprint 5 (2주): 연락처 관리 + 출시 준비
- [ ] ContactListScreen (검색, 필터, 정렬)
- [ ] ContactDetailScreen (교환 이력, 메모, 태그)
- [ ] 교환 통계 대시보드
- [ ] 앱스토어/플레이스토어 출시 준비
- [ ] 개인정보처리방침 + 이용약관

---

## 📁 프로젝트 디렉토리 구조

```
alive-connection/
├── apps/
│   ├── mobile/                    # React Native 앱
│   │   ├── src/
│   │   │   ├── app/               # 앱 진입점, 네비게이션
│   │   │   ├── screens/           # 화면 컴포넌트
│   │   │   │   ├── auth/
│   │   │   │   ├── home/
│   │   │   │   ├── contacts/
│   │   │   │   ├── mycard/
│   │   │   │   └── settings/
│   │   │   ├── components/        # 공유 UI 컴포넌트
│   │   │   │   ├── cards/         # 명함 카드 UI
│   │   │   │   ├── exchange/      # 교환 관련 UI
│   │   │   │   └── common/        # 버튼, 인풋 등
│   │   │   ├── services/          # 비즈니스 로직
│   │   │   │   ├── ble/           # BLE 교환 서비스
│   │   │   │   │   ├── BLEExchangeService.ts
│   │   │   │   │   ├── BLEAdvertiser.ts
│   │   │   │   │   └── BLEScanner.ts
│   │   │   │   ├── nfc/           # NFC/HCE 서비스
│   │   │   │   │   ├── NFCExchangeService.ts
│   │   │   │   │   └── HCEService.ts
│   │   │   │   ├── exchange/      # 교환 통합 매니저
│   │   │   │   │   └── ExchangeManager.ts
│   │   │   │   ├── location/      # 위치 서비스
│   │   │   │   │   └── LocationService.ts
│   │   │   │   └── api/           # API 클라이언트
│   │   │   │       ├── client.ts
│   │   │   │       ├── auth.ts
│   │   │   │       ├── profile.ts
│   │   │   │       └── exchange.ts
│   │   │   ├── stores/            # Zustand 상태 관리
│   │   │   │   ├── authStore.ts
│   │   │   │   ├── profileStore.ts
│   │   │   │   ├── exchangeStore.ts
│   │   │   │   └── bleStore.ts
│   │   │   ├── hooks/             # 커스텀 훅
│   │   │   │   ├── useBLEExchange.ts
│   │   │   │   ├── useNFCExchange.ts
│   │   │   │   └── useLocation.ts
│   │   │   ├── utils/             # 유틸리티
│   │   │   │   ├── crypto.ts      # 해시, 암호화
│   │   │   │   ├── ndef.ts        # NDEF 인코딩/디코딩
│   │   │   │   └── geolocation.ts
│   │   │   ├── types/             # TypeScript 타입 정의
│   │   │   │   ├── user.ts
│   │   │   │   ├── exchange.ts
│   │   │   │   ├── ble.ts
│   │   │   │   └── api.ts
│   │   │   └── constants/         # 상수
│   │   │       ├── ble.ts         # BLE UUID, RSSI 등
│   │   │       └── api.ts         # API URL 등
│   │   ├── android/               # Android 네이티브 코드
│   │   │   └── app/src/main/java/
│   │   │       └── com/alive/connection/
│   │   │           ├── hce/       # HCE 서비스
│   │   │           └── ble/       # BLE Peripheral (네이티브)
│   │   ├── ios/                   # iOS 네이티브 코드
│   │   │   └── AliveConnection/
│   │   │       └── BLE/           # CBPeripheralManager (네이티브)
│   │   ├── app.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/                    # Backend API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── exchange.ts
│   │   │   │   ├── device.ts
│   │   │   │   └── link.ts
│   │   │   ├── services/
│   │   │   │   ├── AuthService.ts
│   │   │   │   ├── ProfileService.ts
│   │   │   │   ├── ExchangeService.ts
│   │   │   │   ├── GeocodingService.ts
│   │   │   │   └── PushService.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   └── rateLimit.ts
│   │   │   ├── models/            # Prisma 모델
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── docker-compose.yml
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # ALIVE Link 웹 프로필
│       ├── src/
│       │   └── pages/
│       │       └── [slug].tsx     # alive.link/{slug} 페이지
│       ├── package.json
│       └── next.config.js
│
├── packages/                      # 공유 패키지 (monorepo)
│   └── shared/
│       ├── types/                 # 공유 타입 정의
│       └── constants/             # 공유 상수
│
├── docs/                          # 문서
│   ├── API.md
│   ├── BLE_PROTOCOL.md
│   └── DEPLOYMENT.md
│
├── package.json                   # Monorepo root (Turborepo)
├── turbo.json
└── README.md
```

---

## ⚡ ExchangeManager — 통합 교환 조율기

```typescript
// src/services/exchange/ExchangeManager.ts
// BLE + NFC + QR 모든 교환 방식을 통합 관리하는 싱글톤

import { BLEExchangeService } from '../ble/BLEExchangeService';
import { NFCExchangeService } from '../nfc/NFCExchangeService';
import { LocationService } from '../location/LocationService';
import { exchangeApi } from '../api/exchange';
import { useExchangeStore } from '../../stores/exchangeStore';

type ExchangeMethod = 'ble' | 'nfc' | 'hce' | 'qr' | 'link';

interface ExchangeEvent {
  type: 'discovered' | 'request' | 'confirmed' | 'completed' | 'error';
  partnerId?: string;
  method?: ExchangeMethod;
  data?: any;
}

class ExchangeManager {
  private static instance: ExchangeManager;
  private bleService: BLEExchangeService;
  private nfcService: NFCExchangeService;
  private locationService: LocationService;
  private listeners: ((event: ExchangeEvent) => void)[] = [];
  
  static getInstance(): ExchangeManager {
    if (!this.instance) {
      this.instance = new ExchangeManager();
    }
    return this.instance;
  }
  
  // 교환 모드 시작 (홈 화면 진입 시)
  async startExchangeMode(): Promise<void> {
    // 1) BLE 발견 시작 (Primary — 항상)
    await this.bleService.startDiscovery();
    this.bleService.on('exchangeRequest', (data) => {
      this.emit({ type: 'request', partnerId: data.partnerUserId, method: 'ble' });
    });
    
    // 2) NFC 리스너 시작 (Secondary — 가능한 기기만)
    if (await this.nfcService.isSupported()) {
      await this.nfcService.startListening();
      this.nfcService.on('tagDetected', (data) => {
        this.emit({ type: 'request', partnerId: data.userId, method: 'nfc' });
      });
    }
    
    // 3) Android HCE 서비스 시작 (가능한 기기만)
    if (Platform.OS === 'android') {
      await this.startHCEService();
    }
  }
  
  // 교환 수락
  async acceptExchange(partnerId: string, method: ExchangeMethod): Promise<void> {
    try {
      // GPS 위치 획득
      const location = await this.locationService.getCurrentLocation();
      
      // 서버 API 호출
      const result = await exchangeApi.createExchange({
        partnerId,
        method,
        location: {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
        },
      });
      
      // 로컬 DB 저장
      await localDB.exchanges.create(result);
      
      // 상태 업데이트
      useExchangeStore.getState().addExchange(result);
      
      this.emit({ type: 'completed', partnerId, method, data: result });
      
    } catch (error) {
      // 오프라인 시 로컬 큐에 저장 → 나중에 동기화
      if (!isOnline()) {
        await offlineQueue.enqueue({
          action: 'exchange',
          partnerId,
          method,
          location: await this.locationService.getCurrentLocation(),
          timestamp: new Date().toISOString(),
        });
        this.emit({ type: 'completed', partnerId, method, data: { offline: true } });
      } else {
        this.emit({ type: 'error', data: error });
      }
    }
  }
  
  // 교환 모드 중지
  stopExchangeMode(): void {
    this.bleService.stopDiscovery();
    this.nfcService.stopListening();
  }
  
  // 이벤트 리스너
  on(listener: (event: ExchangeEvent) => void): void {
    this.listeners.push(listener);
  }
  
  private emit(event: ExchangeEvent): void {
    this.listeners.forEach(l => l(event));
  }
}

export default ExchangeManager;
```

---

## 🎨 디자인 가이드라인

### 브랜드 컬러
```
Primary:     #00D4AA (ALIVE Emerald)
Secondary:   #0A1628 (Deep Navy)
Accent:      #00B4D8 (Cyan)
Success:     #10B981
Warning:     #F59E0B
Error:       #EF4444
Background:  #0F172A (Dark) / #F8FAFC (Light)
Surface:     #1E293B (Dark) / #FFFFFF (Light)
Text:        #F1F5F9 (Dark) / #0F172A (Light)
```

### 교환 애니메이션
- 발견 시: 파동(ripple) 애니메이션 + 햅틱 피드백
- 교환 중: 두 원이 합쳐지는 모션
- 완료 시: 체크마크 + 컨페티 + 상대방 프로필 카드 슬라이드업

### 톤 & 무드
- XRX Technology의 Antigravity 스타일: 다크 모드 기본, 세련된 미니멀리즘
- 타이포: 가벼운 font-weight (light/regular), 넉넉한 여백
- 아이콘: Lucide React 일관 사용

---

## 📝 환경 변수

### Mobile (.env)
```
API_BASE_URL=https://api.alive.link/v1
GOOGLE_OAUTH_CLIENT_ID=xxx
APPLE_TEAM_ID=xxx
KAKAO_APP_KEY=xxx
SENTRY_DSN=xxx
```

### Server (.env)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/alive_connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxx
REDIS_URL=redis://localhost:6379
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
AWS_S3_BUCKET=alive-connection-assets
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx  # 역지오코딩용
FCM_SERVICE_ACCOUNT=xxx  # Firebase Admin
```

---

## 🔑 주요 기술적 고려사항

### 1. BLE Peripheral 모드의 크로스 플랫폼 이슈
- `react-native-ble-plx`는 Central 전용 → Peripheral에는 `react-native-ble-advertiser` 또는 네이티브 모듈 필요
- iOS: `CBPeripheralManager` (Swift 네이티브 브릿지)
- Android: `BluetoothLeAdvertiser` (Kotlin 네이티브 브릿지)
- **권장**: Peripheral 부분만 네이티브 모듈로 작성, 나머지는 JS

### 2. 백그라운드 BLE 스캔
- iOS: `CBCentralManager` 백그라운드 모드 (Info.plist에 `bluetooth-central` 추가), 단 스캔 주기가 OS에 의해 제한됨
- Android: `ForegroundService` + 알림으로 안정적 백그라운드 스캔
- **MVP에서는 포그라운드 우선**, 백그라운드는 Phase 2에서 최적화

### 3. 오프라인 교환
- BLE 발견 + userId 교환은 오프라인에서도 가능
- 서버 API 호출 부분만 큐에 저장 → 네트워크 복구 시 동기화
- 교환 UI는 즉시 표시 (Optimistic Update)

### 4. 충돌 방지
- 동일인과 중복 교환 방지: 서버에서 (initiator_id, receiver_id, exchanged_at) 5분 이내 중복 체크
- BLE 스캔 중 동일 기기 재발견 방지: 발견된 userId를 5분간 캐싱

### 5. ALIVE Link 웹 프로필
- alive.link/{slug} → Next.js SSR로 SEO 최적화된 공개 프로필 페이지
- vCard 다운로드 버튼 (앱 미설치 사용자용)
- 앱 설치 딥링크 (Universal Link / App Link)

---

## 🧪 테스트 전략

### BLE 테스트
- 실제 디바이스 2대 필수 (에뮬레이터에서 BLE 불가)
- Android: `nRF Connect` 앱으로 BLE 서비스/특성 디버깅
- iOS: Xcode Console + `CBCentralManager` 로그

### NFC 테스트
- Android: 실제 디바이스 2대 (HCE 지원 기기)
- iOS: iPhone 7+ (Core NFC)

### API 테스트
- Postman / Bruno 컬렉션 제공
- Jest + Supertest (백엔드 통합 테스트)

---

## 📌 이 컨텍스트 사용법 (바이브코딩)

이 문서를 AI 코딩 도구(Claude Code, Cursor, Windsurf 등)에 붙여넣고, 다음과 같이 작업을 요청하세요:

### 예시 프롬프트
```
위 ALIVE Connection 컨텍스트를 기반으로:
1. React Native 프로젝트를 초기화하고
2. BLEExchangeService를 구현해줘
3. ExchangeReadyScreen UI를 만들어줘
```

```
위 컨텍스트의 Backend API 명세를 기반으로:
Express.js 서버를 셋업하고 Exchange API를 구현해줘
```

```
위 컨텍스트에서 NFC/HCE Android 네이티브 모듈을 구현해줘
```
