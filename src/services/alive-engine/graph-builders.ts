/**
 * Graph Builders — 순수 함수로 핸드셰이크 노드/엣지 데이터 구성
 *
 * useGraphStore에서 추출됨. API 호출 없이 데이터만 생성.
 */

import type { UserProfile, Interaction } from '@/types';

// ============================================================================
// 타입
// ============================================================================

export interface NodeBuildData {
  label: string;
  type: string;
  content: string;
}

export interface EdgeBuildData {
  source: string;
  target: string;
  relation: string;
}

export interface HandshakeGraphData {
  nodes: NodeBuildData[];
  edges: EdgeBuildData[];
}

// ============================================================================
// Builder
// ============================================================================

/**
 * BLE 핸드셰이크 후 생성할 노드/엣지 데이터를 조립한다.
 *
 * 생성 노드: person, organization(있을 때), location(있을 때), event(있을 때)
 * 생성 엣지: me→KNOWS→person, person→WORKS_AT→org, me→VISITED→location, me→ATTENDS→event
 */
export function buildHandshakeGraph(
  profile: UserProfile,
  interaction: Interaction,
): HandshakeGraphData {
  const nodes: NodeBuildData[] = [];
  const edges: EdgeBuildData[] = [];

  // 1. [person] 노드
  const personLabel = profile.name;
  const personContent = profile.title && profile.company
    ? `${profile.title} at ${profile.company}`
    : profile.title || profile.company || '';

  nodes.push({ label: personLabel, type: 'person', content: personContent });

  // 2. [organization] 노드 (회사 정보가 있을 경우)
  if (profile.company) {
    nodes.push({
      label: profile.company,
      type: 'organization',
      content: `조직: ${profile.company}`,
    });
    edges.push({ source: personLabel, target: profile.company, relation: 'WORKS_AT' });
  }

  // 3. [location] 노드 (장소명이 있을 경우)
  if (interaction.location.placeName) {
    nodes.push({
      label: interaction.location.placeName,
      type: 'location',
      content: `장소: ${interaction.location.placeName}`,
    });
    edges.push({ source: 'me', target: interaction.location.placeName, relation: 'VISITED' });
  }

  // 4. [event] 노드 (이벤트 컨텍스트가 있을 경우)
  if (interaction.eventContext) {
    nodes.push({
      label: interaction.eventContext,
      type: 'event',
      content: `이벤트: ${interaction.eventContext}`,
    });
    edges.push({ source: 'me', target: interaction.eventContext, relation: 'ATTENDS' });
  }

  // 5. me → KNOWS → person
  edges.push({ source: 'me', target: personLabel, relation: 'KNOWS' });

  return { nodes, edges };
}
