# 📱 KONGOSSA — Build Android (APK) de A à Z

Ce guide part de **zéro** : cloner ton dépôt GitHub → générer l'APK installable.
(On se concentre uniquement sur **Android**. iOS = plus tard.)

---

## ⚠️ Pourquoi tes modifications n'apparaissaient pas dans l'APK

L'APK n'embarque **PAS** automatiquement ton dernier code. Deux règles :

1. Le dossier `android/` contient une **copie figée** de l'app web. Tant que tu
   ne fais pas `bun run build && npx cap sync android`, l'APK réutilise
   l'ancienne version → tes nouveautés (login/signup, empreinte…) sont invisibles.
2. Il ne doit **PAS** y avoir de `server.url` dans `capacitor.config.ts` pour une
   vraie release. Si `server.url` pointe vers l'aperçu Lovable, l'app installée
   charge le site en ligne au lieu de ton build local. ✅ Notre `capacitor.config.ts`
   n'a **aucun** `server.url` — c'est correct pour produire un vrai APK.

👉 **La bonne séquence est toujours : `git pull` → `build` → `cap sync` → `gradlew`.**

---

## 0. Prérequis (une seule fois)

- **Node 18+** et **bun** (ou npm)
- **Java JDK 17**
- **Android Studio** (fournit le SDK Android + `gradle`) — ouvre-le au moins une fois.

---

## 1. Cloner ton projet depuis GitHub

```bash
git clone https://github.com/TON_UTILISATEUR/TON_REPO.git kongossa
cd kongossa
bun install          # ou: npm install
```

> Plus tard, quand tu reviens : `git pull` puis `bun install`.

---

## 2. Ajouter la plateforme Android (une seule fois)

Si le dossier `android/` n'existe pas encore :

```bash
npx cap add android
```

S'il existe déjà, saute cette étape.

---

## 3. 🔁 Construire le web + synchroniser (À CHAQUE MODIF)

```bash
bun run build            # génère /dist avec ton dernier code
npx cap sync android     # copie /dist + plugins dans android/
```

Plugins natifs déjà inclus : `@capacitor/local-notifications`,
`@capacitor/haptics`, `@capacitor/push-notifications`, `@fingerprintjs/fingerprintjs`.

---

## 4. 🤖 APK de test (debug)

```bash
cd android
./gradlew assembleDebug
```

APK généré :
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Transfère-le sur ton téléphone et installe-le (active « sources inconnues »).

> Alternative : `npx cap open android` puis **Run ▶** dans Android Studio.

---

## 5. 🔐 APK / AAB de RELEASE signé

### a) Créer une clé (une seule fois)
```bash
keytool -genkey -v -keystore kongossa.keystore \
  -alias kongossa -keyalg RSA -keysize 2048 -validity 10000
```

### b) `android/key.properties`
```properties
storePassword=TON_MDP
keyPassword=TON_MDP
keyAlias=kongossa
storeFile=../../kongossa.keystore
```

### c) `android/app/build.gradle`, avant `buildTypes` :
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
Puis dans `buildTypes { release { ... } }` : `signingConfig signingConfigs.release`

### d) Générer
```bash
bun run build && npx cap sync android
cd android
./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # app/build/outputs/bundle/release/app-release.aab
```

---

## 6. ⚡ Aide-mémoire (copie-colle)

```bash
git pull
bun install
bun run build
npx cap sync android
cd android && ./gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 7. Déjà intégré dans l'app

- **Connexion / Inscription** : écran d'accueil avec « Créer un compte »
  (nom + numéro + code) ou « J'ai déjà un compte » (numéro + code, nom récupéré auto).
- **Empreinte matérielle** (FingerprintJS OSS) pour l'anti-fraude et le traçage autorités.
- **Notifications locales + vibration/son** (commentaires, réponses, SOS proches).
- **Commentaires différenciés par couleur** + réponse à un commentaire précis.

> Notifications quand l'app est **fermée** : nécessitent Firebase Cloud Messaging
> (`google-services.json` dans `android/app/`). Le plugin est déjà installé.
