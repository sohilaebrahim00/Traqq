# TRAQQ Flutter App — Build & Deployment Guide

## Prerequisites

| Tool | Version |
|------|---------|
| Flutter SDK | ≥ 3.22 stable |
| Dart | ≥ 3.3 (ships with Flutter) |
| Android Studio | Hedgehog+ (or `sdkmanager` CLI) |
| Xcode | 15+ (macOS only, for iOS) |
| Firebase CLI | `npm install -g firebase-tools` |
| Fastlane (optional) | `gem install fastlane` |

---

## 1. First-Time Setup

```bash
cd mobile
flutter pub get
```

### 1a. Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Register app IDs:
   - Android: `com.traqq.app`
   - iOS: `com.traqq.app`
3. Download and place config files:
   - `android/app/google-services.json` (replace placeholder)
   - `ios/Runner/GoogleService-Info.plist` (replace placeholder)
4. Enable FCM in Firebase Console → Cloud Messaging

### 1b. Stripe (already configured in AppConfig)

Edit `lib/core/config/app_config.dart` if you need to switch between test/live keys:
```dart
static const String stripePublishableKey = 'pk_live_...';
```

### 1c. Environment Variables

The app reads all secrets from `GET /api/config` at runtime (no secrets baked into the APK/IPA).

---

## 2. Running Locally

```bash
# List connected devices
flutter devices

# Run on a specific device (debug)
flutter run -d <device-id>

# Run customer app (default)
flutter run

# Run with verbose logging
flutter run --verbose
```

---

## 3. Android Build

### 3a. Signing Keystore

```bash
# Generate keystore (one-time)
keytool -genkey -v -keystore android/app/traqq-release.keystore \
  -alias traqq -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/key.properties`:
```properties
storePassword=<your-store-password>
keyPassword=<your-key-password>
keyAlias=traqq
storeFile=traqq-release.keystore
```

### 3b. Build APK (direct install)

```bash
flutter build apk --release
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### 3c. Build AAB (Play Store)

```bash
flutter build appbundle --release
# Output: build/app/outputs/bundle/release/app-release.aab
```

### 3d. Play Store Submission

1. Go to https://play.google.com/console
2. Create new app → Internal testing → Upload AAB
3. Fill store listing (screenshots, description)
4. Set content rating
5. Publish to production

---

## 4. iOS Build

> Requires macOS with Xcode 15+.

### 4a. Certificates & Provisioning

1. Open `ios/Runner.xcworkspace` in Xcode
2. Select Runner target → Signing & Capabilities
3. Set Team and Bundle Identifier: `com.traqq.app`
4. Enable:
   - Push Notifications
   - Associated Domains: `applinks:mytraqq.com`
   - Background Modes: Remote notifications

### 4b. Build IPA

```bash
flutter build ios --release
```

Then in Xcode: Product → Archive → Distribute App → App Store Connect.

### 4c. App Store Submission

1. Upload via Xcode Organizer or `xcrun altool`
2. Go to https://appstoreconnect.apple.com
3. Create new version, attach build
4. Fill metadata, screenshots (6.7" and 6.1" required)
5. Submit for review

---

## 5. Flutter Native Splash (one-time)

```bash
dart run flutter_native_splash:create
```

Add `assets/images/splash_logo.png` (1242×2688 px recommended) and update `pubspec.yaml`:
```yaml
flutter_native_splash:
  image: assets/images/splash_logo.png
```

---

## 6. Launcher Icons (one-time)

```bash
dart run flutter_launcher_icons
```

Add `assets/images/icon.png` (1024×1024 px, no alpha on iOS) and update `pubspec.yaml`:
```yaml
flutter_icons:
  image_path: "assets/images/icon.png"
```

---

## 7. CI/CD (GitHub Actions — optional)

```yaml
# .github/workflows/flutter.yml
name: Flutter CI
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.22.x'
      - run: flutter pub get
      - run: flutter analyze
      - run: flutter test
      - run: flutter build apk --release
```

---

## 8. Production Checklist

- [ ] Replace `google-services.json` with real Firebase config
- [ ] Replace `GoogleService-Info.plist` with real Firebase config
- [ ] Set `stripePublishableKey` to live key in `app_config.dart`
- [ ] Verify `baseUrl = 'https://mytraqq.com/api'` in `app_config.dart`
- [ ] Add app icon at `assets/images/icon.png` and run `flutter_launcher_icons`
- [ ] Add splash image at `assets/images/splash_logo.png` and run `flutter_native_splash`
- [ ] Test Stripe payment sheet end-to-end in staging
- [ ] Enable FCM in Firebase and test push notification delivery
- [ ] Add `/.well-known/apple-app-site-association` to server for Universal Links
- [ ] Add `/.well-known/assetlinks.json` to server for Android App Links
- [ ] Verify GPS permissions prompt works on both Android and iOS
- [ ] Test driver dashboard location update loop on a real device
