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

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { wp, fp, isTablet } = useResponsive();
    const { colors: c, isDark } = useThemeColors();

    const handleGoogleLogin = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            // For Expo, we use the OAuth flow via Supabase
            // In a real app, you would configure the redirect URL in Supabase dashboard
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

            // If data.url exists, open it in the web browser
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, 'alive://google-auth');

                if (result.type === 'success' && result.url) {
                    const { params, errorCode } = getQueryParams(result.url);
                    if (params.access_token) {
                        await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token,
                        });
                    }
                }
            }
        } catch (error: any) {
            console.error('Login error:', error.message);
            Alert.alert('Login Failed', 'Could not sign in with Google. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getQueryParams = (url: string) => {
        const query = url.split('#')[1] || url.split('?')[1];
        if (!query) return { params: {}, errorCode: null };

        const params: Record<string, string> = {};
        query.split('&').forEach(part => {
            const [key, value] = part.split('=');
            params[key] = value;
        });

        return { params, errorCode: null };
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
