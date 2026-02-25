/**
 * LoginScreen - Google Authentication
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/services/supabase';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';
import { logger } from '@/lib/logger';

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { wp, fp, isTablet } = useResponsive();
    const { colors: c, isDark } = useThemeColors();

    const handleGoogleLogin = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // Supabase OAuth URL 생성 (리다이렉트 URI는 Supabase 대시보드에 등록 필요)
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'alive://google-auth',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) throw error;

            // OAuth URL이 있으면 시스템 브라우저에서 인증 진행
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, 'alive://google-auth');

                if (result.type === 'success' && result.url) {
                    // 콜백 URL에서 토큰 파라미터 추출 및 검증
                    const { params } = getQueryParams(result.url);

                    if (!params.access_token || !params.refresh_token) {
                        // 필수 토큰이 없으면 인증 실패로 처리
                        logger.error('OAuth 콜백 URL에 토큰이 없음:', result.url);
                        Alert.alert('로그인 실패', '인증 응답이 올바르지 않습니다. 다시 시도해주세요.');
                        return;
                    }

                    await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });
                } else if (result.type === 'dismiss' || result.type === 'cancel') {
                    // 사용자가 브라우저를 직접 닫은 경우 — 오류 아님, 조용히 종료
                    logger.log('OAuth 브라우저 세션 취소됨 (type:', result.type, ')');
                }
                // 그 외 타입은 무시 (예: opened)
            }
        } catch (error: any) {
            logger.error('Google 로그인 오류:', error.message);
            Alert.alert('로그인 실패', 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * OAuth 콜백 URL에서 쿼리/해시 파라미터를 파싱합니다.
     * Supabase는 액세스 토큰을 URL 해시(#)에 담아 반환합니다.
     */
    const getQueryParams = (url: string): { params: Record<string, string> } => {
        // 해시(#) 우선, 없으면 쿼리스트링(?) 사용
        const fragment = url.split('#')[1] || url.split('?')[1];
        if (!fragment) return { params: {} };

        const params: Record<string, string> = {};
        fragment.split('&').forEach(part => {
            const eqIdx = part.indexOf('=');
            if (eqIdx === -1) return; // '=' 없는 잘못된 파라미터 무시
            const key = decodeURIComponent(part.slice(0, eqIdx));
            const value = decodeURIComponent(part.slice(eqIdx + 1));
            if (key) params[key] = value;
        });

        return { params };
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
            <View style={[
                styles.content,
                {
                    maxWidth: isTablet ? 480 : undefined,
                    alignSelf: isTablet ? 'center' as const : undefined,
                }
            ]}>
                {/* Logo & Branding */}
                <View style={styles.brandSection}>
                    <View style={[
                        styles.logoContainer,
                        {
                            width: wp(120),
                            height: wp(120),
                            borderRadius: wp(60),
                            backgroundColor: c.accentLight,
                        }
                    ]}>
                        <Ionicons name="infinite" size={60} color={c.accent} />
                    </View>
                    <Text style={[styles.title, { fontSize: fp(48), color: c.textPrimary }]}>ALIVE</Text>
                    <Text style={[styles.subtitle, { color: c.accent }]}>Network Effortlessly</Text>
                    <Text style={[styles.description, { lineHeight: fp(24), color: c.textSecondary }]}>
                        기록은 최소화, 기억은 극대화.{"\n"}
                        지메일로 로그인하고 마법 같은 인맥 관리를 시작하세요.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.googleButton,
                            { backgroundColor: c.background, borderColor: c.border },
                            pressed && [styles.googleButtonPressed, { backgroundColor: c.backgroundAlt }],
                            loading && styles.disabledButton,
                        ]}
                        onPress={handleGoogleLogin}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel="로그인"
                    >
                        {loading ? (
                            <ActivityIndicator color={c.textPrimary} />
                        ) : (
                            <>
                                <Ionicons name="logo-google" size={24} color={c.textPrimary} />
                                <Text style={[styles.googleButtonText, { color: c.textPrimary }]}>Continue with Google</Text>
                            </>
                        )}
                    </Pressable>

                    <Text style={[styles.footerText, { color: c.textTertiary }]}>
                        By continuing, you agree to our Terms and Privacy Policy.
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing['2xl'],
        justifyContent: 'space-between',
        paddingVertical: spacing['5xl'],
    },
    brandSection: {
        alignItems: 'center',
        marginTop: spacing['3xl'],
    },
    logoContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    title: {
        fontSize: 48,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: typography.fontSize.lg,
        color: colors.accent,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing['2xl'],
    },
    description: {
        fontSize: typography.fontSize.base,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    actionSection: {
        gap: spacing.lg,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.xl,
        gap: spacing.md,
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    googleButtonPressed: {
        transform: [{ scale: 0.98 }],
        backgroundColor: colors.backgroundAlt,
    },
    disabledButton: {
        opacity: 0.6,
    },
    googleButtonText: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.textPrimary,
    },
    footerText: {
        fontSize: typography.fontSize.xs,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});

export default LoginScreen;
