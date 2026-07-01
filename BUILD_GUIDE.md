# 📱 KONGOSSA — Guide de build (APK, Release & iOS/IPA)

Ce guide explique comment générer :
- l'**APK de test** (Android)
- l'**APK/AAB de release signé** (Play Store)
- l'**app iOS / IPA** (Apple)

> Prérequis communs : Node 18+ et `bun` (ou npm), le projet cloné, puis `bun install`.

---

## 0. Préparer le projet (une seule fois)

```bash
# À la racine du projet cloné
bun install

# Ajouter les plateformes natives (si le dossier android/ ou ios/ n'existe pas encore)
bunx cap add android
bunx cap add ios        # macOS uniquement
```

À chaque modification du code web, il faut **re-builder puis synchroniser** :

```bash
bun run build           # génère /dist
bunx cap sync           # copie le web + plugins dans android/ et ios/
```

Plugins natifs déjà installés et utilisés :
`@capacitor/local-notifications`, `@capacitor/haptics`, `@capacitor/push-notifications`, `@fingerprintjs/fingerprintjs`.

---

## 1. 🤖 Android — APK de test (debug)

```bash
bun run build
bunx cap sync android
cd android
./gradlew assembleDebug
```

APK généré ici :
```
android/app/build/outputs/apk/debug/app-debug.apk
```
👉 Transférez ce fichier sur le téléphone et installez-le (autorisez « sources inconnues »).

Ou ouvrez le projet dans Android Studio et cliquez **Run ▶** :
```bash
bunx cap open android
```

---

## 2. 🤖 Android — APK / AAB de RELEASE signé (Play Store)

### a) Créer une clé de signature (une seule fois)
```bash
keytool -genkey -v -keystore kongossa.keystore \
  -alias kongossa -keyalg RSA -keysize 2048 -validity 10000
```
Conservez précieusement `kongossa.keystore` et les mots de passe.

### b) Déclarer la clé — `android/key.properties`
```properties
storePassword=VOTRE_MDP
keyPassword=VOTRE_MDP
keyAlias=kongossa
storeFile=../../kongossa.keystore
```

### c) Configurer la signature dans `android/app/build.gradle`
Dans `android { ... }`, ajoutez avant `buildTypes` :
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
```
Puis dans `buildTypes { release { ... } }` :
```gradle
signingConfig signingConfigs.release
minifyEnabled true
shrinkResources true
```

### d) Générer les fichiers de release
```bash
bun run build && bunx cap sync android
cd android

# APK signé (installation directe)
./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk

# AAB signé (à uploader sur le Google Play Store)
./gradlew bundleRelease
# -> android/app/build/outputs/bundle/release/app-release.aab
```

---

## 3. 🍎 iOS / IPA (Apple) — macOS + Xcode requis

> ⚠️ La génération d'un `.ipa` **nécessite un Mac avec Xcode** et un compte Apple Developer.

```bash
bun run build
bunx cap sync ios
bunx cap open ios     # ouvre le projet dans Xcode
```

Dans **Xcode** :
1. Sélectionnez le projet **App** → onglet **Signing & Capabilities**.
2. Choisissez votre **Team** (Apple Developer) → le signing est automatique.
3. Ajoutez les capacités **Push Notifications** et **Background Modes → Remote notifications** (si vous activez le push serveur).
4. Menu **Product → Archive**.
5. Dans l'Organizer : **Distribute App** → **App Store Connect** (publication) ou **Ad Hoc / Development** (fichier `.ipa` à installer).

L'export produit un fichier **`Kongossa.ipa`**.

---

## 4. 🔔 À propos des notifications (comme WhatsApp, app fermée)

- **Notifications locales + vibration/son** (nouveau commentaire, réponse, alerte SOS proche) :
  ✅ déjà intégrées via `@capacitor/local-notifications` + `@capacitor/haptics`.
  Elles fonctionnent **quand l'app tourne** (premier plan ou arrière-plan récent).

- **Notifications PUSH quand l'app est totalement fermée** :
  nécessitent un service serveur de push.
  - Android → **Firebase Cloud Messaging (FCM)** : ajoutez `google-services.json` dans `android/app/`.
  - iOS → **APNs (Apple Push Notification service)** : clé `.p8` depuis le portail Apple Developer.
  Le plugin `@capacitor/push-notifications` est **déjà installé** ; il ne reste qu'à fournir ces
  fichiers de configuration et une petite fonction serveur pour émettre les push.

---

## 5. 🔐 Sécurité & anti-fraude (résumé technique)

- **Empreinte matérielle open-source** (FingerprintJS) générée à l'inscription et stockée avec
  l'identité (`identity_traces.fingerprint`) — usage réservé aux autorités en cas de fraude/abus.
- **Anti-doublon** géré côté serveur (`verify-otp`) :
  - même numéro déjà utilisé sur un **autre appareil** → inscription bloquée ;
  - même appareil déjà lié à un **autre numéro** → inscription bloquée ;
  - même numéro + même appareil → reconnu comme retour légitime.
- **Vérification du numéro** par code OTP (WhatsApp/SMS).

---

## 6. ⚡ Commande rapide (rappel)

```bash
bun run build && bunx cap sync
# Android debug
cd android && ./gradlew assembleDebug
# Android release (AAB)
cd android && ./gradlew bundleRelease
# iOS
bunx cap open ios   # puis Product > Archive dans Xcode
```
