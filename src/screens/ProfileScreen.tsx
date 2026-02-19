/**
 * ProfileScreen - My Identity Management
 *
 * "카드 생성: 기본 정보, 연락처, 모드 설정"
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useProfileStore } from '@/store/useProfileStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { ProfileMode, SocialLinks } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

interface SocialLinkItem {
  key: keyof SocialLinks;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  mode: ProfileMode | 'both';
}

const SOCIAL_LINKS: SocialLinkItem[] = [
  { key: 'email', label: 'Email', icon: 'mail-outline', placeholder: 'you@company.com', mode: 'business' },
  { key: 'phone', label: 'Phone', icon: 'call-outline', placeholder: '+1 (555) 000-0000', mode: 'business' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', placeholder: 'linkedin.com/in/yourname', mode: 'business' },
  { key: 'website', label: 'Website', icon: 'globe-outline', placeholder: 'yourwebsite.com', mode: 'business' },
  { key: 'twitter', label: 'X (Twitter)', icon: 'logo-twitter', placeholder: '@yourhandle', mode: 'casual' },
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', placeholder: '@yourhandle', mode: 'casual' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', placeholder: '+1 (555) 000-0000', mode: 'casual' },
];

export const ProfileScreen: React.FC = () => {
  const { profile, currentMode, updateProfile, setCurrentMode } = useProfileStore();

  const [name, setName] = useState(profile?.name || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [company, setCompany] = useState(profile?.company || '');
  const [title, setTitle] = useState(profile?.title || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(profile?.socialLinks || {});

  const { signOut } = useAuthStore();
  const { wp, fp, isTablet } = useResponsive();
  const { colors: c, isDark } = useThemeColors();

  const handleModeToggle = (mode: ProfileMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMode(mode);
  };

  const handleSocialLinkChange = (key: string, value: string) => {
    setSocialLinks((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile({
      name,
      gender,
      company,
      title,
      bio,
      socialLinks,
    });
  };

  const filteredLinks = SOCIAL_LINKS.filter(
    (link) => link.mode === 'both' || link.mode === currentMode
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && { maxWidth: 600, alignSelf: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header]}>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>My Identity</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.signOutButton, { backgroundColor: c.backgroundAlt }]}
              onPress={signOut}
              accessibilityRole="button"
              accessibilityLabel="로그아웃"
            >
              <Ionicons name="log-out-outline" size={24} color={c.textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: c.accent }]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="프로필 저장"
            >
              <Text style={[styles.saveButtonText, { color: c.textInverse }]}>Save</Text>
            </Pressable>
          </View>
        </View>

        {/* Profile Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: c.backgroundAlt }]}>
          <View style={styles.avatarContainer}>
            <View style={[
              styles.avatar,
              {
                backgroundColor: c.accentLight,
                width: wp(96),
                height: wp(96),
                borderRadius: wp(48)
              }
            ]}>
              {profile?.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  style={[styles.avatarImage, { width: wp(96), height: wp(96) }]}
                />
              ) : (
                <Text style={[styles.avatarInitial, { color: c.accent }]}>
                  {name?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            <Pressable
              style={[
                styles.editAvatarButton,
                {
                  backgroundColor: c.accent,
                  borderColor: c.backgroundAlt,
                  width: wp(32),
                  height: wp(32),
                  borderRadius: wp(16)
                }
              ]}
              accessibilityRole="button"
              accessibilityLabel="프로필 사진 변경"
            >
              <Ionicons name="camera" size={16} color={c.textInverse} />
            </Pressable>
          </View>

          <Text style={[styles.previewName, { color: c.textPrimary }]}>{name || 'Your Name'}</Text>
          <Text style={[styles.previewTitle, { color: c.textSecondary }]}>
            {[title, company].filter(Boolean).join(' at ') || 'Your Title at Company'}
          </Text>
        </View>

        {/* Mode Selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Sharing Mode</Text>
          <View style={styles.modeSelector}>
            <Pressable
              style={[
                styles.modeOption,
                { backgroundColor: currentMode === 'business' ? c.accent : c.backgroundAlt }
              ]}
              onPress={() => handleModeToggle('business')}
              accessibilityRole="button"
              accessibilityLabel="비즈니스 모드"
            >
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={currentMode === 'business' ? c.textInverse : c.textSecondary}
              />
              <Text
                style={[
                  styles.modeOptionText,
                  { color: currentMode === 'business' ? c.textInverse : c.textSecondary }
                ]}
              >
                Business
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeOption,
                { backgroundColor: currentMode === 'casual' ? c.accent : c.backgroundAlt }
              ]}
              onPress={() => handleModeToggle('casual')}
              accessibilityRole="button"
              accessibilityLabel="캐주얼 모드"
            >
              <Ionicons
                name="cafe-outline"
                size={20}
                color={currentMode === 'casual' ? c.textInverse : c.textSecondary}
              />
              <Text
                style={[
                  styles.modeOptionText,
                  { color: currentMode === 'casual' ? c.textInverse : c.textSecondary }
                ]}
              >
                Casual
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.modeHint, { color: c.textTertiary }]}>
            {currentMode === 'business'
              ? 'Shares professional contact info'
              : 'Shares social media only'}
          </Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              placeholderTextColor={c.textTertiary}
              accessibilityLabel="이름 입력"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Gender</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
              value={gender}
              onChangeText={setGender}
              placeholder="Male / Female / Other"
              placeholderTextColor={c.textTertiary}
              accessibilityLabel="성별 입력"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Company</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
              value={company}
              onChangeText={setCompany}
              placeholder="Acme Inc."
              placeholderTextColor={c.textTertiary}
              accessibilityLabel="회사명 입력"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Job Title</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Product Designer"
              placeholderTextColor={c.textTertiary}
              accessibilityLabel="직함 입력"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
              value={bio}
              onChangeText={setBio}
              placeholder="A short intro about yourself..."
              placeholderTextColor={c.textTertiary}
              multiline
              numberOfLines={3}
              accessibilityLabel="소개 입력"
            />
          </View>
        </View>

        {/* Contact Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
            {currentMode === 'business' ? 'Professional Links' : 'Social Links'}
          </Text>

          {filteredLinks.map((link) => (
            <View key={link.key} style={styles.inputGroup}>
              <View style={styles.inputLabelRow}>
                <Ionicons
                  name={link.icon}
                  size={16}
                  color={c.textSecondary}
                />
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{link.label}</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: c.backgroundAlt, color: c.textPrimary }]}
                value={socialLinks[link.key] || ''}
                onChangeText={(value) => handleSocialLinkChange(link.key as string, value)}
                placeholder={link.placeholder}
                placeholderTextColor={c.textTertiary}
                autoCapitalize="none"
                keyboardType={link.key === 'email' ? 'email-address' : 'default'}
                accessibilityLabel={`${link.label} 입력`}
              />
            </View>
          ))}
        </View>

        {/* Spacer for tab bar */}
        <View style={{ height: wp(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },

  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  signOutButton: {
    padding: spacing.sm,
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
  },

  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },

  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textInverse,
  },

  // Card Preview
  cardPreview: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xl,
  },

  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },

  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: 96,
    height: 96,
  },

  avatarInitial: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },

  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.backgroundAlt,
  },

  previewName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  previewTitle: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },

  // Sections
  section: {
    marginBottom: spacing.xl,
  },

  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  modeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundAlt,
  },

  modeOptionActive: {
    backgroundColor: colors.accent,
  },

  modeOptionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },

  modeOptionTextActive: {
    color: colors.textInverse,
  },

  modeHint: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // Inputs
  inputGroup: {
    marginBottom: spacing.md,
  },

  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },

  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },

  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default ProfileScreen;
