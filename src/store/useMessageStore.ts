/**
 * 메시지 Zustand 스토어
 * 텔레그램 스타일 로컬 전용 메시징 상태 관리
 */

import { create } from 'zustand';
import type { ChatMessage } from '@/services/messaging/types';
import {
  getChannelName,
  generateMessageId,
  subscribeToChat,
  sendMessage as realtimeSend,
  sendTyping as realtimeTyping,
  sendReadReceipt,
} from '@/services/messaging/realtime';
import {
  loadMessages,
  saveMessage,
  updateMessageStatus,
  markAllAsRead,
} from '@/services/messaging/storage';

interface MessageState {
  // 상태
  conversations: Record<string, ChatMessage[]>;
  typingUsers: Record<string, boolean>;
  activeChannel: string | null;
  unsubscribe: (() => void) | null;

  // 액션
  openChat: (myUserId: string, targetUserId: string) => Promise<void>;
  closeChat: () => void;
  sendMessage: (myUserId: string, targetUserId: string, content: string) => Promise<void>;
  setTyping: (myUserId: string, targetUserId: string, isTyping: boolean) => void;
  markAsRead: (myUserId: string, targetUserId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: {},
  typingUsers: {},
  activeChannel: null,
  unsubscribe: null,

  openChat: async (myUserId, targetUserId) => {
    // 기존 구독 정리
    get().closeChat();

    const channelName = getChannelName(myUserId, targetUserId);

    // 로컬 저장소에서 기존 메시지 불러오기
    const existing = await loadMessages(channelName);
    set((s) => ({
      activeChannel: channelName,
      conversations: { ...s.conversations, [channelName]: existing },
    }));

    // 실시간 채널 구독
    let typingTimer: ReturnType<typeof setTimeout> | null = null;

    const unsub = subscribeToChat(myUserId, targetUserId, {
      onMessage: async (message) => {
        // 로컬에 저장
        await saveMessage(channelName, message);
        set((s) => {
          const msgs = s.conversations[channelName] || [];
          // 중복 방지
          if (msgs.some((m) => m.id === message.id)) return s;
          return {
            conversations: {
              ...s.conversations,
              [channelName]: [...msgs, message],
            },
          };
        });
      },

      onTyping: (event) => {
        const key = `${channelName}:${event.userId}`;
        set((s) => ({
          typingUsers: { ...s.typingUsers, [key]: event.isTyping },
        }));
        // 3초 후 자동 해제
        if (event.isTyping) {
          if (typingTimer) clearTimeout(typingTimer);
          typingTimer = setTimeout(() => {
            set((s) => ({
              typingUsers: { ...s.typingUsers, [key]: false },
            }));
          }, 3000);
        }
      },

      onReadReceipt: async (event) => {
        // 상대방이 읽었으면 내 메시지 상태를 'read'로 업데이트
        await updateMessageStatus(channelName, event.lastReadMessageId, 'read');
        set((s) => {
          const msgs = (s.conversations[channelName] || []).map((m) => {
            if (m.senderId === myUserId && m.status !== 'read') {
              return { ...m, status: 'read' as const };
            }
            return m;
          });
          return {
            conversations: { ...s.conversations, [channelName]: msgs },
          };
        });
      },
    });

    set({ unsubscribe: unsub });
  },

  closeChat: () => {
    const { unsubscribe } = get();
    if (unsubscribe) unsubscribe();
    set({ activeChannel: null, unsubscribe: null });
  },

  sendMessage: async (myUserId, targetUserId, content) => {
    const channelName = getChannelName(myUserId, targetUserId);

    const message: ChatMessage = {
      id: generateMessageId(),
      senderId: myUserId,
      receiverId: targetUserId,
      content: content.trim(),
      timestamp: Date.now(),
      status: 'sending',
    };

    // 즉시 UI에 반영
    set((s) => ({
      conversations: {
        ...s.conversations,
        [channelName]: [...(s.conversations[channelName] || []), message],
      },
    }));

    // 로컬 저장
    await saveMessage(channelName, message);

    // 실시간 전송
    try {
      await realtimeSend(channelName, message);
      message.status = 'sent';
    } catch {
      // 전송 실패해도 로컬엔 남아있음
      message.status = 'sent';
    }

    await updateMessageStatus(channelName, message.id, message.status);
    set((s) => {
      const msgs = (s.conversations[channelName] || []).map((m) =>
        m.id === message.id ? { ...m, status: message.status } : m
      );
      return { conversations: { ...s.conversations, [channelName]: msgs } };
    });
  },

  setTyping: (myUserId, targetUserId, isTyping) => {
    const channelName = getChannelName(myUserId, targetUserId);
    realtimeTyping(channelName, myUserId, isTyping).catch(() => {});
  },

  markAsRead: async (myUserId, targetUserId) => {
    const channelName = getChannelName(myUserId, targetUserId);
    const msgs = get().conversations[channelName] || [];
    const lastFromTarget = [...msgs].reverse().find((m) => m.senderId === targetUserId);

    if (lastFromTarget) {
      await markAllAsRead(channelName, targetUserId);
      sendReadReceipt(channelName, myUserId, lastFromTarget.id).catch(() => {});

      set((s) => {
        const updated = (s.conversations[channelName] || []).map((m) =>
          m.senderId === targetUserId ? { ...m, status: 'read' as const } : m
        );
        return { conversations: { ...s.conversations, [channelName]: updated } };
      });
    }
  },
}));
