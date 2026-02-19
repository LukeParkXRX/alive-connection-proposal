/**
 * ALIVE Connection Type Definitions
 * Designed for future Graph DB / Ontology expansion
 */

// ============================================
// User Node - The core identity
// ============================================
export interface UserProfile {
  id: string;
  name: string;
  gender?: string;
  bio?: string;
  avatarUrl?: string;
  company?: string;
  title?: string;
  viewCount?: number;
  socialLinks: SocialLinks;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus = 'none' | 'pending' | 'accepted';

export interface SocialLinks {
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  [key: string]: string | undefined;
}

// ============================================
// Profile Card - Public facing identity
// ============================================
export type ProfileMode = 'business' | 'casual';

export interface ProfileCard {
  userId: string;
  mode: ProfileMode;
  displayName: string;
  displayTitle?: string;
  displayCompany?: string;
  avatarUrl?: string;
  visibleLinks: SocialLinks;
}

// ============================================
// Interaction Node (The Edge) - Connection event
// ============================================
export interface Interaction {
  id: string;
  sourceUserId: string;   // Me
  targetUserId: string;   // The person I met
  metAt: string;          // ISO timestamp
  location: LocationData;
  eventContext?: string;  // e.g., "TechCrunch Disrupt"
  memo?: string;
  voiceMemoUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  placeName?: string;      // e.g., "Moscone Center"
  city?: string;
  country?: string;
}

// ============================================
// Connection - Enriched view combining User + Interaction
// ============================================
export interface Connection {
  user: UserProfile;
  interaction: Interaction;
}

// ============================================
// NFC Handshake Payload
// ============================================
export interface NfcHandshakePayload {
  version: string;        // Protocol version for compatibility
  profileCard: ProfileCard;
  timestamp: string;
  deviceId: string;       // Anonymous device identifier
}

export interface NfcHandshakeResult {
  success: boolean;
  receivedProfile?: ProfileCard;
  timestamp: string;
  location?: LocationData;
  error?: string;
}

// ============================================
// App State Types
// ============================================
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
}

export interface NfcState {
  isSupported: boolean;
  isEnabled: boolean;
  isScanning: boolean;
  lastHandshake: NfcHandshakeResult | null;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: 'success' | 'error';
}

// ============================================
// Navigation Types
// ============================================
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  HandshakeSuccess: { connection: Connection };
  ProfileDetail: { userId: string };
  Chat: { userId: string; userName: string };
  EditProfile: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Timeline: undefined;
  Profile: undefined;
};
