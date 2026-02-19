# ALIVE Connection - MVP 1단계 상세 구현 명세서

> **목표**: 2월 내 Core Connection 기능 완성
> **슬로건**: "만남을 기록하다"

---

## 플랫폼별 구현 범위

| 플랫폼 | 역할 | 우선순위 |
|--------|------|----------|
| **iOS 앱** | 핵심 NFC 연결, 프로필 관리, 타임라인 | P0 (필수) |
| **Android 앱** | 핵심 NFC 연결, 프로필 관리, 타임라인 | P0 (필수) |
| **Web Dashboard** | 연결 관리, 검색, 프로필 조회 | P1 (권장) |
| **Backend (Supabase)** | 인증, 데이터 저장, 실시간 동기화 | P0 (필수) |

---

# 📱 모바일 앱 (iOS / Android)

## 1. 인증 시스템

### 1.1 소셜 로그인
| 기능 | 설명 | 상태 |
|------|------|------|
| Google OAuth | Supabase Auth 연동 Google 로그인 | ✅ 완료 |
| Apple Sign-In | iOS 앱스토어 필수 (추후) | ⏳ 예정 |
| 자동 로그인 | 토큰 저장 및 세션 유지 | ✅ 완료 |
| 로그아웃 | 세션 종료 및 로컬 데이터 정리 | ✅ 완료 |

### 1.2 온보딩 플로우
| 단계 | 설명 | 상태 |
|------|------|------|
| 권한 요청 | NFC, 위치, 마이크 권한 안내 | 🔧 진행중 |
| 프로필 최초 설정 | 이름, 회사, 직함 입력 | ✅ 완료 |
| 모드 선택 | Business/Casual 기본 모드 선택 | ✅ 완료 |

**구현 파일**: `src/screens/LoginScreen.tsx`, `src/store/useAuthStore.ts`

---

## 2. 프로필 관리

### 2.1 기본 정보 입력
| 필드 | 타입 | 필수 | 비고 |
|------|------|------|------|
| 이름 (name) | 텍스트 | O | 최대 255자 |
| 성별 (gender) | 선택 | X | Male/Female/Other |
| 회사 (company) | 텍스트 | X | 최대 255자 |
| 직함 (title) | 텍스트 | X | 최대 255자 |
| 자기소개 (bio) | 텍스트 | X | 최대 500자 |
| 프로필 사진 (avatarUrl) | 이미지 | X | 업로드 기능 필요 |

### 2.2 소셜 링크 관리
| 링크 타입 | Business 모드 | Casual 모드 |
|-----------|---------------|-------------|
| Email | O | X |
| Phone | O | X |
| LinkedIn | O | X |
| Website | O | X |
| Twitter/X | X | O |
| Instagram | X | O |
| WhatsApp | X | O |

### 2.3 듀얼 모드 시스템
```
┌─────────────────────────────────────────────────┐
│  Business Mode          │  Casual Mode          │
├─────────────────────────┼───────────────────────┤
│  - 이메일               │  - Twitter/X          │
│  - 전화번호             │  - Instagram          │
│  - LinkedIn             │  - WhatsApp           │
│  - 웹사이트             │                       │
├─────────────────────────┴───────────────────────┤
│  공통: 이름, 회사, 직함, 프로필 사진             │
└─────────────────────────────────────────────────┘
```

**상태**: ✅ UI 완료, 🔧 Supabase 연동 필요

**구현 파일**: `src/screens/ProfileScreen.tsx`, `src/store/useProfileStore.ts`

---

## 3. NFC 핸드셰이크

### 3.1 NFC 프로토콜
```typescript
// NFC 페이로드 구조
interface NfcHandshakePayload {
  version: "1.0.0";           // 프로토콜 버전
  profileCard: {
    userId: string;           // 사용자 고유 ID
    mode: "business" | "casual";
    displayName: string;
    displayTitle?: string;
    displayCompany?: string;
    avatarUrl?: string;
    visibleLinks: {           // 모드에 따른 링크
      email?: string;
      phone?: string;
      linkedin?: string;
      // ...
    };
  };
  timestamp: string;          // ISO 8601
  deviceId: string;           // 익명 기기 ID
}
```

### 3.2 핸드셰이크 플로우
```
┌──────────────┐                    ┌──────────────┐
│   Phone A    │                    │   Phone B    │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  1. NFC 태그 감지                  │
       │ ◄─────────────────────────────────►
       │                                   │
       │  2. NDEF 메시지 교환               │
       │  ─────────────────────────────────►
       │  ◄─────────────────────────────────
       │                                   │
       │  3. GPS 위치 캡처                  │
       │  (각 기기에서 독립적)              │
       │                                   │
       │  4. 로컬 저장                      │
       │  (각 기기에서 독립적)              │
       │                                   │
       │  5. 성공 피드백                    │
       │  (햅틱 + 사운드 + UI)              │
       │                                   │
```

### 3.3 NFC 상태 관리
| 상태 | 설명 | UI 표시 |
|------|------|---------|
| `isSupported: false` | 기기 NFC 미지원 | "NFC not available" |
| `isEnabled: false` | NFC 비활성화 | "Enable NFC in settings" |
| `isScanning: false` | 대기 상태 | "Tap to connect" |
| `isScanning: true` | 스캔 중 | "Hold phones together" + 펄스 애니메이션 |

### 3.4 성공 피드백
| 피드백 타입 | 구현 | 상태 |
|-------------|------|------|
| 햅틱 | `expo-haptics` Heavy Impact | ✅ 완료 |
| 사운드 | 성공 효과음 | 🔧 에셋 필요 |
| UI 모달 | 연결된 프로필 정보 표시 | ✅ 완료 |

**구현 파일**: `src/services/nfc/NfcExchanger.ts`, `src/hooks/useNfcHandshake.ts`, `src/components/HandshakeSuccess/`

---

## 4. 위치 자동 캡처

### 4.1 위치 데이터 구조
```typescript
interface LocationData {
  latitude: number;           // 위도
  longitude: number;          // 경도
  address?: string;           // 전체 주소
  placeName?: string;         // 장소명 (예: "스타벅스 강남점")
  city?: string;              // 도시
  country?: string;           // 국가
}
```

### 4.2 역지오코딩 플로우
```
1. NFC 핸드셰이크 성공
       │
       ▼
2. GPS 좌표 획득 (expo-location)
       │
       ▼
3. 역지오코딩 API 호출
   - expo-location reverseGeocodeAsync
       │
       ▼
4. 장소명, 주소 파싱 및 저장
       │
       ▼
5. Interaction 레코드에 저장
```

### 4.3 위치 권한 처리
| 권한 상태 | 동작 |
|-----------|------|
| granted | 정상 위치 캡처 |
| denied | 위치 없이 저장 (latitude: 0, longitude: 0) |
| not_determined | 권한 요청 팝업 |

**구현 파일**: `src/store/useConnectionStore.ts`

---

## 5. 타임라인 뷰

### 5.1 화면 구성
```
┌─────────────────────────────────────┐
│  Timeline                    42     │  ← 헤더 (총 연결 수)
├─────────────────────────────────────┤
│  🔍 Search connections...           │  ← 검색바
├─────────────────────────────────────┤
│  TODAY                              │  ← 섹션 헤더
│  ┌─────────────────────────────────┐│
│  │ 👤 김철수           2:30 PM     ││  ← 연결 카드
│  │    Product Manager at Kakao     ││
│  │    📍 스타벅스 강남역점          ││  ← 위치 태그
│  │    📝 AI 협업 논의...           ││  ← 메모 미리보기
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  YESTERDAY                          │
│  ┌─────────────────────────────────┐│
│  │ 👤 박영희           4:15 PM     ││
│  │    CEO at StartupXYZ            ││
│  │    📍 코엑스 컨퍼런스홀          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 5.2 섹션 그룹핑 로직
| 날짜 조건 | 표시 텍스트 |
|-----------|-------------|
| 오늘 | "Today" |
| 어제 | "Yesterday" |
| 이번 주 | 요일명 (예: "Wednesday") |
| 올해 | "월 일" (예: "January 15") |
| 이전 년도 | "월 일, 연도" (예: "December 20, 2025") |

### 5.3 검색 기능
| 검색 대상 | 필드 |
|-----------|------|
| 이름 | `user.name` |
| 회사 | `user.company` |
| 직함 | `user.title` |
| 장소 | `interaction.location.placeName` |
| 도시 | `interaction.location.city` |
| 메모 | `interaction.memo` |

**상태**: ✅ 완료

**구현 파일**: `src/screens/TimelineScreen.tsx`, `src/store/useConnectionStore.ts`

---

## 6. 홈 화면

### 6.1 화면 구성
```
┌─────────────────────────────────────┐
│  Hi, John            [Business ▼]   │  ← 인사말 + 모드 토글
│  Ready to connect                   │
├─────────────────────────────────────┤
│                                     │
│         ╭──────────────╮            │
│       ╭─│              │─╮          │  ← 펄스 링 (스캔 중)
│     ╭─│ │   📱         │ │─╮        │
│     │ │ │              │ │ │        │
│     ╰─│ │              │ │─╯        │  ← NFC 아이콘
│       ╰─│              │─╯          │
│         ╰──────────────╯            │
│                                     │
│        Tap to connect               │  ← 상태 텍스트
│   Place your phone back-to-back     │  ← 안내 텍스트
│                                     │
├─────────────────────────────────────┤
│  RECENT                             │
│  ┌────────┐ ┌────────┐ ┌────────┐   │  ← 최근 3명
│  │ 👤 김  │ │ 👤 박  │ │ 👤 이  │   │
│  │ Kakao  │ │ Naver  │ │ Toss   │   │
│  └────────┘ └────────┘ └────────┘   │
└─────────────────────────────────────┘
```

### 6.2 NFC 상태별 UI
| 상태 | 원 배경색 | 아이콘 색상 | 상태 텍스트 |
|------|-----------|-------------|-------------|
| 미지원 | 회색 | 회색 | "NFC not available" |
| 비활성 | 연한 파랑 | 회색 | "Enable NFC in settings" |
| 대기 | 연한 파랑 | 파랑 | "Tap to connect" |
| 스캔중 | 연한 파랑 + 펄스 | 파랑 | "Hold phones together" |

**상태**: ✅ 완료

**구현 파일**: `src/screens/HomeScreen.tsx`

---

## 7. 프로필 상세 화면 (신규 개발 필요)

### 7.1 화면 구성
```
┌─────────────────────────────────────┐
│  ← Back                    ⋮ More   │
├─────────────────────────────────────┤
│           ┌───────────┐             │
│           │   👤      │             │  ← 프로필 사진
│           │           │             │
│           └───────────┘             │
│           김철수                     │
│      Product Manager at Kakao       │
├─────────────────────────────────────┤
│  MEETING CONTEXT                    │
│  📅 February 3, 2026, 2:30 PM       │
│  📍 스타벅스 강남역점                │
│     서울특별시 강남구 역삼동          │
├─────────────────────────────────────┤
│  MEMO                               │
│  ┌─────────────────────────────────┐│
│  │ AI 협업 프로젝트 논의.           ││
│  │ 다음 주 미팅 예정.               ││
│  │ [Edit]                          ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  CONTACT                            │
│  📧 chulsoo@kakao.com               │
│  📞 +82-10-1234-5678                │
│  🔗 linkedin.com/in/chulsoo         │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │   💬 Send Message             │  │  ← 액션 버튼
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 7.2 기능 목록
| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 프로필 정보 표시 | 이름, 직함, 회사, 사진 | P0 |
| 만남 컨텍스트 | 날짜, 시간, 장소 | P0 |
| 메모 표시/편집 | 텍스트 메모 CRUD | P0 |
| 연락처 표시 | 소셜 링크 목록 | P0 |
| 연락처 클릭 | 외부 앱 연결 (전화, 이메일 등) | P1 |
| 메시지 보내기 | 인앱 채팅 (MVP2) | P2 |

**상태**: 🔧 개발 필요

**구현 파일**: `src/screens/ProfileDetailScreen.tsx` (생성 필요)

---

# 💻 웹 대시보드

## 1. 인증

| 기능 | 설명 | 상태 |
|------|------|------|
| Google OAuth | Supabase Auth 연동 | ✅ 완료 |
| 게스트 모드 | 데모용 샘플 데이터 조회 | ✅ 완료 |
| 로그아웃 | 세션 종료 | ✅ 완료 |

**구현 파일**: `web/src/App.tsx`

---

## 2. 연결 목록 (사이드바)

### 2.1 UI 구성
```
┌────────────────────────┐
│  ALIVE      [Logout]   │
│  Dashboard             │
├────────────────────────┤
│  🔍 Search people...   │
├────────────────────────┤
│  ┌──────────────────┐  │
│  │ 👤 김철수        │  │  ← 선택된 연결 (하이라이트)
│  │    PM at Kakao   │  │
│  │           Feb 3  │  │
│  └──────────────────┘  │
│  ┌──────────────────┐  │
│  │ 👤 박영희        │  │
│  │    CEO at XYZ    │  │
│  │           Feb 2  │  │
│  └──────────────────┘  │
└────────────────────────┘
```

### 2.2 기능
| 기능 | 설명 | 상태 |
|------|------|------|
| 연결 목록 표시 | 시간순 정렬 | ✅ 완료 |
| 검색 | 이름, 회사 필터링 | ✅ 완료 |
| 연결 선택 | 상세 정보 표시 | ✅ 완료 |

---

## 3. 연결 상세 (메인 영역)

### 3.1 UI 구성
```
┌─────────────────────────────────────────────────────────┐
│  👤 김철수                              [Profile] [⋮]   │
│     Product Manager at Kakao Corp                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌───────────────────────────┐ │
│  │ MEETING CONTEXT     │  │ DIRECT MESSAGING          │ │
│  │                     │  │                           │ │
│  │ 📅 Feb 3, 2:30 PM   │  │    Start a Conversation   │ │
│  │ 📍 스타벅스 강남     │  │                           │ │
│  │    서울, 한국        │  │    Send a followup note   │ │
│  ├─────────────────────┤  │    to 김철수...           │ │
│  │ BIO                 │  │                           │ │
│  │ AI 전문가, 10년 경력 │  │ ┌───────────────────────┐ │ │
│  ├─────────────────────┤  │ │ Type a message...  [→]│ │ │
│  │ SOCIAL PRESENCE     │  │ └───────────────────────┘ │ │
│  │ [Syncing links...]  │  └───────────────────────────┘ │
│  └─────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

### 3.2 기능
| 기능 | 설명 | 상태 |
|------|------|------|
| 프로필 정보 | 이름, 직함, 회사, 사진 | ✅ 완료 |
| 만남 컨텍스트 | 날짜, 시간, 장소 | ✅ 완료 |
| 자기소개 | Bio 텍스트 | ✅ 완료 |
| 소셜 링크 | 연락처 목록 | 🔧 연동 필요 |
| 메시징 UI | 채팅 인터페이스 | ✅ UI 완료 |
| 메시징 기능 | 실제 메시지 전송 | ⏳ MVP2 |

---

# 🗄️ 백엔드 (Supabase)

## 1. 데이터베이스 테이블

### 1.1 users (사용자)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    bio TEXT,
    avatar_url TEXT,
    company VARCHAR(255),
    title VARCHAR(255),
    social_links JSONB DEFAULT '{}',
    default_mode VARCHAR(20) DEFAULT 'business',
    profile_view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);
```

### 1.2 interactions (만남 기록)
```sql
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_user_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID NOT NULL REFERENCES users(id),
    met_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    location_point GEOGRAPHY(POINT, 4326),
    location_address TEXT,
    location_place_name VARCHAR(255),
    location_city VARCHAR(255),
    location_country VARCHAR(255),
    event_context VARCHAR(500),
    memo TEXT,
    voice_memo_url TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'
);
```

### 1.3 profile_cards (프로필 카드)
```sql
CREATE TABLE profile_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    display_name VARCHAR(255),
    display_title VARCHAR(255),
    display_company VARCHAR(255),
    visible_link_keys TEXT[] DEFAULT ARRAY['email', 'phone', 'linkedin']
);
```

---

## 2. Row Level Security (RLS)

| 테이블 | 정책 | 설명 |
|--------|------|------|
| users | SELECT: 모두 | 공개 프로필 조회 가능 |
| users | UPDATE: 본인만 | 자신의 프로필만 수정 |
| interactions | SELECT: 관계자만 | source 또는 target인 경우만 |
| interactions | INSERT: source만 | 본인이 source인 경우만 |

---

## 3. API 엔드포인트 (Supabase Client)

### 3.1 인증
```typescript
// 로그인
supabase.auth.signInWithOAuth({ provider: 'google' })

// 세션 확인
supabase.auth.getSession()

// 로그아웃
supabase.auth.signOut()
```

### 3.2 프로필
```typescript
// 프로필 조회
supabase.from('users').select('*').eq('id', userId).single()

// 프로필 업데이트
supabase.from('users').update({ name, company, ... }).eq('auth_id', authId)
```

### 3.3 연결
```typescript
// 내 연결 목록
supabase.from('interactions')
  .select('*, target_user:users!interactions_target_user_id_fkey(*)')
  .eq('source_user_id', myUserId)
  .order('met_at', { ascending: false })

// 새 연결 추가
supabase.from('interactions').insert({
  source_user_id: myUserId,
  target_user_id: targetUserId,
  met_at: timestamp,
  location_lat: lat,
  location_lng: lng,
  ...
})
```

---

# 📋 MVP 1단계 체크리스트

## 필수 완료 (P0)

### 모바일 앱
- [x] Google OAuth 로그인
- [x] NFC 핸드셰이크 프로토콜
- [x] 프로필 등록/편집 UI
- [x] 듀얼 모드 (Business/Casual)
- [x] 위치 자동 캡처
- [x] 타임라인 뷰
- [x] 검색 기능
- [x] 홈 화면 NFC 대기 상태
- [x] 핸드셰이크 성공 모달
- [ ] Supabase 실제 연동 (Mock → 실제)
- [ ] 프로필 상세 화면
- [ ] 메모 입력/편집

### 웹 대시보드
- [x] Google OAuth 로그인
- [x] 연결 목록 조회
- [x] 연결 상세 보기
- [x] 검색 기능
- [ ] Supabase 실제 연동

### 백엔드
- [x] 데이터베이스 스키마
- [x] RLS 정책
- [ ] Supabase 프로젝트 설정
- [ ] 환경변수 구성

## 권장 완료 (P1)
- [ ] Apple Sign-In (iOS)
- [ ] 프로필 사진 업로드
- [ ] 연락처 클릭 → 외부 앱 연결
- [ ] 푸시 알림 기초 설정

## 향후 예정 (P2)
- [ ] 인앱 메시징
- [ ] 음성 메모 녹음
- [ ] 오프라인 모드

---

# 🚀 2월 개발 스프린트

## Week 1 (2/3 ~ 2/9)
- [ ] Supabase 프로젝트 생성 및 환경 구성
- [ ] 모바일 앱 Supabase 연동
- [ ] 프로필 CRUD 실제 동작

## Week 2 (2/10 ~ 2/16)
- [ ] 프로필 상세 화면 개발
- [ ] 메모 입력/편집 기능
- [ ] 웹 대시보드 Supabase 연동

## Week 3 (2/17 ~ 2/23)
- [ ] 통합 테스트
- [ ] 버그 수정
- [ ] UI/UX 개선

## Week 4 (2/24 ~ 2/28)
- [ ] TestFlight 빌드 (iOS)
- [ ] Internal Testing (Android)
- [ ] 베타 테스터 배포

---

*문서 작성일: 2026-02-03*
*버전: MVP 1.0 Draft*
