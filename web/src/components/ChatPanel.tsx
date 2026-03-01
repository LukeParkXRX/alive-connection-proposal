/**
 * ChatPanel — 텔레그램 스타일 웹 메시징
 * Supabase Realtime Broadcast 중계 + localStorage 로컬 저장
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Send, Check, CheckCheck, Clock, Trash2, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateBotResponse, BOT_USER_ID } from '../lib/chatbot';

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ChatPanelProps {
  connectionName: string;
  myUserId: string;
  targetUserId: string;
}

function getChannelName(a: string, b: string) {
  const sorted = [a, b].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
}

function loadLocal(ch: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(`messages:${ch}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocal(ch: string, msgs: ChatMessage[]) {
  localStorage.setItem(`messages:${ch}`, JSON.stringify(msgs));
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = h >= 12 ? '오후' : '오전';
  return `${period} ${h > 12 ? h - 12 : h || 12}:${m}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/** 메시지 상태 아이콘 (memo로 불필요한 리렌더 방지) */
const StatusIcon = memo(function StatusIcon({ status }: { status: ChatMessage['status'] }) {
  if (status === 'sending') return <Clock className="w-3 h-3 opacity-50" />;
  if (status === 'sent') return <Check className="w-3 h-3 opacity-50" />;
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 opacity-50" />;
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-sky-400" />;
  return null;
});

/** 타이핑 애니메이션 점 3개 (memo로 불필요한 리렌더 방지) */
const TypingDots = memo(function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce typing-dot-${i}`}
        />
      ))}
    </div>
  );
});

/** 메시지 말풍선 (memo로 messages 배열 변경 시 변경된 항목만 리렌더) */
const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  continuation,
  showTime,
  showDateHeader,
  dateLabel,
}: {
  msg: ChatMessage;
  isMe: boolean;
  continuation: boolean;
  showTime: boolean;
  showDateHeader: boolean;
  dateLabel: string;
}) {
  return (
    <div className="message-item">
      {showDateHeader && (
        <div className="text-center my-3">
          <span className="text-[11px] font-semibold text-textTertiary dark:text-gray-500 bg-backgroundAlt dark:bg-gray-800 px-3 py-1 rounded-full">
            {dateLabel}
          </span>
        </div>
      )}
      <div className={`flex ${continuation ? 'mt-0.5' : 'mt-2.5'} ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[75%] px-3.5 py-2 ${
            isMe
              ? `bg-accent text-white ${continuation ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-br-sm'}`
              : `bg-backgroundAlt dark:bg-gray-800 text-textPrimary dark:text-gray-100 ${continuation ? 'rounded-2xl rounded-bl-md' : 'rounded-2xl rounded-bl-sm'}`
          }`}
        >
          <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
            {msg.content}
          </p>
          {showTime && (
            <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMe ? 'text-white/50' : 'text-textTertiary dark:text-gray-500'}`}>
              <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
              {isMe && <StatusIcon status={msg.status} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export function ChatPanel({ connectionName, myUserId, targetUserId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTargetTyping, setIsTargetTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // localStorage 디바운스 저장용 타이머 ref
  const savePendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channelName = getChannelName(myUserId, targetUserId);
  const firstName = connectionName?.split(' ')[0] || '';
  const isBotMode = targetUserId === BOT_USER_ID || targetUserId.startsWith('conn-');

  /** localStorage 쓰기를 300ms 디바운스 — 연속 상태 변경 시 I/O 최소화 */
  const debouncedSave = useCallback((ch: string, msgs: ChatMessage[]) => {
    if (savePendingRef.current) clearTimeout(savePendingRef.current);
    savePendingRef.current = setTimeout(() => {
      saveLocal(ch, msgs);
      savePendingRef.current = null;
    }, 300);
  }, []);

  // 채널 구독 + 로컬 메시지 불러오기
  useEffect(() => {
    if (!myUserId || !targetUserId) return;
    setMessages(loadLocal(channelName));

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const next = [...prev, msg];
          debouncedSave(channelName, next);
          return next;
        });
        channel.send({
          type: 'broadcast',
          event: 'read',
          payload: { userId: myUserId, lastReadMessageId: msg.id },
        });
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === targetUserId) {
          setIsTargetTyping(payload.isTyping);
          if (payload.isTyping) setTimeout(() => setIsTargetTyping(false), 3000);
        }
      })
      .on('broadcast', { event: 'read' }, () => {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.senderId === myUserId && m.status !== 'read'
              ? { ...m, status: 'read' as const }
              : m
          );
          debouncedSave(channelName, updated);
          return updated;
        });
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      // 언마운트 시 대기 중인 저장을 즉시 플러시
      if (savePendingRef.current) {
        clearTimeout(savePendingRef.current);
        savePendingRef.current = null;
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [myUserId, targetUserId, channelName, debouncedSave]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTargetTyping]);

  // 자동 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, [targetUserId]);

  // 대화 초기화
  const handleClearChat = () => {
    localStorage.removeItem(`messages:${channelName}`);
    setMessages([]);
    setShowMenu(false);
  };

  // 메시지 전송
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    const msg: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      senderId: myUserId,
      receiverId: targetUserId,
      content: text,
      timestamp: Date.now(),
      status: isBotMode ? 'delivered' : 'sending',
    };

    setMessages((prev) => {
      const next = [...prev, msg];
      debouncedSave(channelName, next);
      return next;
    });
    setInputText('');
    inputRef.current?.focus();

    // Realtime 전송 (봇 모드가 아닐 때만)
    if (!isBotMode && channelRef.current) {
      try {
        await channelRef.current.send({
          type: 'broadcast', event: 'message', payload: msg,
        });
        msg.status = 'sent';
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === msg.id ? { ...m, status: 'sent' as const } : m));
          debouncedSave(channelName, updated);
          return updated;
        });
      } catch { /* 로컬엔 이미 저장됨 */ }
    }

    // 봇 응답
    if (isBotMode && text.length >= 2) {
      const botReply = generateBotResponse(text);

      // 타이핑 표시
      setTimeout(() => setIsTargetTyping(true), 400);

      // 응답 생성
      setTimeout(() => {
        setIsTargetTyping(false);

        // 내 메시지들 전부 read로 업데이트
        setMessages((prev) => {
          const readUpdated = prev.map((m) =>
            m.senderId === myUserId && m.status !== 'read'
              ? { ...m, status: 'read' as const }
              : m
          );

          const botMsg: ChatMessage = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            senderId: targetUserId,
            receiverId: myUserId,
            content: botReply.text,
            timestamp: Date.now(),
            status: 'read',
          };

          const next = [...readUpdated, botMsg];
          debouncedSave(channelName, next);
          return next;
        });
      }, botReply.delayMs + 400);
    }
  }, [inputText, myUserId, targetUserId, channelName, isBotMode, debouncedSave]);

  // 타이핑 전송
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    if (!isBotMode && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast', event: 'typing',
        payload: { userId: myUserId, isTyping: true },
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: 'broadcast', event: 'typing',
          payload: { userId: myUserId, isTyping: false },
        });
      }, 2000);
    }
  }, [myUserId, isBotMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중이면 무시 (글자 쪼개짐 방지)
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /** 각 메시지의 표시 메타데이터를 미리 계산 — messages 변경 시에만 재계산 */
  const messageMetadata = useMemo(() =>
    messages.map((msg, idx) => {
      const prev = idx > 0 ? messages[idx - 1] : null;
      const continuation = prev
        ? prev.senderId === msg.senderId && msg.timestamp - prev.timestamp < 120000
        : false;
      const showDateHeader = idx === 0 || new Date(msg.timestamp).toDateString() !== new Date(prev!.timestamp).toDateString();
      const showTime = !continuation || idx === messages.length - 1 || messages[idx + 1]?.senderId !== msg.senderId;
      return {
        continuation,
        showDateHeader,
        showTime,
        dateLabel: showDateHeader ? formatDate(msg.timestamp) : '',
      };
    }),
    [messages]
  );

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-border/40 dark:border-gray-800 overflow-hidden min-h-0">
      {/* 헤더 */}
      <div className="px-5 py-3.5 border-b border-border/10 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isTargetTyping ? 'bg-accent animate-pulse' : 'bg-green-500'}`} />
          <div>
            <span className="font-bold text-sm text-textPrimary dark:text-gray-100">
              {connectionName || 'Chat'}
            </span>
            <p className="text-[11px] text-textTertiary dark:text-gray-500">
              {isTargetTyping ? <span className="text-accent font-medium">입력 중...</span> : '로컬 채팅 · 서버 저장 안 됨'}
            </p>
          </div>
        </div>

        {/* 메뉴 */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-xl hover:bg-backgroundAlt dark:hover:bg-gray-800 transition-colors text-textSecondary dark:text-gray-400"
            aria-label="채팅 메뉴"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border/30 dark:border-gray-700 py-1 min-w-[160px]">
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  대화 초기화
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 bg-backgroundAlt dark:bg-gray-800 rounded-2xl flex items-center justify-center opacity-40">
              <Send className="w-7 h-7 text-textTertiary dark:text-gray-500" />
            </div>
            <div>
              <p className="font-bold text-textPrimary dark:text-gray-100 mb-1">
                {firstName}님과 대화 시작
              </p>
              <p className="text-xs text-textTertiary dark:text-gray-500">
                메시지는 이 브라우저에만 저장됩니다
              </p>
              {isBotMode && (
                <p className="text-xs text-accent mt-2 font-medium">
                  테스트 봇이 자동 응답합니다 (2글자 이상)
                </p>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const { continuation, showDateHeader, showTime, dateLabel } = messageMetadata[idx];
            const isMe = msg.senderId === myUserId;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isMe={isMe}
                continuation={continuation}
                showTime={showTime}
                showDateHeader={showDateHeader}
                dateLabel={dateLabel}
              />
            );
          })
        )}

        {/* 타이핑 인디케이터 */}
        {isTargetTyping && (
          <div className="flex justify-start mt-1">
            <div className="bg-backgroundAlt dark:bg-gray-800 rounded-2xl rounded-bl-sm">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t border-border/10 dark:border-gray-800">
        <div className="flex items-end gap-2 bg-backgroundAlt dark:bg-gray-800 rounded-[1.5rem] p-1.5 pl-4 ring-1 ring-border/20 dark:ring-gray-700 focus-within:ring-accent transition-all">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            rows={1}
            className="flex-1 bg-transparent border-none py-2.5 text-[15px] text-textPrimary dark:text-gray-200 placeholder:text-textTertiary dark:placeholder:text-gray-500 focus:ring-0 outline-none resize-none max-h-28"
            aria-label="메시지 입력"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-10 h-10 rounded-[1.1rem] flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
              inputText.trim()
                ? 'bg-accent text-white shadow-lg shadow-accent/20 hover:scale-105'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
            aria-label="메시지 전송"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
