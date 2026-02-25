/**
 * ALIVE Engine 통합 상수 정의
 *
 * 이 파일은 ALIVE Engine의 도메인 클러스터, 노드 타입, 관계 타입 등의
 * 핵심 상수와 매핑 정보를 정의합니다.
 */

import type { OntologyNodeType, DomainId, DomainCluster } from './types';

// ============================================================================
// 1. DOMAIN_CLUSTERS - 8개 도메인 클러스터
// ============================================================================

export const DOMAIN_CLUSTERS: DomainCluster[] = [
  { id: 'identity', emoji: '🪪', color: '#3b82f6', labelKo: '정체성' },
  { id: 'personality', emoji: '🧠', color: '#8b5cf6', labelKo: '성격' },
  { id: 'knowledge', emoji: '📚', color: '#06b6d4', labelKo: '지식' },
  { id: 'relationships', emoji: '🤝', color: '#10b981', labelKo: '관계' },
  { id: 'experiences', emoji: '📖', color: '#f59e0b', labelKo: '경험' },
  { id: 'preferences', emoji: '💖', color: '#ec4899', labelKo: '선호' },
  { id: 'goals', emoji: '🎯', color: '#f97316', labelKo: '목표' },
  { id: 'context', emoji: '📍', color: '#2dd4bf', labelKo: '현재 상황' },
];

// ============================================================================
// 2. TYPE_TO_DOMAIN - 21개 노드 타입 → 도메인 매핑
// ============================================================================

export const TYPE_TO_DOMAIN: Record<OntologyNodeType, DomainId> = {
  // Identity (정체성)
  birth_info: 'identity',
  nationality: 'identity',

  // Personality (성격)
  trait: 'personality',
  value: 'personality',
  belief: 'personality',

  // Knowledge (지식)
  skill: 'knowledge',
  education: 'knowledge',
  interest: 'knowledge',
  concept: 'knowledge',

  // Relationships (관계)
  person: 'relationships',
  organization: 'relationships',

  // Experiences (경험)
  life_event: 'experiences',
  memory: 'experiences',
  event: 'experiences',
  experience: 'experiences',

  // Preferences (선호)
  preference: 'preferences',
  habit: 'preferences',

  // Goals (목표)
  goal: 'goals',
  aspiration: 'goals',

  // Context (현재 상황)
  location: 'context',
  status: 'context',

  // Custom (사용자 정의)
  custom: 'identity', // 기본적으로 identity로 매핑
};

// ============================================================================
// 3. NODE_TYPE_CONFIG - 노드 타입별 이모지/색상/한국어 라벨
// ============================================================================

export const NODE_TYPE_CONFIG: Record<OntologyNodeType, { emoji: string; color: string; labelKo: string }> = {
  // Identity (정체성) - Blue tones
  birth_info: { emoji: '🎂', color: '#3b82f6', labelKo: '출생 정보' },
  nationality: { emoji: '🌍', color: '#3b82f6', labelKo: '국적' },

  // Personality (성격) - Purple tones
  trait: { emoji: '✨', color: '#8b5cf6', labelKo: '특성' },
  value: { emoji: '💎', color: '#8b5cf6', labelKo: '가치관' },
  belief: { emoji: '🙏', color: '#8b5cf6', labelKo: '신념' },

  // Knowledge (지식) - Cyan tones
  skill: { emoji: '🛠️', color: '#06b6d4', labelKo: '기술' },
  education: { emoji: '🎓', color: '#06b6d4', labelKo: '학력' },
  interest: { emoji: '🌟', color: '#06b6d4', labelKo: '관심사' },
  concept: { emoji: '💡', color: '#06b6d4', labelKo: '개념' },

  // Relationships (관계) - Green tones
  person: { emoji: '👤', color: '#10b981', labelKo: '사람' },
  organization: { emoji: '🏢', color: '#10b981', labelKo: '조직' },

  // Experiences (경험) - Amber tones
  life_event: { emoji: '🎉', color: '#f59e0b', labelKo: '인생 이벤트' },
  memory: { emoji: '💭', color: '#f59e0b', labelKo: '기억' },
  event: { emoji: '📅', color: '#f59e0b', labelKo: '이벤트' },
  experience: { emoji: '🎬', color: '#f59e0b', labelKo: '경험' },

  // Preferences (선호) - Pink tones
  preference: { emoji: '❤️', color: '#ec4899', labelKo: '선호' },
  habit: { emoji: '🔄', color: '#ec4899', labelKo: '습관' },

  // Goals (목표) - Orange tones
  goal: { emoji: '🎯', color: '#f97316', labelKo: '목표' },
  aspiration: { emoji: '🌠', color: '#f97316', labelKo: '열망' },

  // Context (현재 상황) - Teal tones
  location: { emoji: '📍', color: '#2dd4bf', labelKo: '위치' },
  status: { emoji: '📊', color: '#2dd4bf', labelKo: '상태' },

  // Custom (사용자 정의)
  custom: { emoji: '🔷', color: '#6b7280', labelKo: '사용자 정의' },
};

// ============================================================================
// 4. RELATION_TYPES - BLE 네트워킹에 필요한 관계 타입
// ============================================================================

export const RELATION_TYPES = {
  // 사람 간 관계
  KNOWS: { label: 'knows', labelKo: '알고 있음' },
  COLLEAGUE_OF: { label: 'colleague of', labelKo: '동료' },
  FRIEND_OF: { label: 'friend of', labelKo: '친구' },
  MENTORED_BY: { label: 'mentored by', labelKo: '멘토' },

  // 조직 관계
  WORKS_AT: { label: 'works at', labelKo: '근무처' },
  MEMBER_OF: { label: 'member of', labelKo: '소속' },

  // 기술/관심사
  SKILLED_IN: { label: 'skilled in', labelKo: '기술 보유' },
  INTERESTED_IN: { label: 'interested in', labelKo: '관심사' },
  EXPERT_AT: { label: 'expert at', labelKo: '전문가' },
  LEARNING: { label: 'learning', labelKo: '학습 중' },

  // 위치/이벤트
  LIVES_IN: { label: 'lives in', labelKo: '거주지' },
  VISITED: { label: 'visited', labelKo: '방문한 곳' },
  ATTENDS: { label: 'attends', labelKo: '참석' },

  // 범용
  RELATED_TO: { label: 'related to', labelKo: '관련' },
  ASSOCIATED_WITH: { label: 'associated with', labelKo: '연관' },
  PART_OF: { label: 'part of', labelKo: '일부' },
} as const;

export type RelationType = keyof typeof RELATION_TYPES;

// ============================================================================
// 5. RELATION_ALIASES - 한국어 자연어 → 표준 관계 타입 변환 맵
// ============================================================================

export const RELATION_ALIASES: Record<string, RelationType> = {
  // 사람 간 관계
  '알고': 'KNOWS',
  '알고있': 'KNOWS',
  '아는': 'KNOWS',
  '동료': 'COLLEAGUE_OF',
  '친구': 'FRIEND_OF',
  '멘토': 'MENTORED_BY',
  '스승': 'MENTORED_BY',

  // 조직 관계
  '근무': 'WORKS_AT',
  '일하': 'WORKS_AT',
  '재직': 'WORKS_AT',
  '소속': 'MEMBER_OF',
  '속한': 'MEMBER_OF',
  '회원': 'MEMBER_OF',

  // 기술/관심사
  '기술': 'SKILLED_IN',
  '잘하': 'SKILLED_IN',
  '관심': 'INTERESTED_IN',
  '좋아하': 'INTERESTED_IN',
  '전문': 'EXPERT_AT',
  '전문가': 'EXPERT_AT',
  '학습': 'LEARNING',
  '배우': 'LEARNING',
  '공부': 'LEARNING',

  // 위치/이벤트
  '거주': 'LIVES_IN',
  '살고': 'LIVES_IN',
  '사는': 'LIVES_IN',
  '방문': 'VISITED',
  '갔던': 'VISITED',
  '참석': 'ATTENDS',
  '참여': 'ATTENDS',
  '출석': 'ATTENDS',

  // 범용
  '관련': 'RELATED_TO',
  '연관': 'ASSOCIATED_WITH',
  '부분': 'PART_OF',
  '일부': 'PART_OF',
};

// ============================================================================
// 6. Helper Functions
// ============================================================================

/**
 * 노드 타입에서 도메인 ID를 조회합니다.
 * @param type - 노드 타입
 * @returns 도메인 ID
 */
export function getDomainForType(type: OntologyNodeType): DomainId {
  return TYPE_TO_DOMAIN[type];
}

/**
 * 도메인 ID에서 도메인 클러스터 정보를 조회합니다.
 * @param domainId - 도메인 ID
 * @returns 도메인 클러스터 정보
 */
export function getDomainCluster(domainId: DomainId): DomainCluster | undefined {
  return DOMAIN_CLUSTERS.find(cluster => cluster.id === domainId);
}

/**
 * 노드 타입에서 설정 정보(이모지, 색상, 라벨)를 조회합니다.
 * @param type - 노드 타입
 * @returns 노드 타입 설정 정보
 */
export function getNodeTypeConfig(type: OntologyNodeType) {
  return NODE_TYPE_CONFIG[type];
}

/**
 * 한국어 텍스트를 표준 관계 타입으로 변환합니다.
 * @param text - 한국어 관계 텍스트
 * @returns 표준 관계 타입 (매핑되지 않으면 'RELATED_TO' 반환)
 */
export function normalizeRelation(text: string): RelationType {
  const normalized = text.toLowerCase().trim();

  // 직접 매칭 시도
  for (const [alias, relationType] of Object.entries(RELATION_ALIASES)) {
    if (normalized.includes(alias)) {
      return relationType;
    }
  }

  // 매칭되지 않으면 기본값 반환
  return 'RELATED_TO';
}

/**
 * 모든 도메인 클러스터를 Map으로 반환합니다.
 * @returns 도메인 ID를 키로 하는 Map
 */
export function getDomainClustersMap(): Map<DomainId, DomainCluster> {
  return new Map(DOMAIN_CLUSTERS.map(cluster => [cluster.id, cluster]));
}

/**
 * 관계 타입의 한국어 라벨을 조회합니다.
 * @param relationType - 관계 타입
 * @returns 한국어 라벨
 */
export function getRelationLabel(relationType: RelationType): string {
  return RELATION_TYPES[relationType]?.labelKo || relationType;
}

/**
 * 노드 타입의 도메인 클러스터 정보를 조회합니다.
 * @param type - 노드 타입
 * @returns 도메인 클러스터 정보
 */
export function getDomainClusterForType(type: OntologyNodeType): DomainCluster | undefined {
  const domainId = getDomainForType(type);
  return getDomainCluster(domainId);
}
