# TRAQQ Mobile App

Production-ready Flutter application wrapping the live TRAQQ platform at **https://mytraqq.com** in a native mobile experience for Google Play Store and Apple App Store.

---

## Project Structure

```
mobile/
├── android/                    Android configuration
│   └── app/
│       ├── build.gradle        App-level Gradle config
│       ├── google-services.json  ← Replace with Firebase config
│       ├── proguard-rules.pro  Release minification rules
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── kotlin/com/traqq/app/MainActivity.kt
│           └── res/
│               ├── drawable/launch_background.xml
│               ├── values/colors.xml
│               ├── values/styles.xml
│               └── xml/network_security_config.xml
├── ios/Runner/
│   ├── AppDelegate.swift       Firebase + FCM setup
│   ├── GoogleService-Info.plist  ← Replace with Firebase config
│   └── Info.plist              Permissions + URL schemes
├── lib/
│   ├── main.dart               Entry point
│   ├── app.dart                Root MaterialApp
│   ├── core/
│   │   ├── constants/          AppConstants (URLs, IDs)
│   │   ├── theme/              AppTheme + AppColors (TRAQQ brand)
│   │   └── utils/              UrlHelper (navigation + link handling)
│   ├── features/
│   │   ├── splash/             Animated splash screen
│   │   ├── webview/            Main WebView screen + loading bar
│   │   ├── offline/            Offline detection screen
│   │   └── info/               About, Contact, Privacy, Terms, Version
│   └── services/
│       ├── analytics_service.dart   Firebase Analytics + Crashlytics
│       ├── connectivity_service.dart  Real-time connectivity
│       └── notification_service.dart  Firebase Cloud Messaging
├── assets/images/              Icon + splash image placeholders
├── pubspec.yaml
├── flutter_launcher_icons.yaml
└── analysis_options.yaml
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Flutter | 3.19.0 |
| Dart | 3.3.0 |
| Android Studio / Xcode | Latest stable |
| Java | 17 |

Install Flutter: https://docs.flutter.dev/get-started/install

---

## Initial Setup

```bash
cd mobile

# Install dependencies
flutter pub get

# Verify environment
flutter doctor -v
```

---

## Firebase Setup (Required before first build)

Firebase is used for Push Notifications, Analytics, and Crashlytics.

### Step 1 — Create Firebase Project

1. Go to https://console.firebase.google.com
2. Create project: **TRAQQ App**
3. Enable **Analytics** when prompted

### Step 2 — Add Android App

1. Register app with package name: `com.traqq.app`
2. Download `google-services.json`
3. Replace `android/app/google-services.json` with the downloaded file

### Step 3 — Add iOS App

1. Register app with bundle ID: `com.traqq.app`
2. Download `GoogleService-Info.plist`
3. Replace `ios/Runner/GoogleService-Info.plist` with the downloaded file
4. Open Xcode → drag the `.plist` into the Runner target (ensure "Copy items if needed" is checked)

### Step 4 — Enable FCM

In Firebase Console → **Cloud Messaging**:
- Android: enabled automatically
- iOS: upload your APNs Auth Key (Key ID + Team ID)

---

## App Icons

Add your icon images to `assets/images/` (see `assets/images/ASSETS_README.md`), then:

```bash
# Uncomment image_path lines in flutter_launcher_icons.yaml first
dart run flutter_launcher_icons
```

---

## Splash Screen

After adding `assets/images/splash_logo.png`:

1. Uncomment the `image:` line in `pubspec.yaml` under `flutter_native_splash:`
2. Run:

```bash
dart run flutter_native_splash:create
```

---

## Android Build

### Debug Build (for testing)

```bash
flutter build apk --debug
# Output: build/app/outputs/flutter-apk/app-debug.apk
```

### Release APK

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### Release AAB (required for Google Play)

```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### Signing for Release

1. Generate a keystore:
   ```bash
   keytool -genkey -v -keystore traqq-release.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias traqq
   ```

2. Create `android/key.properties` (do NOT commit this file):
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=traqq
   storeFile=../traqq-release.jks
   ```

3. Update `android/app/build.gradle` → `signingConfigs.release` to read from `key.properties`

---

## iOS Build

### Prerequisites

- macOS with Xcode 15+
- Apple Developer Account ($99/year)
- iOS Provisioning Profile for `com.traqq.app`

### Open in Xcode

```bash
open ios/Runner.xcworkspace
```

Configure in Xcode:
- **Bundle Identifier:** `com.traqq.app`
- **Team:** Your Apple Developer Team
- **Signing:** Automatic (recommended) or Manual

### Release Archive

```bash
flutter build ios --release
```

Then in Xcode: **Product → Archive → Distribute App → App Store Connect**

---

## Google Play Deployment

1. Create app in [Google Play Console](https://play.google.com/console)
2. Set up app content rating, privacy policy (link: https://mytraqq.com/privacy)
3. Upload `app-release.aab` to **Internal Testing** first
4. Progress through: Internal → Closed → Open → Production

**Required store listing items:**
- Short description (80 chars)
- Full description (4000 chars)
- 2–8 screenshots per form factor
- 512×512 high-res icon
- 1024×500 feature graphic
- Privacy Policy URL: `https://mytraqq.com/privacy`

---

## App Store Deployment

1. Create app record in [App Store Connect](https://appstoreconnect.apple.com)
2. Fill in metadata: name, subtitle, description, keywords, support URL
3. Upload build via Xcode Organiser or Transporter
4. Submit for review

**Required:**
- Privacy Policy URL: `https://mytraqq.com/privacy`
- Support URL: `https://mytraqq.com`
- Screenshots for iPhone 6.7", 6.5", iPad Pro 12.9"
- App category: Travel

---

## Deep Links

### Android (App Links)

Intent filter is configured in `AndroidManifest.xml`. To verify ownership, place at:
```
https://mytraqq.com/.well-known/assetlinks.json
```

Content:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.traqq.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Get fingerprint: `keytool -list -v -keystore traqq-release.jks -alias traqq`

### iOS (Universal Links)

1. In Xcode → **Signing & Capabilities** → **+ Capability** → **Associated Domains**
2. Add: `applinks:mytraqq.com`
3. Place at `https://mytraqq.com/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.traqq.app",
      "paths": ["*"]
    }]
  }
}
```

---

## Push Notifications (FCM)

After Firebase is configured, the app is ready to receive push notifications.

**Android:** Works automatically after Firebase setup.

**iOS additional step:**
1. In Apple Developer Portal → **Certificates, IDs & Profiles** → **Keys**
2. Create an APNs Auth Key
3. In Firebase Console → **Project Settings** → **Cloud Messaging** → **iOS** → upload key

**Sending a test notification:**

```bash
curl -X POST https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "DEVICE_FCM_TOKEN",
      "notification": { "title": "TRAQQ", "body": "Your driver is on the way!" }
    }
  }'
```

---

## Branding Reference

| Token | Value | Usage |
|-------|-------|-------|
| Black | `#0A0A0A` | Background |
| Off-black | `#111111` | Card backgrounds |
| Surface | `#161616` | Elevated surfaces |
| Border | `#2A2A2A` | Dividers, card borders |
| White | `#F5F5F5` | Primary text |
| White Muted | `#A0A0A0` | Secondary text |
| Gold | `#C9A84C` | Primary accent, CTAs |
| Gold Light | `#E0BF78` | Hover states |
| Error | `#FF5F5F` | Errors |
| Success | `#4CAF50` | Success states |

---

## Environment Notes

- All network requests HTTPS-only (enforced in `network_security_config.xml` and `Info.plist`)
- WebView debugging disabled in release builds (`AndroidWebViewController.enableDebugging(kDebugMode)`)
- Crashlytics disabled in debug mode
- Back button navigates within WebView history; exits app only when no history remains
- Offline screen shows automatically on connectivity loss and auto-recovers on reconnection
- External URLs (non-TRAQQ) open in the device's default browser
- Stripe, Google Maps/Places URLs are allowed within the WebView

---

## Native Menu (FAB)

The floating action button (gold, bottom-right) opens a menu with native screens:

| Item | Screen Type |
|------|-------------|
| About TRAQQ | Native Flutter |
| Contact Support | Native Flutter |
| Privacy Policy | Native Flutter |
| Terms & Conditions | Native Flutter |
| App Version | Native Flutter |
| Reload Page | Reloads WebView |
