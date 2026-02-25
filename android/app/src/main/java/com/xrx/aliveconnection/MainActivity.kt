package com.xrx.aliveconnection

import android.os.Build
import android.os.Bundle
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.NdefMessage
import android.nfc.NdefRecord

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    // NFC 인텐트를 Expo Linking이 처리할 수 있는 VIEW 인텐트로 변환
    handleNfcIntent(intent)
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

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
}
