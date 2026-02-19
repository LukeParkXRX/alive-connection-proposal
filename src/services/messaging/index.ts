/**
 * 메시징 서비스 — 텔레그램 스타일 로컬 전용 메시징
 */

export type { ChatMessage, TypingEvent, ReadReceiptEvent, ChatEvent } from './types';

export {
  getChannelName,
  generateMessageId,
  subscribeToChat,
  sendMessage,
  sendTyping,
  sendReadReceipt,
} from './realtime';

export {
  loadMessages,
  saveMessage,
  updateMessageStatus,
  markAllAsRead,
  getAllConversations,
} from './storage';
