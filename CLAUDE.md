# ALIVE Connection — 프로젝트 규칙

## 프로젝트 개요

NFC/BLE 기반 제로입력 관계 지능 플랫폼. React Native(Expo Bare) + TypeScript + Supabase.

## 설치된 플러그인 & 스킬 자동 발동 규칙

아래 플러그인이 프로젝트에 활성화되어 있다. **사용자가 별도로 지시하지 않아도**, 작업 상황에 맞는 스킬을 자동 판단하여 발동해야 한다.

### 자동 발동 매트릭스

| 플러그인 | 자동 발동 조건 | 발동 방식 |
|---|---|---|
| **frontend-design** | UI 컴포넌트/화면/페이지 신규 생성 또는 대폭 수정 시 | 디자인 씽킹 → 대담한 미적 방향 설정 후 코드 작성 |
| **feature-dev** | 새 기능 개발 요청 시 (3개+ 파일 변경 예상) | `/feature-dev` 워크플로우로 탐색→설계→구현→리뷰 |
| **skill-creator** | 반복 작업 패턴 3회 이상 감지 시 | 커스텀 스킬 생성 제안 → 사용자 승인 후 생성 |
| **typescript-lsp** | TS 파일 수정 시 항상 | 타입 에러 자동 감지, 자동완성 지원 |
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
- 여러 스킬이 동시에 적용 가능하면 병렬로 활용한다 (예: frontend-design + typescript-lsp).
- 스킬 발동 시 어떤 스킬을 왜 사용하는지 한 줄로 알려준다.

## 프로젝트 기술 스택 요약

- **모바일**: React Native 0.73 + Expo 50 (Bare Workflow), TypeScript 5.3
- **상태관리**: Zustand 4.4
- **하드웨어**: react-native-nfc-manager, react-native-ble-plx, react-native-hce
- **백엔드**: Supabase (Auth + Realtime), PostgreSQL, Neo4j, Redis
- **웹 대시보드**: React + Vite (Vercel 배포)
- **빌드**: EAS Build (Android/iOS)

## 핵심 디렉토리 구조

```
src/              → React Native 모바일 앱 소스
  services/nfc/   → NFC 교환 로직
  services/exchange/ → BLE + Server 교환 매니저
  store/          → Zustand 스토어 (Auth, Connection, Graph, Profile)
  screens/        → 앱 화면
  components/     → 재사용 UI 컴포넌트
server/           → 백엔드 REST API (Express/Fastify)
web/              → 웹 대시보드 (Vercel)
database/         → DB 스키마/마이그레이션
docs/             → 프로젝트 문서
```
