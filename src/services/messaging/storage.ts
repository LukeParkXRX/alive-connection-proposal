/**
 * 로컬 메시지 저장소 (AsyncStorage)
 * 서버에 저장하지 않고 디바이스에만 보관
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './types';

const PREFIX = 'messages:';

function getStorageKey(channelName: string): string {
  return `${PREFIX}${channelName}`;
}

/** 특정 채널의 메시지 목록 불러오기 */
export async function loadMessages(channelName: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(getStorageKey(channelName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 메시지 하나 저장 (기존 목록에 추가) */
export async function saveMessage(channelName: string, message: ChatMessage): Promise<void> {
  const messages = await loadMessages(channelName);
  // 중복 방지
  if (messages.some((m) => m.id === message.id)) return;
  messages.push(message);
  await AsyncStorage.setItem(getStorageKey(channelName), JSON.stringify(messages));
}

/** 메시지 상태 업데이트 (sent → delivered → read) */
export async function updateMessageStatus(
  channelName: string,
  messageId: string,
  status: ChatMessage['status']
): Promise<void> {
  const messages = await loadMessages(channelName);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return;
  messages[idx].status = status;
  await AsyncStorage.setItem(getStorageKey(channelName), JSON.stringify(messages));
}

/** 특정 발신자의 모든 메시지를 read로 업데이트 */
export async function markAllAsRead(
  channelName: string,
  senderId: string
): Promise<void> {
  const messages = await loadMessages(channelName);
  let changed = false;
  for (const msg of messages) {
    if (msg.senderId === senderId && msg.status !== 'read') {
      msg.status = 'read';
      changed = true;
    }
  }
  if (changed) {
    await AsyncStorage.setItem(getStorageKey(channelName), JSON.stringify(messages));
  }
}

/** 모든 대화 목록 조회 (마지막 메시지 포함) */
export async function getAllConversations(): Promise<
  { channelName: string; lastMessage: ChatMessage | null; unreadCount: number }[]
> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const chatKeys = allKeys.filter((k) => k.startsWith(PREFIX));
    const results = [];

    for (const key of chatKeys) {
      const channelName = key.replace(PREFIX, '');
      const messages = await loadMessages(channelName);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const unreadCount = messages.filter(
        (m) => m.status !== 'read' && m.status !== 'sending'
      ).length;
      results.push({ channelName, lastMessage, unreadCount });
    }

    return results;
  } catch {
    return [];
  }
}
