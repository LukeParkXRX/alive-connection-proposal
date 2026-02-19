/**
 * NfcExchanger - Core NFC Handshake Logic
 *
 * Handles the "Zero-Input" profile exchange between two devices.
 * - iOS: CoreNFC / NameDrop compatible
 * - Android: Android Beam / Near Share compatible
 *
 * @author XRX ALIVE Team
 */

import NfcManager, {
  NfcTech,
  Ndef,
  NfcEvents,
  TagEvent,
} from 'react-native-nfc-manager';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

import type {
  NfcHandshakePayload,
  NfcHandshakeResult,
  ProfileCard,
  LocationData,
} from '@/types';

// Protocol version for forward compatibility
const NFC_PROTOCOL_VERSION = '1.0.0';
const ALIVE_NFC_RECORD_TYPE = 'alive.connection/v1';
const ALIVE_BASE_URL = 'https://alive-connection.app/connect';

class NfcExchanger {
  private isInitialized = false;
  private successSound: Audio.Sound | null = null;
  private currentProfileCard: ProfileCard | null = null;

  /**
   * Initialize NFC Manager and preload assets
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if NFC is supported
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        console.warn('NFC is not supported on this device');
        return false;
      }

      // Start NFC Manager
      await NfcManager.start();

      // Preload success sound
      await this.loadSuccessSound();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize NFC:', error);
      return false;
    }
  }

  /**
   * Check if NFC is currently enabled on the device
   */
  async isNfcEnabled(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Set the profile card to be shared during handshake
   */
  setProfileCard(profileCard: ProfileCard): void {
    this.currentProfileCard = profileCard;
  }

  /**
   * Start listening for NFC handshake
   * This is the main "always ready" mode
   */
  async startHandshakeListener(
    onHandshakeComplete: (result: NfcHandshakeResult) => void
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('NFC not initialized. Call initialize() first.');
    }

    if (!this.currentProfileCard) {
      throw new Error('Profile card not set. Call setProfileCard() first.');
    }

    try {
      // Register for tag discovery
      await (NfcManager as any).registerTagEvent(
        async (tag: TagEvent) => {
          const result = await this.handleTagDiscovered(tag);
          onHandshakeComplete(result);
        },
        'Hold your phone near another ALIVE user',
        {
          alertMessage: 'Ready to connect',
        }
      );
    } catch (error) {
      console.error('Failed to start NFC listener:', error);
      throw error;
    }
  }

  /**
   * Stop the NFC handshake listener
   */
  async stopHandshakeListener(): Promise<void> {
    try {
      await NfcManager.unregisterTagEvent();
    } catch (error) {
      console.error('Failed to stop NFC listener:', error);
    }
  }

  /**
   * Perform a single handshake scan (for manual trigger)
   */
  async performHandshake(): Promise<NfcHandshakeResult> {
    if (!this.isInitialized) {
      return this.createErrorResult('NFC not initialized');
    }

    if (!this.currentProfileCard) {
      return this.createErrorResult('Profile card not set');
    }

    try {
      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Get the tag
      const tag = await NfcManager.getTag();
      if (!tag) {
        return this.createErrorResult('No tag found');
      }

      return await this.handleTagDiscovered(tag);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(message);
    } finally {
      await NfcManager.cancelTechnologyRequest();
    }
  }

  /**
   * Handle tag discovery and perform the actual exchange
   */
  private async handleTagDiscovered(tag: TagEvent): Promise<NfcHandshakeResult> {
    const timestamp = new Date().toISOString();

    try {
      // 1. Read incoming data from tag
      const receivedProfile = await this.readProfileFromTag(tag);
      if (!receivedProfile) {
        return this.createErrorResult('Could not read profile from tag');
      }

      // 2. Write our profile to the tag (bidirectional exchange)
      if (this.currentProfileCard) {
        await this.writeProfileToTag(this.currentProfileCard);
      }

      // 3. Get current location for context
      const location = await this.captureLocation();

      // 4. Trigger success feedback
      await this.triggerSuccessFeedback();

      return {
        success: true,
        receivedProfile,
        timestamp,
        location,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Exchange failed';
      return this.createErrorResult(message);
    }
  }

  /**
   * Read profile data from NFC tag
   */
  private async readProfileFromTag(tag: TagEvent): Promise<ProfileCard | null> {
    try {
      const ndefRecords = tag.ndefMessage;
      if (!ndefRecords || ndefRecords.length === 0) {
        return null;
      }

      // Find our custom record type
      for (const record of ndefRecords) {
        if (record.tnf === Ndef.TNF_EXTERNAL_TYPE) {
          const typeString = Ndef.text.decodePayload(
            new Uint8Array(record.type as number[])
          );

          if (typeString === ALIVE_NFC_RECORD_TYPE) {
            const payloadString = Ndef.text.decodePayload(
              new Uint8Array(record.payload as number[])
            );
            const payload: NfcHandshakePayload = JSON.parse(payloadString);
            return payload.profileCard;
          }
        }

        // URI Support (Direct HTTPS links)
        if (record.tnf === Ndef.TNF_WELL_KNOWN && Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
          const uri = Ndef.uri.decodePayload(new Uint8Array(record.payload));
          if (uri.startsWith(ALIVE_BASE_URL)) {
            const userId = uri.split('/').pop();
            if (userId) {
              // Create a skeleton profile - real data will be fetched from Supabase
              return {
                userId,
                displayName: 'ALIVE User', // Placeholder
                mode: 'business',
                visibleLinks: {},
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to read profile from tag:', error);
      return null;
    }
  }

  /**
   * Write profile data to NFC tag
   */
  private async writeProfileToTag(profileCard: ProfileCard): Promise<boolean> {
    try {
      const url = `${ALIVE_BASE_URL}/${profileCard.userId}`;
      const bytes = Ndef.encodeMessage([
        Ndef.uriRecord(url),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to write profile to tag:', error);
      return false;
    }
  }

  /**
   * Capture current GPS location for meeting context
   */
  private async captureLocation(): Promise<LocationData | undefined> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return undefined;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode for address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address
          ? `${address.street || ''} ${address.city || ''} ${address.country || ''}`.trim()
          : undefined,
        placeName: address?.name || undefined,
        city: address?.city || undefined,
        country: address?.country || undefined,
      };
    } catch (error) {
      console.error('Failed to capture location:', error);
      return undefined;
    }
  }

  /**
   * Trigger haptic feedback and sound on successful connection
   */
  private async triggerSuccessFeedback(): Promise<void> {
    // Haptic feedback - distinct "connection made" pattern
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Double tap haptic for emphasis
    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 100);

    // Play success sound
    await this.playSuccessSound();
  }

  /**
   * Load the success sound asset
   */
  private async loadSuccessSound(): Promise<void> {
    try {
      // In production, use a custom "띠링!" sound
      // For now, we'll use a placeholder
      const { sound } = await Audio.Sound.createAsync(
        // Replace with actual sound asset
        require('../../../assets/sounds/connection-success.mp3'),
        { shouldPlay: false }
      );
      this.successSound = sound;
    } catch (error) {
      // Sound asset might not exist yet
      console.log('Success sound not loaded (asset may not exist)');
    }
  }

  /**
   * Play the success sound
   */
  private async playSuccessSound(): Promise<void> {
    try {
      if (this.successSound) {
        await this.successSound.replayAsync();
      }
    } catch (error) {
      console.log('Could not play success sound');
    }
  }

  /**
   * Get anonymous device identifier (for deduplication, not tracking)
   */
  private async getAnonymousDeviceId(): Promise<string> {
    // Generate a session-based ID, not a persistent device ID
    // This respects user privacy while preventing duplicate exchanges
    return `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create an error result object
   */
  private createErrorResult(error: string): NfcHandshakeResult {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopHandshakeListener();
      if (this.successSound) {
        await this.successSound.unloadAsync();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

// Export singleton instance
export const nfcExchanger = new NfcExchanger();
export default NfcExchanger;
