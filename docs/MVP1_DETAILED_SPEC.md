# ALIVE Connection - MVP 1단계 상세 구현 명세서

> **목표**: Core BLE Connection 기능 완성
> **슬로건**: "만남을 기록하다"
> **상태**: 완료 (2026년 2월)

---

## 플랫폼별 구현 범위

| 플랫폼 | 역할 | 상태 |
|--------|------|------|
| **Android 앱** | BLE 교환, 프로필 관리, 타임라인, 메시징 | ✅ 완료 |
| **iOS 앱** | BLE 교환, 프로필 관리, 타임라인, 메시징 | ✅ 완료 |
| **Web Dashboard** | 연결 관리, 검색, 채팅 UI | ✅ 완료 |
| **Backend (Supabase)** | 인증, 데이터 저장, 실시간 동기화 | ✅ 완료 |

---

# 📱 모바일 앱 (iOS / Android)

## 1. 인증 시스템

| 기능 | 설명 | 상태 |
|------|------|------|
| Google OAuth | Supabase Auth 연동 | ✅ 완료 |
| Apple Sign-In | iOS 앱스토어 필수 | ⏳ MVP2 예정 |
| 자동 로그인 | 토큰 저장 및 세션 유지 | ✅ 완료 |
| 로그아웃 | 세션 종료 및 로컬 데이터 정리 | ✅ 완료 |

**구현 파일**: `src/screens/LoginScreen.tsx`, `src/store/useAuthStore.ts`

---

## 2. 프로필 관리

### 2.1 기본 정보
| 필드 | 타입 | 필수 |
|------|------|------|
| 이름 (name) | 텍스트 | O |
| 성별 (gender) | 선택 | X |
| 회사 (company) | 텍스트 | X |
| 직함 (title) | 텍스트 | X |
| 자기소개 (bio) | 텍스트 | X |
| 프로필 사진 (avatarUrl) | 이미지 | X |

### 2.2 듀얼 모드 시스템
```
Business Mode: 이메일, 전화번호, LinkedIn, 웹사이트
Casual Mode: Twitter/X, Instagram, WhatsApp
공통: 이름, 회사, 직함, 프로필 사진
```

**상태**: ✅ 완료
**구현 파일**: `src/screens/ProfileScreen.tsx`, `src/store/useProfileStore.ts`

---

## 3. BLE 교환 프로토콜

### 3.1 BLE 구성

| 항목 | 값 |
|------|---|
| Service UUID | `A11FE000-C0FF-EC10-8000-000500D10000` |
| userId Characteristic | `A11FE001-C0FF-EC10-8000-000500D10000` |
| Manufacturer Data 시그니처 | `0xA1 0x1F` |
| RSSI 발견 임계값 | -50 dBm (~30cm) |
| RSSI 자동교환 임계값 | -35 dBm (~10cm) |

### 3.2 교환 플로우
```
앱 시작 → 로그인 → userId 획득
    ↓
BLE 광고 시작 (Service UUID + userId)
    ↓
BLE 스캔 시작 (ALIVE Service UUID 필터)
    ↓
[상대방 감지] RSSI > -50dBm
    ↓
Fast Path: Manufacturer Data에서 userId 추출 (~100ms)
(실패 시 GATT 연결 Fallback ~10s)
    ↓
Supabase에서 상대방 프로필 조회
    ↓
"김철수님을 추가하겠습니까?" 팝업
    ↓
[수락] → interactions 저장 + 지식그래프 + GPS 위치
[거부] → 5분간 동일인 무시 (캐시)
```

### 3.3 BLE 상태 관리
| 상태 | 설명 | UI 표시 |
|------|------|---------|
| `IDLE` | 대기 | "Tap to connect" |
| `SCANNING` | 스캔 중 | PulseAnimation |
| `ADVERTISING` | 광고 중 | PulseAnimation |
| `DISCOVERED` | 상대방 감지 | 알림 표시 |
| `CONNECTING` | GATT 연결 중 | 로딩 |
| `EXCHANGING` | 교환 진행 | 프로필 시트 |
| `AWAITING_CONFIRM` | 승인 대기 | ExchangeRequestSheet |
| `COMPLETED` | 교환 완료 | HandshakeSuccess 오버레이 |
| `ERROR` | 오류 | 에러 메시지 |

### 3.4 성공 피드백
| 피드백 | 구현 | 상태 |
|--------|------|------|
| 햅틱 | `expo-haptics` Heavy Impact | ✅ 완료 |
| UI 모달 | HandshakeSuccess 오버레이 (프로필 + 위치 + 시간) | ✅ 완료 |

**구현 파일**: `src/services/ble/BLEScanner.ts`, `src/services/ble/BLEAdvertiser.ts`, `src/services/exchange/ExchangeManager.ts`

---

## 4. 위치 자동 캡처

### 4.1 플로우
```
BLE 교환 성공 → GPS 좌표 획득 (3초 타임아웃)
  → 실패 시 최근 위치 폴백 (getLastKnownPositionAsync)
    → 역지오코딩 (expo-location reverseGeocodeAsync)
      → 장소명, 주소 파싱 → interaction 레코드 저장
```

### 4.2 권한 처리
| 상태 | 동작 |
|------|------|
| granted | 정상 위치 캡처 |
| denied | 위치 없이 저장 (lat: 0, lng: 0) |
| not_determined | 권한 요청 팝업 |

**상태**: ✅ 완료
**구현 파일**: `src/services/location/LocationService.ts`

---

## 5. 타임라인 뷰

### 5.1 섹션 그룹핑
| 날짜 조건 | 표시 |
|-----------|------|
| 오늘 | "Today" |
| 어제 | "Yesterday" |
| 이번 주 | 요일명 |
| 올해 | "월 일" |
| 이전 | "월 일, 연도" |

### 5.2 검색 대상
이름, 회사, 직함, 장소, 도시, 메모

**상태**: ✅ 완료
**구현 파일**: `src/screens/TimelineScreen.tsx`

---

## 6. 프로필 상세 화면

프로필 정보, 만남 컨텍스트 (날짜/시간/장소), 메모 편집, 소셜 링크 표시, 메시지 보내기 버튼.

**상태**: ✅ 완료
**구현 파일**: `src/screens/ProfileDetailScreen.tsx`

---

## 7. 1:1 메시징

Supabase Realtime Broadcast 기반 실시간 채팅.
- 텍스트 메시지 전송/수신
- 타이핑 표시
- 읽음 확인

**상태**: ✅ 완료
**구현 파일**: `src/screens/ChatScreen.tsx`, `src/services/messaging/`, `src/store/useMessageStore.ts`

---

## 8. ALIVE Engine 지식그래프 통합

- 만남 시 Person 노드 자동 생성
- MET_AT 관계 엣지 생성
- 오프라인 시 AsyncStorage 큐에 저장, 재연결 시 자동 동기화
- 메모 추가 시 enrichFromMemo() 호출

**상태**: ✅ 완료
**구현 파일**: `src/services/alive-engine/`, `src/store/useGraphStore.ts`

---

# 💻 웹 대시보드

| 기능 | 상태 |
|------|------|
| Google OAuth 로그인 | ✅ 완료 |
| 연결 목록 조회 (사이드바) | ✅ 완료 |
| 연결 상세 보기 | ✅ 완료 |
| 검색 기능 | ✅ 완료 |
| 채팅 UI | ✅ 완료 |
| 다크모드 | ✅ 완료 |

**구현 파일**: `web/src/`

---

# 🗄️ 백엔드 (Supabase)

## 데이터베이스 테이블

```sql
users (id, auth_id, name, gender, bio, avatar_url, company, title, social_links JSONB, default_mode)
profile_cards (id, user_id, name, mode, is_default, display_name, display_title, visible_link_keys)
interactions (id, source_user_id, target_user_id, met_at, location_*, memo, tags, status)
messages (id, sender_id, receiver_id, content, created_at)
notifications (id, user_id, type, data, read_at)
```

## RLS 정책
| 테이블 | 정책 |
|--------|------|
| users | SELECT: 모두, UPDATE: 본인만 |
| interactions | SELECT: 관계자만, INSERT: source만 |
| messages | SELECT: sender/receiver만 |

---

# 📋 MVP 1단계 체크리스트

## 완료 (P0)
- [x] Google OAuth 로그인
- [x] BLE 양방향 교환 (Fast Path + GATT Fallback)
- [x] 커스텀 네이티브 BLE Peripheral (Android + iOS)
- [x] 프로필 등록/편집 + 듀얼 모드
- [x] GPS 위치 자동 캡처
- [x] 타임라인 뷰 + 검색
- [x] 프로필 상세 화면 + 메모
- [x] 1:1 메시징 (Supabase Realtime)
- [x] ALIVE Engine 지식그래프 통합
- [x] Supabase 실제 DB 연동
- [x] 웹 대시보드

## MVP2 예정
- [ ] Apple Sign-In
- [ ] 프로필 사진 업로드
- [ ] 백그라운드 BLE 스캔
- [ ] 관계 그래프 시각화
- [ ] 태그 시스템
- [ ] 푸시 알림

---

*문서 갱신일: 2026-02-25*
*버전: MVP 1.0 (BLE-v2)*
