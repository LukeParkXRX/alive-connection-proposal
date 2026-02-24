/**
 * withBLEPeripheral — Expo Config Plugin for BLE Peripheral (GATT 서버 + 광고) 네이티브 모듈
 *
 * Android: Kotlin 모듈 복사 + ReactPackage 등록
 * iOS: Swift/ObjC 모듈 복사 + Bridging Header 설정 + Info.plist 권한
 */

const { withInfoPlist, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ============================================================
// iOS: Info.plist BLE Peripheral 권한 + 백그라운드 모드
// ============================================================
function withBLEPeripheralIos(config) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults;

    // BLE Peripheral 권한 설명
    if (!plist.NSBluetoothPeripheralUsageDescription) {
      plist.NSBluetoothPeripheralUsageDescription =
        'ALIVE Connection uses Bluetooth to detect nearby users for contact exchange.';
    }

    // BLE Always 권한 (iOS 13+)
    if (!plist.NSBluetoothAlwaysAndWhenInUseUsageDescription) {
      plist.NSBluetoothAlwaysAndWhenInUseUsageDescription =
        'ALIVE Connection uses Bluetooth to detect nearby users for contact exchange.';
    }

    // UIBackgroundModes에 bluetooth-peripheral/central 추가
    const bgModes = plist.UIBackgroundModes || [];
    if (!bgModes.includes('bluetooth-peripheral')) bgModes.push('bluetooth-peripheral');
    if (!bgModes.includes('bluetooth-central')) bgModes.push('bluetooth-central');
    plist.UIBackgroundModes = bgModes;

    // UIRequiredDeviceCapabilities에 bluetooth-le 추가
    const capabilities = plist.UIRequiredDeviceCapabilities || [];
    if (Array.isArray(capabilities) && !capabilities.includes('bluetooth-le')) {
      capabilities.push('bluetooth-le');
    }
    plist.UIRequiredDeviceCapabilities = capabilities;

    return config;
  });
}

// ============================================================
// iOS: Swift/ObjC 네이티브 모듈 파일 복사
// ============================================================
function withBLEPeripheralIosNativeFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const projectName = config.modRequest.projectName || 'AliveConnection';
      const iosDir = path.join(projectRoot, 'ios', projectName);

      // 디렉토리 확인
      if (!fs.existsSync(iosDir)) {
        console.warn('[withBLEPeripheral] iOS project dir not found:', iosDir);
        return config;
      }

      const pluginDir = path.join(projectRoot, 'plugins', 'ble-peripheral');

      // Swift 모듈 복사
      const swiftSrc = path.join(pluginDir, 'AliveBlePeripheralModule.swift');
      const swiftDst = path.join(iosDir, 'AliveBlePeripheralModule.swift');
      if (fs.existsSync(swiftSrc) && !fs.existsSync(swiftDst)) {
        fs.copyFileSync(swiftSrc, swiftDst);
        console.log('[withBLEPeripheral] Copied Swift module to iOS project');
      }

      // ObjC 브릿지 복사
      const bridgeSrc = path.join(pluginDir, 'AliveBlePeripheralBridge.m');
      const bridgeDst = path.join(iosDir, 'AliveBlePeripheralBridge.m');
      if (fs.existsSync(bridgeSrc) && !fs.existsSync(bridgeDst)) {
        fs.copyFileSync(bridgeSrc, bridgeDst);
        console.log('[withBLEPeripheral] Copied ObjC bridge to iOS project');
      }

      // Bridging Header 생성 (없으면)
      const bridgingHeaderPath = path.join(iosDir, `${projectName}-Bridging-Header.h`);
      if (!fs.existsSync(bridgingHeaderPath)) {
        const headerContent = [
          '// 자동 생성됨 — withBLEPeripheral Expo Config Plugin',
          '#import <React/RCTBridgeModule.h>',
          '',
        ].join('\n');
        fs.writeFileSync(bridgingHeaderPath, headerContent);
        console.log('[withBLEPeripheral] Created bridging header');
      }

      return config;
    },
  ]);
}

// ============================================================
// Android: Manifest에 BLE feature 추가
// ============================================================
function withBLEPeripheralAndroid(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // uses-feature: BLE 지원 표시 (필수 아님)
    const features = manifest['uses-feature'] || [];
    if (!features.find((f) => f.$['android:name'] === 'android.hardware.bluetooth_le')) {
      features.push({
        $: {
          'android:name': 'android.hardware.bluetooth_le',
          'android:required': 'false',
        },
      });
    }
    manifest['uses-feature'] = features;

    return config;
  });
}

// ============================================================
// Android: Kotlin 네이티브 모듈 복사 + ReactPackage 등록
// ============================================================
function withBLEPeripheralAndroidNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const pluginDir = path.join(projectRoot, 'plugins', 'ble-peripheral');
      const javaDir = path.join(
        projectRoot,
        'android', 'app', 'src', 'main', 'java',
        'com', 'xrx', 'aliveconnection'
      );

      if (!fs.existsSync(javaDir)) {
        console.warn('[withBLEPeripheral] Android java dir not found:', javaDir);
        return config;
      }

      // Kotlin 모듈 복사
      const ktSrc = path.join(pluginDir, 'AliveBlePeripheralModule.kt');
      const ktDst = path.join(javaDir, 'AliveBlePeripheralModule.kt');
      if (fs.existsSync(ktSrc)) {
        fs.copyFileSync(ktSrc, ktDst);
        console.log('[withBLEPeripheral] Copied Kotlin module to Android project');
      }

      // ReactPackage 생성 (네이티브 모듈을 RN에 등록)
      const packagePath = path.join(javaDir, 'AliveBlePeripheralPackage.kt');
      if (!fs.existsSync(packagePath)) {
        const packageContent = `package com.xrx.aliveconnection

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AliveBlePeripheralPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AliveBlePeripheralModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;
        fs.writeFileSync(packagePath, packageContent);
        console.log('[withBLEPeripheral] Created ReactPackage');
      }

      // MainApplication에 패키지 등록 확인
      const mainAppPath = path.join(javaDir, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        let contents = fs.readFileSync(mainAppPath, 'utf-8');
        if (!contents.includes('AliveBlePeripheralPackage')) {
          // getPackages() 내부에 추가
          contents = contents.replace(
            'override fun getPackages(): List<ReactPackage> =',
            'override fun getPackages(): List<ReactPackage> ='
          );
          // PackageList 다음에 추가
          if (contents.includes('PackageList(this).packages')) {
            contents = contents.replace(
              'PackageList(this).packages',
              'PackageList(this).packages.apply { add(AliveBlePeripheralPackage()) }'
            );
            fs.writeFileSync(mainAppPath, contents, 'utf-8');
            console.log('[withBLEPeripheral] Registered package in MainApplication');
          }
        }
      }

      return config;
    },
  ]);
}

module.exports = function withBLEPeripheral(config) {
  config = withBLEPeripheralIos(config);
  config = withBLEPeripheralIosNativeFiles(config);
  config = withBLEPeripheralAndroid(config);
  config = withBLEPeripheralAndroidNativeFiles(config);
  return config;
};
