/**
 * 채팅 메시지 타입 정의
 * Telegram 스타일의 로컬 전용 메시징 시스템
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number; // Unix ms
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface TypingEvent {
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptEvent {
  userId: string;
  lastReadMessageId: string;
}

export type ChatEvent =
  | { type: 'message'; payload: ChatMessage }
  | { type: 'typing'; payload: TypingEvent }
  | { type: 'read'; payload: ReadReceiptEvent };
