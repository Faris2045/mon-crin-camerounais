# KONGOSSA — Build Guide (Android APK & AAB)

This guide takes you from cloning your GitHub repo to a working **APK** (for direct install / testing) and **AAB** (for the Play Store).

## Authentication (current behaviour)
- **Sign up:** username + **email** (required) + password (min. 8 chars). A 6-digit code is used to verify the email in-app (no links, no redirection).
- **Log in:** username **or** email + password.
- **No fingerprint / biometric** anymore — it was removed to avoid the crash on some devices. Security relies on password hashing (bcrypt), email verification, and a silent device identifier used only for admin fraud tracing.
- **Admin panel** (`/admin`, default `admin` / `kongossa2024`): manage accounts (full identity: username, email, phone, device id, device fingerprint, verified/suspended state), review fraud/fake-account reports, suspend or delete accounts, and moderate kongossas and alerts.

> ⚠️ **Email delivery:** real 6-digit codes are only sent once an email sending domain is configured for the project. Until then, accounts are auto-verified on signup so no one gets locked out. Configure the domain in **Cloud → Emails** to enable real code delivery.

---

## 0. Prerequisites (install once)
- **Node.js 18+** and **npm** (or **bun**)
- **Java JDK 17**
- **Android Studio** (includes the Android SDK + `sdkmanager`)
- Set `ANDROID_HOME` / `JAVA_HOME` environment variables

## 1. Clone your repo
```bash
git clone <YOUR_GITHUB_REPO_URL> kongossa
cd kongossa
```

## 2. Install dependencies
```bash
npm install
```

## 3. Build the web app
```bash
npm run build
```

## 4. Add the Android platform (first time only)
```bash
npx cap add android
```

## 5. Sync the web build into Android (run after every `npm run build`)
```bash
npx cap sync android
```

## 6a. Build a debug APK (quick install / testing)
```bash
cd android
./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`
Install on a connected phone:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## 6b. Build a release APK + AAB (for distribution / Play Store)

### Create a signing key (once)
```bash
keytool -genkey -v -keystore kongossa.keystore -alias kongossa \
  -keyalg RSA -keysize 2048 -validity 10000
```

### Register the key — `android/keystore.properties`
```
storeFile=../../kongossa.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=kongossa
keyPassword=YOUR_KEY_PASSWORD
```

### Reference it in `android/app/build.gradle`
Inside `android { ... }`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### Build the signed **APK**
```bash
cd android
./gradlew assembleRelease
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Build the signed **AAB** (Play Store)
```bash
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Updating the app later
Whenever you pull new code:
```bash
git pull
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease   # or bundleRelease
```

## Notifications
Local notifications (new comments, SOS alerts) work out of the box. For push notifications while the app is closed, connect Firebase Cloud Messaging in Android Studio and add `google-services.json` to `android/app/`.
