const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withHceManifest(config) {
    return withAndroidManifest(config, async config => {
        const androidManifest = config.modResults.manifest;

        // Add permissions
        const usesPermissions = androidManifest['uses-permission'] || [];
        if (!usesPermissions.find(p => p.$['android:name'] === 'android.permission.NFC')) {
            usesPermissions.push({ $: { 'android:name': 'android.permission.NFC' } });
        }
        androidManifest['uses-permission'] = usesPermissions;

        // Add features
        const usesFeatures = androidManifest['uses-feature'] || [];
        if (!usesFeatures.find(f => f.$['android:name'] === 'android.hardware.nfc.hce')) {
            usesFeatures.push({ $: { 'android:name': 'android.hardware.nfc.hce', 'android:required': 'false' } });
        }
        androidManifest['uses-feature'] = usesFeatures;

        // Add service to application
        const application = androidManifest.application[0];
        const services = application.service || [];
        const hasCardService = services.find(s => s.$['android:name'] === 'com.reactnativehce.services.CardService');

        if (!hasCardService) {
            services.push({
                $: {
                    'android:name': 'com.reactnativehce.services.CardService',
                    'android:exported': 'true',
                    'android:enabled': 'true',
                    'android:permission': 'android.permission.BIND_NFC_SERVICE'
                },
                'intent-filter': [{
                    action: [{ $: { 'android:name': 'android.nfc.cardemulation.action.HOST_APDU_SERVICE' } }],
                    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }]
                }],
                'meta-data': [{
                    $: {
                        'android:name': 'android.nfc.cardemulation.host_apdu_service',
                        'android:resource': '@xml/aid_list'
                    }
                }]
            });
            application.service = services;
        }
        // MainActivity 설정: singleTask로 NFC 인텐트가 기존 액티비티로 전달되도록 함
        const mainActivity = application.activity?.find(a => a.$['android:name'] === '.MainActivity');
        if (mainActivity) {
            mainActivity.$['android:launchMode'] = 'singleTask';
            const intentFilters = mainActivity['intent-filter'] || [];

            // 1. NDEF_DISCOVERED — 최우선 NFC 인텐트 (NDEF URL 매칭)
            const hasNdef = intentFilters.find(i => {
                const actionArray = i.action || [];
                return actionArray.some(a => a.$['android:name'] === 'android.nfc.action.NDEF_DISCOVERED');
            });

            if (!hasNdef) {
                intentFilters.push({
                    action: [{ $: { 'android:name': 'android.nfc.action.NDEF_DISCOVERED' } }],
                    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
                    data: [{ $: { 'android:scheme': 'https', 'android:host': 'alive-connection.app', 'android:pathPrefix': '/connect' } }]
                });
            }

            // 2. TECH_DISCOVERED — Samsung 폴백 (Samsung이 NDEF_DISCOVERED 대신 이걸 쓸 수 있음)
            const hasTech = intentFilters.find(i => {
                const actionArray = i.action || [];
                return actionArray.some(a => a.$['android:name'] === 'android.nfc.action.TECH_DISCOVERED');
            });

            if (!hasTech) {
                intentFilters.push({
                    action: [{ $: { 'android:name': 'android.nfc.action.TECH_DISCOVERED' } }],
                    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }]
                });
            }

            mainActivity['intent-filter'] = intentFilters;

            // TECH_DISCOVERED에 필요한 meta-data 추가
            const metaData = mainActivity['meta-data'] || [];
            const hasTechMeta = metaData.find(m => m.$['android:name'] === 'android.nfc.action.TECH_DISCOVERED');
            if (!hasTechMeta) {
                metaData.push({
                    $: {
                        'android:name': 'android.nfc.action.TECH_DISCOVERED',
                        'android:resource': '@xml/nfc_tech_filter'
                    }
                });
                mainActivity['meta-data'] = metaData;
            }
        }

        return config;
    });
}

function withHceResources(config) {
    return withDangerousMod(config, [
        'android',
        async config => {
            const projectRoot = config.modRequest.projectRoot;
            const resPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');

            fs.mkdirSync(resPath, { recursive: true });

            // HCE AID 목록
            const aidListContent = `<?xml version="1.0" encoding="utf-8"?>
<host-apdu-service xmlns:android="http://schemas.android.com/apk/res/android"
                   android:description="@string/app_name"
                   android:requireDeviceUnlock="false">
  <aid-group android:category="other"
             android:description="@string/app_name">
    <aid-filter android:name="D2760000850101" />
  </aid-group>
</host-apdu-service>`;

            fs.writeFileSync(path.join(resPath, 'aid_list.xml'), aidListContent);

            // NFC 기술 필터 — Samsung 기기 호환용
            // IsoDep: HCE Type 4 Tag, NfcA: 일반 NFC-A, Ndef: NDEF 포맷
            const nfcTechFilterContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <tech-list>
    <tech>android.nfc.tech.IsoDep</tech>
  </tech-list>
  <tech-list>
    <tech>android.nfc.tech.NfcA</tech>
  </tech-list>
  <tech-list>
    <tech>android.nfc.tech.Ndef</tech>
  </tech-list>
</resources>`;

            fs.writeFileSync(path.join(resPath, 'nfc_tech_filter.xml'), nfcTechFilterContent);

            return config;
        }
    ]);
}

/**
 * MainActivity.kt에 onNewIntent 오버라이드 추가:
 * NFC 인텐트(NDEF_DISCOVERED/TECH_DISCOVERED/TAG_DISCOVERED)를
 * ACTION_VIEW 인텐트로 변환하여 Expo Linking이 처리할 수 있게 함.
 *
 * 문제: Expo Linking은 ACTION_VIEW만 처리하므로 NFC 인텐트는 무시됨.
 * 해결: NFC 인텐트 → NDEF 메시지에서 URI 추출 → VIEW 인텐트로 변환 → setIntent()
 */
function withNfcMainActivity(config) {
    return withDangerousMod(config, [
        'android',
        async config => {
            const projectRoot = config.modRequest.projectRoot;
            const mainActivityPath = path.join(
                projectRoot, 'android', 'app', 'src', 'main', 'java',
                'com', 'xrx', 'aliveconnection', 'MainActivity.kt'
            );

            if (!fs.existsSync(mainActivityPath)) {
                console.warn('[withHCE] MainActivity.kt not found, skipping NFC intent handler');
                return config;
            }

            let contents = fs.readFileSync(mainActivityPath, 'utf-8');

            // 이미 추가된 경우 건너뛰기
            if (contents.includes('handleNfcIntent')) {
                return config;
            }

            // Kotlin import 추가
            contents = contents.replace(
                'import android.os.Bundle',
                `import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.NdefMessage
import android.nfc.NdefRecord`
            );

            // 기존 onCreate 수정: handleNfcIntent(intent) 호출 추가
            contents = contents.replace(
                `override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }`,
                `override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    // NFC 인텐트를 Expo Linking이 처리할 수 있는 VIEW 인텐트로 변환
    handleNfcIntent(intent)
    super.onCreate(null)
  }`
            );

            // onNewIntent + handleNfcIntent 메서드를 클래스 마지막 } 직전에 삽입
            const nfcHandlerCode = `
  // === NFC Intent → Expo Linking 변환 ===
  // NFC 인텐트(NDEF_DISCOVERED 등)는 Expo Linking이 처리 못함 (ACTION_VIEW만 지원)
  // NDEF 메시지에서 URI를 추출하여 VIEW 인텐트로 변환
  override fun onNewIntent(intent: Intent?) {
    handleNfcIntent(intent)
    super.onNewIntent(intent)
  }

  private fun handleNfcIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.action
    if (action == NfcAdapter.ACTION_NDEF_DISCOVERED ||
        action == NfcAdapter.ACTION_TECH_DISCOVERED ||
        action == NfcAdapter.ACTION_TAG_DISCOVERED) {
      val rawMsgs = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)
      if (rawMsgs != null && rawMsgs.isNotEmpty()) {
        val msg = rawMsgs[0] as NdefMessage
        for (record in msg.records) {
          val uri = record.toUri()
          if (uri != null && uri.toString().contains("/connect/")) {
            // NFC 인텐트를 VIEW 인텐트로 변환 → Expo Linking이 처리
            val viewIntent = Intent(Intent.ACTION_VIEW, uri)
            viewIntent.setPackage(packageName)
            setIntent(viewIntent)
            return
          }
        }
      }
    }
  }
`;

            // 클래스의 마지막 닫는 괄호 직전에 삽입
            const lastBraceIndex = contents.lastIndexOf('}');
            contents = contents.substring(0, lastBraceIndex) + nfcHandlerCode + contents.substring(lastBraceIndex);

            fs.writeFileSync(mainActivityPath, contents, 'utf-8');
            console.log('[withHCE] NFC intent handler added to MainActivity.kt');
            return config;
        }
    ]);
}

module.exports = function withHce(config) {
    config = withHceManifest(config);
    config = withHceResources(config);
    config = withNfcMainActivity(config);
    return config;
};
