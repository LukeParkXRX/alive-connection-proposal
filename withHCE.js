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
            usesFeatures.push({ $: { 'android:name': 'android.hardware.nfc.hce', 'android:required': 'true' } });
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
                    'android:enabled': 'false',
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
        // Add NDEF_DISCOVERED intent filter to MainActivity
        const mainActivity = application.activity?.find(a => a.$['android:name'] === '.MainActivity');
        if (mainActivity) {
            const intentFilters = mainActivity['intent-filter'] || [];

            // Generate the exact NDEF intent filter
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
                mainActivity['intent-filter'] = intentFilters;
            }
        }

        return config;
    });
}

function withHceAidList(config) {
    return withDangerousMod(config, [
        'android',
        async config => {
            const projectRoot = config.modRequest.projectRoot;
            const resPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');

            fs.mkdirSync(resPath, { recursive: true });

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
            return config;
        }
    ]);
}

module.exports = function withHce(config) {
    config = withHceManifest(config);
    config = withHceAidList(config);
    return config;
};
