# ALIVE Connection - MVP 로드맵

> **"기록은 최소화, 기억은 극대화"**
> BLE 기반 관계 지능 플랫폼

---

## 비전

**ALIVE Connection**은 단순한 명함 교환 앱이 아닙니다.
**나를 중심으로 한 인맥 지식그래프(Knowledge Graph)**를 자동으로 구축하여,
비즈니스 관계의 맥락과 가치를 시각화하고 인사이트를 제공하는 **관계 지능 플랫폼**입니다.

---

## 지식그래프 온톨로지 설계

### 노드(Node) 정의
```
[Person]   — 사용자 및 연결된 인맥 (이름, 직함, 회사, 소셜 링크, 관심사)
[Company]  — 소속 회사/조직 (회사명, 산업군, 규모, 위치)
[Location] — 만남 장소 (장소명, 주소, GPS 좌표)
[Event]    — 만남 컨텍스트 (이벤트명, 날짜, 장소)
```

### 엣지(Edge/Relation) 정의
```
[MET_AT]        — 만남 관계 (시간, 장소, 메모)
[WORKS_AT]      — 소속 관계 (Person → Company)
[CONTACTED]     — 연락 이력 (횟수, 마지막 연락)
[INTRODUCED_BY] — 소개 관계
[SIMILAR_TO]    — 유사성 관계 (AI 추론)
```

---

## MVP 1단계: Core BLE Connection (2월) — 완료

> **"만남을 기록하다"** - BLE 양방향 교환 + 자동 컨텍스트 기록

### 완료된 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **BLE 양방향 교환** | Fast Path (Manufacturer Data ~100ms) + GATT Fallback | ✅ 완료 |
| **커스텀 네이티브 모듈** | Android Kotlin + iOS Swift BLE Peripheral | ✅ 완료 |
| **Google 로그인** | Supabase Auth 기반 소셜 로그인 | ✅ 완료 |
| **프로필 등록** | 이름, 직함, 회사, 소셜 링크 입력 | ✅ 완료 |
| **듀얼 모드** | 비즈니스/캐주얼 프로필 전환 | ✅ 완료 |
| **위치 자동 캡처** | GPS + 역지오코딩 (3초 타임아웃) | ✅ 완료 |
| **타임라인 뷰** | 날짜별 연결 히스토리 + 검색 | ✅ 완료 |
| **프로필 상세** | 연결 상대 상세 정보 + 메모 | ✅ 완료 |
| **1:1 메시징** | Supabase Realtime 기반 실시간 채팅 | ✅ 완료 |
| **ALIVE Engine 통합** | 지식그래프 Person 노드 자동 생성 + 오프라인 큐 | ✅ 완료 |
| **웹 대시보드** | 인증, 연결 목록, 상세 보기, 채팅 UI | ✅ 완료 |
| **Supabase 연동** | 실제 DB 저장 (users, interactions, messages) | ✅ 완료 |

### 데이터 모델
```sql
users (id, name, company, title, social_links, avatar_url)
interactions (source_user_id, target_user_id, met_at, location_*, memo)
messages (sender_id, receiver_id, content, created_at)
```

### 검증된 가설
- BLE 근접 교환은 userId 전달에 안정적으로 작동한다
- Fast Path는 거의 즉시(~100ms) 교환 경험을 제공한다
- 크로스 플랫폼 (Android ↔ iOS) BLE Peripheral이 안정적이다

---

## MVP 2단계: Relationship Graph & Polish (3월)

> **"관계를 시각화하다"** - 지식그래프 기반 관계망 시각화 + 앱 완성도

### 계획 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| **관계 그래프 뷰** | Force-directed 인맥 네트워크 시각화 | P0 |
| **관계 강도 표시** | 만남 횟수, 연락 빈도 기반 점수화 | P0 |
| **인맥 클러스터링** | 회사별, 산업별, 장소별 자동 그룹핑 | P1 |
| **태그 시스템** | 커스텀 태그로 연결 분류 | P1 |
| **백그라운드 BLE 스캔** | Android Foreground Service | P1 |
| **Apple Sign-In** | iOS 앱스토어 필수 요건 | P0 |
| **프로필 사진 업로드** | Supabase Storage 연동 | P1 |
| **음성 메모** | 만남 직후 음성 기록 | P2 |
| **프로필 조회 알림** | 누가 내 프로필을 봤는지 | P2 |
| **푸시 알림** | Expo Notifications 기반 | P1 |
| **배터리 최적화** | BLE 스캔 주기 동적 조절 | P1 |
| **QR 코드 폴백** | BLE 불가 시 링크 공유 | P2 |

---

## MVP 3단계: Relationship Intelligence (4월~)

> **"관계에서 인사이트를 얻다"** - AI 기반 관계 추천 및 분석

### 계획 기능

| 기능 | 설명 | 가치 |
|------|------|------|
| **AI 관계 인사이트** | "이 분과 3개월째 연락이 없습니다" | 관계 유지 리마인더 |
| **소개 추천** | "A님과 B님을 연결해드릴까요?" | 공통점 기반 매칭 |
| **네트워킹 추천** | "이 행사에서 만날 만한 분들" | 위치 기반 추천 |
| **관계 요약 리포트** | 월간/분기별 네트워킹 분석 | 인맥 성장 추적 |
| **공유 인맥 탐색** | "A님과 공통으로 아는 분 3명" | 네트워크 중첩 분석 |
| **캘린더 연동** | 미팅 일정과 연결 자동 매칭 | 컨텍스트 강화 |
| **명함 스캔 통합** | 기존 종이 명함 OCR 변환 | 기존 인맥 마이그레이션 |
| **팀 네트워크** | 팀원들의 인맥을 통합 조회 | B2B 기능 |

### AI 추론 엔진
```python
relationship_strength = (
    meeting_count * 0.3 +
    message_count * 0.25 +
    recency_score * 0.25 +
    profile_view_count * 0.1 +
    shared_context * 0.1
)
```

---

## 비즈니스 모델

### Phase 1: B2C Freemium
| 플랜 | 가격 | 기능 |
|------|------|------|
| **Free** | 무료 | 월 50회 BLE 교환, 기본 타임라인 |
| **Pro** | $4.99/월 | 무제한 교환, 그래프 뷰, 음성메모 |
| **Premium** | $9.99/월 | AI 인사이트, 연락 추천, 분석 리포트 |

### Phase 2: B2B Enterprise
| 플랜 | 가격 | 대상 |
|------|------|------|
| **Team** | $19/user/월 | 스타트업, 소규모 팀 |
| **Enterprise** | 문의 | 대기업 영업팀, VC |

---

## 경쟁 우위

| 기존 솔루션 | 한계 | ALIVE의 차별점 |
|-------------|------|----------------|
| 종이 명함 | 분실, 검색 불가, 수동 입력 | 제로 입력, 자동 디지털화 |
| QR코드 명함앱 | 일방향, 추가 앱 설치 필요 | BLE 양방향 동시 교환 |
| LinkedIn | 온라인 only, 오프라인 기록 불가 | BLE 근접 + 온라인 통합 |
| CRM (Salesforce) | 비싸고 복잡, 개인용 부적합 | 개인용 관계 지능, 직관적 UX |
| AirDrop/NameDrop | 연락처만 전달, 맥락 없음 | 시간/장소/메모 자동 기록 |

---

## 기술 스택

| 범주 | 기술 |
|------|------|
| 모바일 | React Native 0.73 + Expo 50 (Bare Workflow) |
| BLE | react-native-ble-plx + Custom Native BLE Peripheral |
| 상태관리 | Zustand 4.4 |
| 백엔드 | Supabase (Auth + PostgreSQL + Realtime) |
| 지식그래프 | ALIVE Engine (FastAPI + Neo4j) |
| 웹 대시보드 | React 19 + Vite 7 (Vercel) |
| 빌드 | EAS Build (Android/iOS) |

---

*"만남의 가치를 극대화하는 관계 지능 플랫폼, ALIVE Connection"*
