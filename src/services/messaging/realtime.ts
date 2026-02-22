/**
 * 실시간 메시지 중계 (Supabase Realtime Broadcast)
 * 서버에 저장하지 않고 WebSocket으로만 전달
 */

import { supabase } from '@/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, TypingEvent, ReadReceiptEvent } from './types';

/** 채널명 생성 — 두 유저 ID를 정렬하여 고유 채널 보장 */
export function getChannelName(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
}

/** 고유 메시지 ID 생성 */
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

interface ChatCallbacks {
  onMessage: (message: ChatMessage) => void;
  onTyping: (event: TypingEvent) => void;
  onReadReceipt: (event: ReadReceiptEvent) => void;
}

/**
 * 공유 채널 맵 — sendMessage/sendTyping/sendReadReceipt가
 * subscribeToChat이 만든 채널을 재사용하도록 보장
 * (각 호출마다 새 채널 레퍼런스를 생성하는 버그 방지)
 */
const _activeChannels = new Map<string, RealtimeChannel>();

/** 채팅 채널 구독 — 메시지, 타이핑, 읽음확인 수신 */
export function subscribeToChat(
  myUserId: string,
  targetUserId: string,
  callbacks: ChatCallbacks
): () => void {
  const channelName = getChannelName(myUserId, targetUserId);

  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  // 공유 채널 맵에 등록 — 전송 함수가 이 채널을 재사용
  _activeChannels.set(channelName, channel);

  channel
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      callbacks.onMessage(payload as ChatMessage);
      // 수신 시 자동으로 delivered 알림 전송
      channel.send({
        type: 'broadcast',
        event: 'read',
        payload: { userId: myUserId, lastReadMessageId: payload.id } as ReadReceiptEvent,
      });
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      callbacks.onTyping(payload as TypingEvent);
    })
    .on('broadcast', { event: 'read' }, ({ payload }) => {
      callbacks.onReadReceipt(payload as ReadReceiptEvent);
    })
    .subscribe();

  return () => {
    // 구독 해제 시 맵에서도 제거
    _activeChannels.delete(channelName);
    supabase.removeChannel(channel);
  };
}

/**
 * 채널명으로 활성 채널 조회
 * subscribeToChat이 등록한 채널을 반환하며, 없으면 새로 참조 (폴백)
 */
function getChannel(channelName: string): RealtimeChannel {
  const existing = _activeChannels.get(channelName);
  if (existing) return existing;
  // 폴백: 구독 없이 직접 전송 시 (주의: 연결이 보장되지 않을 수 있음)
  return supabase.channel(channelName);
}

/** 메시지 전송 */
export async function sendMessage(channelName: string, message: ChatMessage): Promise<void> {
  await getChannel(channelName).send({
    type: 'broadcast',
    event: 'message',
    payload: message,
  });
}

/** 타이핑 상태 전송 */
export async function sendTyping(
  channelName: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  await getChannel(channelName).send({
    type: 'broadcast',
    event: 'typing',
    payload: { userId, isTyping } as TypingEvent,
  });
}

/** 읽음 확인 전송 */
export async function sendReadReceipt(
  channelName: string,
  userId: string,
  lastReadMessageId: string
): Promise<void> {
  await getChannel(channelName).send({
    type: 'broadcast',
    event: 'read',
    payload: { userId, lastReadMessageId } as ReadReceiptEvent,
  });
}
