# RemindMe — Setup Guide

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli eas-cli`
- Expo Go app on your phone (for development), or a simulator/emulator
- A Firebase project
- A Google Cloud project with Places API enabled

---

## 1. Install dependencies

```bash
npm install
```

---

## 2. Firebase setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Enable **Authentication** → Sign-in method → **Anonymous** → Enable
3. Enable **Firestore Database** → Start in production mode
4. Add Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /items/{itemId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

5. Go to **Project Settings** → **Your apps** → Add a **Web app** → copy the config object
6. Open `src/services/firebase.ts` and replace the `firebaseConfig` object with your values

---

## 3. Google Places API setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable **Places API (legacy)** under APIs & Services
4. Create an API key: **Credentials** → **Create Credentials** → **API key**
5. (Recommended) Restrict the key to the Places API and your app's bundle ID
6. Open `src/services/places.ts` and replace `YOUR_GOOGLE_PLACES_API_KEY`

---

## 4. Update app identifiers

In `app.json`, replace:
- `com.yourname.remindme` (iOS `bundleIdentifier` and Android `package`) with your actual reverse-domain identifier

---

## 5. Run in development

```bash
# Start Expo dev server
npx expo start

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

Scan the QR code with **Expo Go** to test on a physical device.

> **Note:** Background location tracking requires a **physical device** — it does not work in simulators/emulators.

---

## 6. Build for production (EAS)

```bash
# Log in to Expo
eas login

# Configure the project (first time)
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

---

## Architecture overview

```
App.tsx                  — Root: auth + permissions init, navigation shell
src/
  hooks/
    useAuth.ts           — Firebase anonymous auth
    useItems.ts          — Firestore items CRUD + local AsyncStorage cache
  services/
    firebase.ts          — Firebase config + Firestore helpers
    places.ts            — Google Places nearby search + distance calc
    notifications.ts     — Expo push notification setup + send
    locationTask.ts      — Background location task (runs when app is closed)
  screens/
    HomeScreen.tsx       — Item list
    AddItemScreen.tsx    — Add item form (name, qty, store type)
  components/
    ItemCard.tsx         — Individual item row
  types/
    index.ts             — Shared TypeScript types
```

## How it works

1. On startup the app signs in anonymously to Firebase and requests location + notification permissions.
2. A background location task (`expo-task-manager`) starts and wakes up every ~50 metres of movement.
3. On each wake-up it reads the cached item list from AsyncStorage, groups items by store type, calls the Google Places API for each store type, and fires a push notification if a matching store is within 300 m.
4. A 30-minute per-item cooldown prevents notification spam.
5. Items are persisted in Firestore and synced in real-time via `onSnapshot`.
