# Suwan's FundManager

<div align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Suwan's FundManager Logo" style="border-radius: 28px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);" />
  <h3>High-Performance, Offline-First Personal Finance System</h3>
  <p>Universal React Native & Expo Mobile Client with Microsoft Azure App Service Backend & MongoDB Atlas Cloud Sync</p>

  <p>
    <a href="https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/download/apk"><img src="https://img.shields.io/badge/Direct_APK-Download_Latest-10b981?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" /></a>
    <a href="https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net"><img src="https://img.shields.io/badge/Azure_App_Service-Production_API-0078d4?style=for-the-badge&logo=microsoftazure&logoColor=white" alt="Azure API" /></a>
    <a href="https://github.com/suwandhital/fundmanager/releases/latest"><img src="https://img.shields.io/badge/GitHub-Releases-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Releases" /></a>
  </p>
</div>

---

## Overview

**Suwan's FundManager** is a luxury, precision personal money manager designed from the ground up for mobile speed, high-resolution aesthetic clarity, and total data reliability. Built with **React Native 0.88** and **Expo SDK 58**, the app delivers:

- **100% Offline-First Architecture**: Perform full transaction CRUD, view real-time SVG charts, and switch periods instantly without waiting for a network handshake.
- **Biometric Security**: Unlock securely in 0ms using device-native Fingerprint, Face ID, or passkey via `expo-local-authentication`.
- **Two-Way Cloud Sync**: Seamless synchronization with **MongoDB Atlas Cloud** (`Cluster0`) with automatic last-write-wins conflict resolution based on transaction timestamps.
- **Self-Hosted Over-The-Air (OTA) Updates**: In-app continuous updates delivered directly from **Microsoft Azure App Service** using Expo Updates Protocol v1 (`multipart/mixed`) without requiring third-party cloud subscriptions.
- **Zero-Flicker Cold Start**: Native splash coordination that guarantees full rasterization of theme tokens, authentication state, and cached transaction data before dismissal.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUWAN'S FUNDMANAGER APPLICATION                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     CLIENT APPLICATION        │             │      AZURE CLOUD SERVICE      │
│  (Expo SDK 58 / React Native) │             │ (Linux App Service / Node 22) │
├───────────────────────────────┤             ├───────────────────────────────┤
│ • Hermes Bytecode Engine      │             │ • Express 5 REST Endpoints    │
│ • SecureStore (AES-256)       │    HTTPS    │ • Mongoose ODM v8             │
│ • Local Biometrics (Face/Bio) │◄───────────►│ • Self-Hosted OTA Protocol v1 │
│ • AsyncStorage Cache          │ (REST + OTA)│ • Static Web Landing Portal   │
│ • React Native SVG Charts     │             │ • Direct APK Distribution     │
└───────────────────────────────┘             └───────────────────────────────┘
                                                              │
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │      MONGODB ATLAS CLOUD      │
                                              │ (cluster0.pbap0ap.mongodb.net)│
                                              ├───────────────────────────────┤
                                              │ • Users Collection            │
                                              │ • Transactions Collection     │
                                              │ • Compound Indexes & TTL      │
                                              └───────────────────────────────┘
```

---

## Core Features

### 1. Ultra-HD Visual Identity & Zero-Glitter Launch
- **4x Supersampled Vector Assets**: All launcher icons (`assets/icon.png`, `android-icon-foreground.png`, `splash-icon.png`) are generated at 4096×4096 resolution and downscaled using high-precision Lanczos interpolation.
- **Seamless Splash Transition**: Coordinates splash screen dismissal with `isAuthLoading`, `isThemeLoaded`, and `isTxLoading` so the app reveals fully loaded balance figures and graphs without blank frames or flashing numbers.
- **Dynamic Theming**: True dark (`#090d16`) and light modes with immediate persistent caching and status bar synchronization.

### 2. Intelligent Cloud Synchronization
- **Public Cloud Default**: The client universally connects to the Azure production API (`https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net`), completely removing private LAN or localhost restrictions.
- **Dual Identifier Matching**: Synchronizes transactions via both `userId` and `userEmail`, ensuring that transactions recorded while offline are never orphaned upon cloud registration.
- **Manual & Real-Time Sync**: Background auto-sync triggers on save and delete, while the header refresh button initiates a full two-way merge.

### 3. Financial Analytics & Gesture Controls
- **Dual Metric Balance Card**: Real-time Total Balance (in `NRS ` with `en-IN` numbering), active period indicator, and separate income/expense metric chips.
- **Interactive SVG Charting**: Renders dual area & line graphs across `Day` (24 hourly buckets), `Week` (Mon–Sun), `Month` (weekly intervals), and `Year` (12 months).
- **Date Scrubbing**: Drag across chart horizontal segments to instantly filter transaction lists by date range.

### 4. Non-Intrusive Sheet & Keyboard Handling
- **Responsive Keyboard Avoiding**: All input sheets (`TransactionSheet`, `ProfileSheet`) dynamically adjust padding with `KeyboardAvoidingView` to prevent soft keyboards from obscuring inputs.
- **Color-Shifting CRUD**: Sheet headers, handles, and currency badges dynamically adapt colors based on transaction type (Emerald `#22c55e` for Income, Crimson `#ef4444` for Expense).

---

## Production Cloud Endpoints

The backend is deployed and continuously delivered on **Microsoft Azure App Service**:

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/health` | `GET` | Service health status and ISO timestamp |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/auth/register` | `POST` | User registration (persisted to MongoDB Atlas) |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/auth/login` | `POST` | User authentication & JWT token generation |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/auth/profile` | `PUT/POST` | Profile and credential updates |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/transactions` | `GET` | Retrieve transactions for user by `userId` or `email` |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/transactions/:txId` | `DELETE`| Remove transaction from cloud database |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/sync` | `POST` | Batch upsert and synchronize transactions |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/manifest` | `GET` | Self-hosted Expo Updates Protocol v1 manifest server |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/api/assets` | `GET` | Distribute Over-The-Air bundle assets and Hermes bytecode |
| `https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net/download/apk` | `GET` | Direct standalone Android APK download |

---

## Project Structure

```
fundmanager/
├── .github/
│   └── workflows/
│       ├── build-apk.yml               # Automated Android standalone APK compilation
│       └── main_fundmanager-api.yml     # Automated Azure App Service CI/CD deployment
├── assets/
│   ├── icon.png                        # 1024x1024 4x supersampled launcher icon
│   ├── splash-icon.png                 # 1024x1024 transparent luxury emblem
│   ├── android-icon-foreground.png     # Android adaptive icon foreground (66% safe zone)
│   ├── android-icon-background.png     # Solid deep navy background (#090d16)
│   ├── android-icon-monochrome.png     # Android 13+ themed icon
│   └── favicon.png                     # Web browser favicon
├── server/
│   ├── index.js                        # Express 5 backend & OTA Protocol v1 server
│   ├── package.json                    # Backend dependencies (form-data, mongoose, bcrypt)
│   ├── public/                         # Public landing portal & direct APK distribution
│   └── updates/                        # Exported OTA Hermes bytecode bundles
├── src/
│   ├── components/
│   │   ├── BalanceCard.tsx             # Total balance & metric overview cards
│   │   ├── FilterBar.tsx               # Instant search & type filter chips
│   │   ├── Header.tsx                  # Profile, theme switch, and sync status
│   │   ├── LineChart.tsx               # High-performance SVG line & area charts
│   │   ├── ProfileSheet.tsx            # Profile edit, OTA updater & biometric toggle
│   │   ├── TransactionList.tsx         # FlatList with date grouping & unsynced indicators
│   │   ├── TransactionSheet.tsx        # Keyboard-avoiding CRUD modal
│   │   └── layout/MobileFrame.tsx      # Cross-platform responsive viewport
│   ├── context/
│   │   ├── AuthContext.tsx             # Authentication, biometrics & Azure cloud config
│   │   ├── ToastContext.tsx            # Floating toast notification system
│   │   └── TransactionContext.tsx      # Financial state, two-way sync & calculations
│   ├── theme/
│   │   ├── colors.ts                   # Hex color tokens (light & dark palettes)
│   │   └── ThemeContext.tsx            # Persistent theme provider
│   ├── types/
│   │   └── index.ts                    # TypeScript interfaces & types
│   └── utils/
│       ├── crypto.ts                   # UUID generation & password hashing
│       ├── formatters.ts               # Currency (NRS), locale (en-IN), dates & times
│       └── sampleData.ts               # Sample transaction seeder
├── App.tsx                             # Application root with splash coordination
├── app.json                            # Expo SDK 58 application manifest & plugins
├── eas.json                            # EAS build configuration
└── package.json                        # Root client dependencies
```

---

## Local Development

### 1. Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm** or **bun**
- **Java 17 (JDK)** (if compiling Android APK locally)

### 2. Install Dependencies
```bash
# Install client dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..
```

### 3. Run Client Application
```bash
# Start Metro bundler
npx expo start

# Run on Android emulator / device
npx expo run:android

# Run on Web browser
npx expo start --web
```

### 4. Verification & Diagnostics
```bash
# TypeScript verification
npx tsc --noEmit

# ESLint code quality check
npx expo lint

# Expo SDK 58 dependency diagnostics
npx expo-doctor
```

---

## Building & Deploying

### Exporting Self-Hosted OTA Updates
To publish an Over-The-Air Hermes update directly to Azure without third-party fees:
```bash
EXPO_PUBLIC_API_URL=https://fundmanager-api-aphxbabxdvd2g5a0.uaenorth-01.azurewebsites.net \
npx expo export -p android --output-dir server/updates/1.0.0
```
Then commit and push to `main` — GitHub Actions will automatically deploy the updated bundle to Azure App Service.

### Building Standalone Android APK
Standalone APKs can be built automatically via GitHub Actions:
1. Navigate to **Actions** → **Build Android APK**.
2. Trigger **Run workflow** or push a git tag (e.g. `git tag v1.0.2 && git push origin v1.0.2`).
3. Download the signed APK directly from GitHub Releases or from the Azure API portal at `/download/apk`.

---

## License

This project is licensed under the [MIT License](LICENSE).
