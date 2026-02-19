/**
 * TimelineScreen - 관계 로그 (Timeline View)
 *
 * "교환된 연락처를 '시간 순(Timeline)'으로 보여줌"
 * 각 카드에는 자동 생성된 만남 태그 표시
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useConnectionStore } from '@/store/useConnectionStore';
import type { Connection, RootStackParamList } from '@/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface TimelineSection {
  title: string;
  data: Connection[];
}

export const TimelineScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { connections, searchConnections } = useConnectionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const { wp } = useResponsive();
  const { colors: c } = useThemeColors();

  // Format date for section headers
  const formatSectionDate = (dateString: string): string => {
    const date = new Date(dateString);

    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isThisWeek(date)) return format(date, 'EEEE');
    if (isThisYear(date)) return format(date, 'MMMM d');
    return format(date, 'MMMM d, yyyy');
  };

  // Group connections into sections by date
  const sections = useMemo((): TimelineSection[] => {
    const filteredConnections = searchQuery
      ? searchConnections(searchQuery)
      : connections;

    // Sort by date descending
    const sorted = [...filteredConnections].sort(
      (a, b) =>
        new Date(b.interaction.metAt).getTime() -
        new Date(a.interaction.metAt).getTime()
    );

    // Group by date
    const grouped = new Map<string, Connection[]>();

    sorted.forEach((conn) => {
      const dateKey = new Date(conn.interaction.metAt).toDateString();
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, conn]);
    });

    // Convert to sections
    return Array.from(grouped.entries()).map(([dateKey, data]) => ({
      title: formatSectionDate(dateKey),
      data,
    }));
  }, [connections, searchQuery, searchConnections]);

  const handleConnectionPress = (connection: Connection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ProfileDetail', { userId: connection.user.id });
  };

  const renderSectionHeader = ({ section }: { section: TimelineSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: c.background }]}>
      <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>{section.title}</Text>
    </View>
  );

  const renderConnection = ({ item }: { item: Connection }) => {
    const { user, interaction } = item;
    const metTime = format(new Date(interaction.metAt), 'h:mm a');

    // Build location string
    const locationParts = [
      interaction.eventContext,
      interaction.location.placeName,
      interaction.location.city,
    ].filter(Boolean);
    const locationString = locationParts.join(', ');

    return (
      <Pressable
        style={({ pressed }) => [
          styles.connectionCard,
          { backgroundColor: pressed ? c.backgroundAlt : c.background }
        ]}
        onPress={() => handleConnectionPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`${user.name} 프로필 보기`}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={[styles.avatar, { width: wp(52), height: wp(52), borderRadius: wp(26) }]} />
          ) : (
            <View style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: c.accentLight,
                width: wp(52),
                height: wp(52),
                borderRadius: wp(26)
              }
            ]}>
              <Text style={[styles.avatarInitial, { color: c.accent }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.connectionName, { color: c.textPrimary }]} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={[styles.connectionTime, { color: c.textTertiary }]}>{metTime}</Text>
          </View>

          {(user.title || user.company) && (
            <Text style={[styles.connectionTitle, { color: c.textSecondary }]} numberOfLines={1}>
              {[user.title, user.company].filter(Boolean).join(' at ')}
            </Text>
          )}

          {/* Context Tags */}
          {locationString && (
            <View style={[styles.contextTag, { backgroundColor: c.accentLight }]}>
              <Ionicons
                name="location-outline"
                size={12}
                color={c.accent}
              />
              <Text style={[styles.contextText, { color: c.accent }]} numberOfLines={1}>
                {locationString}
              </Text>
            </View>
          )}

          {/* Memo preview */}
          {interaction.memo && (
            <View style={styles.memoPreview}>
              <Ionicons name="document-text-outline" size={12} color={c.textTertiary} />
              <Text style={[styles.memoText, { color: c.textTertiary }]} numberOfLines={1}>
                {interaction.memo}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={c.textTertiary}
        />
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[
        styles.emptyIcon,
        {
          backgroundColor: c.backgroundAlt,
          width: wp(80),
          height: wp(80),
          borderRadius: wp(40)
        }
      ]}>
        <Ionicons name="people-outline" size={48} color={c.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No connections yet</Text>
      <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>
        Tap phones with another ALIVE user to start building your network
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Timeline</Text>
        <Text style={[styles.connectionCount, { color: c.textTertiary }]}>
          {connections.length} connection{connections.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: c.backgroundAlt }]}>
        <Ionicons name="search" size={18} color={c.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: c.textPrimary }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search connections..."
          placeholderTextColor={c.textTertiary}
          accessibilityRole="search"
          accessibilityLabel="연결 검색"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="검색어 지우기"
          >
            <Ionicons name="close-circle" size={18} color={c.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Timeline List */}
      <SectionList
        sections={sections}
        renderItem={renderConnection}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.interaction.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: wp(100) }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },

  connectionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100, // Tab bar space
  },

  // Section Header
  sectionHeader: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },

  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Connection Card
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },

  connectionCardPressed: {
    backgroundColor: colors.backgroundAlt,
  },

  avatarContainer: {
    marginRight: spacing.md,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },

  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarInitial: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },

  cardContent: {
    flex: 1,
    marginRight: spacing.sm,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  connectionName: {
    flex: 1,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },

  connectionTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },

  connectionTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  // Context Tag
  contextTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },

  contextText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.medium,
  },

  // Memo
  memoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },

  memoText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },

  separator: {
    height: spacing.sm,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },

  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
});

export default TimelineScreen;
