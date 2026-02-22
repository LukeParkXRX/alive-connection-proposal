/**
 * ExchangeRequestSheet - 교환 요청 바텀시트
 * 근접 기기 발견 시 상대방 정보 표시 + 교환 수락/거절
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import type { ExchangeEvent, ExchangeMethod } from '@/types/ble';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExchangeRequestSheetProps {
  visible: boolean;
  event: ExchangeEvent | null;
  onAccept: (partnerId: string, method: ExchangeMethod) => Promise<void>;
  onReject: () => void;
}

const ExchangeRequestSheet: React.FC<ExchangeRequestSheetProps> = ({
  visible,
  event,
  onAccept,
  onReject,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    if (!event?.partnerId || !event.method) return;
    setIsLoading(true);
    try {
      await onAccept(event.partnerId, event.method);
    } finally {
      setIsLoading(false);
    }
  };

  const methodLabel = {
    ble: 'Bluetooth',
    nfc: 'NFC',
    hce: 'NFC (HCE)',
    qr: 'QR Code',
    link: 'Link',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Partner Info */}
          <View style={styles.content}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {event?.data?.displayName?.[0] || '?'}
              </Text>
            </View>

            <Text style={styles.title}>
              새로운 연결 요청
            </Text>

            <Text style={styles.partnerId}>
              {event?.data?.displayName || `User ${event?.partnerId?.slice(0, 8) || '...'}`}
            </Text>

            {event?.method && (
              <View style={styles.methodBadge}>
                <Text style={styles.methodText}>
                  {methodLabel[event.method] || event.method}
                </Text>
              </View>
            )}

            {event?.data?.rssi && (
              <Text style={styles.rssiText}>
                신호 강도: {event.data.rssi} dBm
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.rejectButton]}
              onPress={onReject}
              disabled={isLoading}
            >
              <Text style={styles.rejectButtonText}>거절</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.acceptButtonText}>교환하기</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#00D4AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
  },
  title: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  partnerId: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 12,
  },
  methodBadge: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  methodText: {
    fontSize: 12,
    color: '#00D4AA',
    fontWeight: '500',
  },
  rssiText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: '#334155',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  acceptButton: {
    backgroundColor: '#00D4AA',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});

export default ExchangeRequestSheet;
