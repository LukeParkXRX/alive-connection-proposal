/**
 * ChatScreen — 텔레그램 스타일 로컬 메시징
 * Supabase Realtime Broadcast로 중계, AsyncStorage에만 저장
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

import { useAuthStore } from '@/store/useAuthStore';
import { useMessageStore } from '@/store/useMessageStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getChannelName } from '@/services/messaging/realtime';
import type { ChatMessage } from '@/services/messaging/types';

export const ChatScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { userId: targetUserId, userName } = route.params;
  const { user: currentUser } = useAuthStore();
  const myUserId = currentUser?.id || '';

  const {
    conversations,
    typingUsers,
    openChat,
    closeChat,
    sendMessage,
    setTyping,
    markAsRead,
  } = useMessageStore();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { wp, fp, isTablet } = useResponsive();
  const { colors: c } = useThemeColors();

  const channelName = getChannelName(myUserId, targetUserId);
  const messages = conversations[channelName] || [];
  const isTargetTyping = typingUsers[`${channelName}:${targetUserId}`] || false;

  // 채팅 채널 구독
  useEffect(() => {
    if (myUserId && targetUserId) {
      openChat(myUserId, targetUserId);
    }
    return () => closeChat();
  }, [myUserId, targetUserId]);

  // 새 메시지 도착 시 읽음 처리
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead(myUserId, targetUserId);
    }
  }, [messages.length]);

  // 메시지 전송
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setTyping(myUserId, targetUserId, false);
    await sendMessage(myUserId, targetUserId, text);
  }, [inputText, myUserId, targetUserId]);

  // 타이핑 인디케이터
  const handleTextChange = useCallback((text: string) => {
    setInputText(text);
    setTyping(myUserId, targetUserId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(myUserId, targetUserId, false);
    }, 2000);
  }, [myUserId, targetUserId]);

  // 시간 포맷 (오후 3:45)
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const period = h >= 12 ? '오후' : '오전';
    return `${period} ${h > 12 ? h - 12 : h || 12}:${m}`;
  };

  // 읽음 표시 아이콘
  const StatusIcon = ({ status }: { status: ChatMessage['status'] }) => {
    if (status === 'sending') return <Ionicons name="time-outline" size={14} color={c.textTertiary} />;
    if (status === 'sent') return <Ionicons name="checkmark" size={14} color={c.textTertiary} />;
    if (status === 'delivered') return <Ionicons name="checkmark-done" size={14} color={c.textTertiary} />;
    if (status === 'read') return <Ionicons name="checkmark-done" size={14} color="#4FC3F7" />;
    return null;
  };

  // 메시지 말풍선
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === myUserId;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showDateHeader = !prevMsg || new Date(item.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={[styles.dateHeaderText, { color: c.textTertiary, backgroundColor: c.backgroundAlt }]}>
              {new Date(item.timestamp).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
          <View
            style={[
              styles.bubble,
              isMe
                ? [styles.myBubble, { backgroundColor: c.accent }]
                : [styles.theirBubble, { backgroundColor: c.backgroundAlt }],
            ]}
          >
            <Text style={[styles.bubbleText, { color: isMe ? '#FFFFFF' : c.textPrimary, fontSize: fp(15) }]}>
              {item.content}
            </Text>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.6)' : c.textTertiary }]}>
                {formatTime(item.timestamp)}
              </Text>
              {isMe && <StatusIcon status={item.status} />}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: c.background },
        isTablet && { maxWidth: 720, alignSelf: 'center', width: '100%' },
      ]}
    >
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: c.textPrimary, fontSize: fp(17) }]}>
            {userName || 'Chat'}
          </Text>
          {isTargetTyping ? (
            <Text style={[styles.headerStatus, { color: c.accent }]}>입력 중...</Text>
          ) : (
            <Text style={[styles.headerStatus, { color: c.textTertiary }]}>로컬 채팅</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messageList, messages.length === 0 && styles.emptyList]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={wp(48)} color={c.textTertiary} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyText, { color: c.textTertiary }]}>
              {userName}님과 대화를 시작하세요
            </Text>
            <Text style={[styles.emptySubtext, { color: c.textTertiary }]}>
              메시지는 이 기기에만 저장됩니다
            </Text>
          </View>
        }
      />

      {/* 입력 영역 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: c.backgroundAlt,
                color: c.textPrimary,
                fontSize: fp(15),
                maxHeight: wp(100),
              },
            ]}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="메시지 입력..."
            placeholderTextColor={c.textTertiary}
            multiline
            accessibilityLabel="메시지 입력"
          />
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? c.accent : c.backgroundAlt,
                width: wp(44),
                height: wp(44),
                borderRadius: wp(22),
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="메시지 전송"
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : c.textTertiary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerName: {
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 1,
  },
  // 메시지 목록
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    opacity: 0.6,
  },
  // 날짜 헤더
  dateHeader: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // 말풍선
  bubbleRow: {
    marginVertical: 2,
  },
  bubbleRowRight: {
    alignItems: 'flex-end',
  },
  bubbleRowLeft: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    lineHeight: 20,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
  },
  // 입력 영역
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
