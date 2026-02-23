# 🧠 ALIVE Project Memory

## 📅 Session Record: Android NFC Data Exchange Troubleshooting

### 🚀 Issue Summary
- **Symptom 1**: App crashed on Android launch with React Native bundle exception (`fail to get current activity`).
- **Symptom 2**: NFC completely dead on Android (no scan sound, no system trigger).
- **Symptom 3**: NFC successfully scans (beeps) but data doesn't get exchanged/parsed on Android deep link.

### 🛠️ Key Fixes & Decisions
1. **`android/` Folder Regeneration**: 
   - A `ClassNotFoundException` regarding `MainApplication` was traced back to a corrupted or incomplete native directory. The entire `android/` directory was deleted, relying on EAS Build to dynamically regenerate it with `npx expo prebuild`.
2. **Robust `NfcManager.start()` Catch-All Retry** (in `NfcExchanger.ts`):
   - Added a robust 10-retry loop to handle the "fail to get current activity" exception on Android during app startup. Made it a generic catch-all retry to prevent any silent crashes.
3. **Prevent Production Fatal Crashes** (in `logger.ts` & `useNfcHandshake.ts`):
   - Changed `console.error` and `logger.error` to `.warn` handling for expected NFC lifecycle errors to prevent full app crashes in production builds.
4. **Android Deep Link Parsing Regex** (in `App.tsx`):
   - Fixed buggy `Linking.parse(event.url)` string checking. The URL path sometimes had leading slashes such as `/connect/[userId]` vs `connect/[userId]` depending on the Android OS version. Upgraded to robust Regular Expressions `/\/connect\/([a-zA-Z0-9_-]+)/` to precisely extract `userId`.
5. **GPS Timeout for Handshakes** (in `LocationService.ts`):
   - Added a fast-path 3-second `setTimeout` race and `getLastKnownPositionAsync` for GPS coordinates. Solved the critical bug where a lack of GPS signal indoors would silently hang the app mid-handshake infinitely.
6. **Enabled HCE CardService by Default** (in `withHCE.js`):
   - `android:enabled="false"` in `AndroidManifest.xml` can cause the internal Android NFC routing table to completely ignore the app's Host Card Emulation service, making the NFC totally unresponsive. Set default `android:enabled="true"` and `android:exported="true"` in the config plugin.

### 📌 Next Steps
- Android APK test with 3rd EAS build (`Hybrid-v1` / `build-1771805141410.apk`).
- Verification of the web dashboard updates upon a successful handshake.
- Once Android is confirmed 100% stable, mirror exact NFC lifecycle behavior for iOS NameDrop compatibility.
