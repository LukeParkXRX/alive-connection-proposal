/**
 * ALIVE Engine Ontology Types
 *
 * ALIVE Engine 지식 그래프와의 통합을 위한 TypeScript 타입 정의
 * NFC 네트워킹 유즈케이스에 맞춰 조정된 온톨로지 하위 집합
 */

// ============================================================================
// 1. 노드 타입 정의
// ============================================================================

/**
 * 온톨로지 노드 타입
 *
 * ALIVE Engine의 21가지 표준 노드 타입 + 커스텀 타입
 * - Identity (정체성): birth_info, nationality
 * - Personality (성격): trait, value, belief
 * - Knowledge (지식): skill, education, interest, concept
 * - Relationships (관계): person, organization
 * - Experiences (경험): life_event, memory, event, experience
 * - Preferences (선호): preference, habit
 * - Goals (목표): goal, aspiration
 * - Context (맥락): location, status
 */
export type OntologyNodeType =
  // Identity (정체성)
  | 'birth_info'
  | 'nationality'
  // Personality (성격)
  | 'trait'
  | 'value'
  | 'belief'
  // Knowledge (지식)
  | 'skill'
  | 'education'
  | 'interest'
  | 'concept'
  // Relationships (관계)
  | 'person'
  | 'organization'
  // Experiences (경험)
  | 'life_event'
  | 'memory'
  | 'event'
  | 'experience'
  // Preferences (선호)
  | 'preference'
  | 'habit'
  // Goals (목표)
  | 'goal'
  | 'aspiration'
  // Context (맥락)
  | 'location'
  | 'status'
  // Custom (커스텀)
  | 'custom';

/**
 * 시간성 타입
 *
 * - static: 거의 변하지 않는 정보 (예: 출생지, 국적)
 * - slow: 천천히 변하는 정보 (예: 직업, 가치관)
 * - dynamic: 빠르게 변하는 정보 (예: 위치, 기분)
 */
export type Temporality = 'static' | 'slow' | 'dynamic';

// ============================================================================
// 2. 그래프 구조 타입
// ============================================================================

/**
 * 온톨로지 노드
 *
 * 지식 그래프의 개별 노드를 나타냄
 */
export interface OntologyNode {
  /** 노드 고유 ID */
  id: string;

  /** 노드 레이블 (1-4 단어) */
  label: string;

  /** 노드 타입 */
  type: OntologyNodeType;

  /** 노드 내용 (선택적) */
  content?: string;

  /** 메타데이터 */
  metadata?: {
    /** 도메인 (domain cluster) */
    domain?: string;

    /** 시간성 */
    temporality?: Temporality;

    /** 추가 속성 */
    properties?: Record<string, unknown>;

    /** 기존 매칭 노드 ID (중복 방지용) */
    existingMatch?: string;
  };

  /** 생성 일시 (ISO 8601) */
  createdAt: string;

  /** 수정 일시 (ISO 8601) */
  updatedAt: string;
}

/**
 * 온톨로지 엣지 (관계)
 *
 * 노드 간 관계를 나타냄
 */
export interface OntologyEdge {
  /** 엣지 고유 ID */
  id: string;

  /** 출발 노드 ID (보통 "me") */
  source: string;

  /** 도착 노드 ID */
  target: string;

  /** 관계 타입 (37가지 중 하나) */
  relation: string;

  /** 관계 가중치 (0-1, 선택적) */
  weight?: number;

  /** 생성 일시 (ISO 8601) */
  createdAt: string;
}

/**
 * 온톨로지 그래프
 *
 * 전체 지식 그래프 구조
 */
export interface OntologyGraph {
  /** 노드 목록 */
  nodes: OntologyNode[];

  /** 엣지 목록 */
  edges: OntologyEdge[];
}

/**
 * 그래프 통계 정보
 */
export interface GraphStats {
  /** 전체 노드 수 */
  totalNodes: number;

  /** 전체 엣지 수 */
  totalEdges: number;

  /** 타입별 노드 분포 */
  typeDistribution: Record<OntologyNodeType, number>;
}

// ============================================================================
// 3. LLM 추출 결과 타입
// ============================================================================

/**
 * LLM이 추출한 엔티티
 *
 * 텍스트에서 추출된 구조화된 정보
 */
export interface ExtractedEntity {
  /** 엔티티 레이블 */
  label: string;

  /** 엔티티 타입 */
  type: OntologyNodeType;

  /** 도메인 (domain cluster) */
  domain: string;

  /** 시간성 */
  temporality: Temporality;

  /** 추가 속성 */
  properties: Record<string, unknown>;

  /** 신뢰도 (0-1) */
  confidence: number;

  /** 기존 매칭 노드 ID (선택적) */
  existingMatch?: string;
}

/**
 * LLM이 추출한 관계
 *
 * 엔티티 간 관계 정보
 */
export interface ExtractedRelation {
  /** 출발 노드 레이블 */
  source: string;

  /** 도착 노드 레이블 */
  target: string;

  /** 관계 타입 */
  type: string;

  /** 신뢰도 (0-1) */
  confidence: number;
}

// ============================================================================
// 4. API 응답 타입
// ============================================================================

/**
 * API 그래프 노드 응답
 *
 * ALIVE Engine API에서 반환하는 노드 형식
 */
export interface ApiGraphNode {
  /** 노드 ID */
  id: string;

  /** 노드 레이블 */
  label: string;

  /** 노드 타입 */
  type: string;

  /** 노드 내용 */
  content: string;

  /** 추가 데이터 (선택적) */
  data?: Record<string, unknown>;

  /** Being ID (선택적) */
  being_id?: string;

  /** 생성 일시 (선택적) */
  created_at?: string;
}

/**
 * API 그래프 엣지 응답
 *
 * ALIVE Engine API에서 반환하는 엣지 형식
 */
export interface ApiGraphEdge {
  /** 출발 노드 ID */
  from: string;

  /** 도착 노드 ID */
  to: string;

  /** 관계 타입 */
  type: string;

  /** 관계 레이블 (선택적) */
  label?: string;
}

/**
 * API 그래프 응답
 *
 * GET /graph 엔드포인트 응답
 */
export interface ApiGraphResponse {
  /** 노드 목록 */
  nodes: ApiGraphNode[];

  /** 엣지 목록 */
  edges: ApiGraphEdge[];
}

/**
 * API 노드 생성/수정 응답
 *
 * POST /nodes, PUT /nodes/:id 엔드포인트 응답
 */
export interface ApiNodeResponse {
  /** 노드 ID */
  id: string;

  /** 노드 레이블 */
  label: string;

  /** 노드 타입 */
  type: string;

  /** 노드 내용 */
  content: string;

  /** Being ID */
  being_id: string;

  /** 생성 일시 */
  created_at: string;
}

/**
 * API 통계 응답
 *
 * GET /stats 엔드포인트 응답
 */
export interface ApiStatsResponse {
  /** 전체 노드 수 */
  total_nodes: number;

  /** 전체 엣지 수 */
  total_edges: number;

  /** 노드 타입 목록 */
  node_types: string[];
}

// ============================================================================
// 5. 도메인 클러스터 타입
// ============================================================================

/**
 * 도메인 ID
 *
 * 8가지 주요 도메인 클러스터
 */
export type DomainId =
  | 'identity'        // 정체성
  | 'personality'     // 성격
  | 'knowledge'       // 지식
  | 'relationships'   // 관계
  | 'experiences'     // 경험
  | 'preferences'     // 선호
  | 'goals'           // 목표
  | 'context';        // 맥락

/**
 * 도메인 클러스터
 *
 * 노드를 그룹화하는 상위 개념
 */
export interface DomainCluster {
  /** 도메인 ID */
  id: DomainId;

  /** 이모지 아이콘 */
  emoji: string;

  /** 색상 코드 */
  color: string;

  /** 한국어 레이블 */
  labelKo: string;
}
