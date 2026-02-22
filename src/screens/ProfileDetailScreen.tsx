/**
 * ProfileDetailScreen - Viewing another user's profile
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import type { UserProfile, ConnectionStatus } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

export const ProfileDetailScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { userId } = route.params;
    const { user: currentUser, dbUser: myDbUser } = useAuthStore();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('none');
    const [loading, setLoading] = useState(true);
    const [joinLoading, setJoinLoading] = useState(false);
    const { wp, fp } = useResponsive();
    const { colors: c } = useThemeColors();

    useEffect(() => {
        fetchProfile();
        logView();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            // 1. Fetch User Data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError) throw userError;

            // Transform DB to Type
            const transformedProfile: UserProfile = {
                id: userData.id,
                name: userData.name,
                gender: userData.gender,
                bio: userData.bio,
                avatarUrl: userData.avatar_url,
                company: userData.company,
                title: userData.title,
                viewCount: userData.profile_view_count,
                socialLinks: userData.social_links,
                createdAt: userData.created_at,
                updatedAt: userData.updated_at,
            };

            setProfile(transformedProfile);

            // 2. Check Connection Status (public.users.id 사용)
            const myId = myDbUser?.id;
            if (myId) {
              const { data: connData } = await supabase
                  .from('connections')
                  .select('status')
                  .or(`and(requester_id.eq.${myId},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${myId})`)
                  .single();

              if (connData) {
                  setStatus(connData.status as ConnectionStatus);
              }
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
        } finally {
            setLoading(false);
        }
    };

    const logView = async () => {
        const myId = useAuthStore.getState().dbUser?.id;
        if (!myId || myId === userId) return;
        await supabase.from('profile_views').insert({
            viewer_id: myId,
            viewed_id: userId,
        });
    };

    const handleJoinRequest = async () => {
        setJoinLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const myId = useAuthStore.getState().dbUser?.id;
            if (!myId) throw new Error('로그인 필요');
            const { error } = await supabase.from('connections').insert({
                requester_id: myId,
                receiver_id: userId,
                status: 'pending'
            });

            if (error) throw error;
            setStatus('pending');
            Alert.alert('Request Sent', 'Connection request has been sent to ' + profile?.name);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setJoinLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
                <ActivityIndicator size="large" color={c.accent} />
            </View>
        );
    }

    if (!profile) return null;

    const isAccepted = status === 'accepted';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header with Back Button and View Count */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="뒤로 가기"
                    >
                        <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
                    </Pressable>
                    <View style={styles.headerActions}>
                        <Pressable
                            onPress={() => navigation.navigate('Chat', { userId, userName: profile.name })}
                            style={[styles.messageButton, { backgroundColor: c.backgroundAlt }]}
                            accessibilityRole="button"
                            accessibilityLabel="메시지 보내기"
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color={c.accent} />
                        </Pressable>
                        <View style={[styles.viewCountContainer, { backgroundColor: c.backgroundAlt }]}>
                            <Ionicons name="eye-outline" size={16} color={c.textSecondary} />
                            <Text style={[styles.viewCountText, { color: c.textSecondary }]}>{profile.viewCount || 0}</Text>
                        </View>
                    </View>
                </View>

                {/* Profile Card */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {profile.avatarUrl ? (
                            <Image source={{ uri: profile.avatarUrl }} style={[
                                styles.avatar,
                                { width: wp(120), height: wp(120), borderRadius: wp(60) }
                            ]} />
                        ) : (
                            <View style={[
                                styles.avatar,
                                styles.avatarPlaceholder,
                                {
                                    backgroundColor: c.accentLight,
                                    width: wp(120),
                                    height: wp(120),
                                    borderRadius: wp(60)
                                }
                            ]}>
                                <Text style={[styles.avatarInitial, { fontSize: fp(48), color: c.accent }]}>{profile.name.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        {profile.gender && (
                            <View style={[
                                styles.genderTag,
                                {
                                    backgroundColor: c.accent,
                                    borderColor: c.background,
                                    width: wp(28),
                                    height: wp(28),
                                    borderRadius: wp(14)
                                }
                            ]}>
                                <Ionicons
                                    name={profile.gender.toLowerCase() === 'male' ? 'male' : 'female'}
                                    size={12}
                                    color={c.textInverse}
                                />
                            </View>
                        )}
                    </View>
                    <Text style={[styles.name, { color: c.textPrimary }]}>{profile.name}</Text>
                    <Text style={[styles.titleInfo, { color: c.textSecondary }]}>
                        {[profile.title, profile.company].filter(Boolean).join(' at ')}
                    </Text>
                </View>

                {/* Bio */}
                {profile.bio && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>About</Text>
                        <Text style={[styles.bioText, { color: c.textSecondary }]}>{profile.bio}</Text>
                    </View>
                )}

                {/* Public Info */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Basic Info</Text>
                    <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={20} color={c.textSecondary} />
                        <Text style={[styles.infoText, { color: c.textPrimary }]}>{profile.socialLinks.email}</Text>
                    </View>
                </View>

                {/* Private Info / JOIN Action */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Private Links</Text>
                        {!isAccepted && (
                            <View style={[styles.lockedBadge, { backgroundColor: c.backgroundAlt }]}>
                                <Ionicons name="lock-closed" size={12} color={c.textTertiary} />
                                <Text style={[styles.lockedText, { color: c.textTertiary }]}>Locked</Text>
                            </View>
                        )}
                    </View>

                    {isAccepted ? (
                        <View style={[styles.linksContainer, { backgroundColor: c.backgroundAlt }]}>
                            {Object.entries(profile.socialLinks).map(([key, value]) => {
                                if (['email', 'name', 'title', 'company'].includes(key)) return null;
                                if (!value) return null;
                                return (
                                    <View key={key} style={styles.infoRow}>
                                        <Ionicons name="link-outline" size={20} color={c.accent} />
                                        <Text style={[styles.infoText, { color: c.textPrimary }]}>{key.toUpperCase()}: {value}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={[styles.joinContainer, { backgroundColor: c.backgroundAlt, borderColor: c.border }]}>
                            <Text style={[styles.joinHint, { color: c.textSecondary }]}>
                                Connect to see professional links and social media.
                            </Text>
                            <Pressable
                                style={[
                                    styles.joinButton,
                                    {
                                        backgroundColor: status === 'pending' ? c.textTertiary : c.accent
                                    },
                                    joinLoading && styles.disabledButton,
                                ]}
                                onPress={handleJoinRequest}
                                disabled={status !== 'none' || joinLoading}
                                accessibilityRole="button"
                                accessibilityLabel={status === 'pending' ? '연결 요청 전송됨' : '연결 요청하기'}
                            >
                                {joinLoading ? (
                                    <ActivityIndicator color={c.textInverse} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={status === 'pending' ? 'time-outline' : 'people-outline'}
                                            size={20}
                                            color={c.textInverse}
                                        />
                                        <Text style={[styles.joinButtonText, { color: c.textInverse }]}>
                                            {status === 'pending' ? 'Request Sent' : 'JOIN to Connect'}
                                        </Text>
                                    </>
                                )}
                            </Pressable>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing['5xl'],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    messageButton: {
        padding: spacing.sm,
        backgroundColor: colors.backgroundAlt,
        borderRadius: borderRadius.md,
    },
    viewCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundAlt,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    viewCountText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textSecondary,
    },
    profileHeader: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        ...shadows.md,
    },
    avatarPlaceholder: {
        backgroundColor: colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: typography.fontWeight.bold,
        color: colors.accent,
    },
    genderTag: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: colors.accent,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    name: {
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    titleInfo: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    section: {
        marginTop: spacing['2xl'],
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    bioText: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    infoText: {
        fontSize: typography.fontSize.base,
        color: colors.textPrimary,
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.backgroundAlt,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    lockedText: {
        fontSize: typography.fontSize.xs,
        color: colors.textTertiary,
        fontWeight: typography.fontWeight.medium,
    },
    linksContainer: {
        backgroundColor: colors.backgroundAlt,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    joinContainer: {
        alignItems: 'center',
        backgroundColor: colors.backgroundAlt,
        padding: spacing.xl,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    joinHint: {
        fontSize: typography.fontSize.sm,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing['2xl'],
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.sm,
    },
    pendingButton: {
        backgroundColor: colors.textTertiary,
    },
    disabledButton: {
        opacity: 0.7,
    },
    joinButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.textInverse,
    },
});

export default ProfileDetailScreen;
