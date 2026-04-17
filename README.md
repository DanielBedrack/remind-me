# RemindMe

A React Native mobile app that reminds you about your shopping list when you're near the right store.

## Features

- Add items with a name, quantity, and store type
- Background location tracking detects when you're within 300m of a relevant store
- Push notification fires with the item name and store
- Smart entry/exit logic — only notifies on entry, resets when you leave
- Firebase Firestore backend with real-time sync
- Common product chips per store category for quick input

## Store Types

| Type | Matched Stores |
|---|---|
| Supermarket | Grocery stores, supermarkets |
| Hardware | Hardware stores, home goods |
| Pharmacy | Pharmacies, drugstores |
| General | Convenience stores, department stores |

## Tech Stack

- [Expo](https://expo.dev) (React Native)
- [Firebase](https://firebase.google.com) — Anonymous Auth + Firestore
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/) — background location task
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — push notifications
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service) — nearby store lookup (demo mode by default)
- React Navigation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

In your Firebase console:
- Enable **Anonymous Authentication**
- Create a **Firestore** database and set rules to allow reads/writes for authenticated users

### 3. Google Places API (optional)

By default the app runs in **demo mode** — a mock nearby store is always returned so the full notification flow works without API costs.

To go live, open `src/services/places.ts`, set `DEMO_MODE = false`, and add your key to `.env`:

```env
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_places_key
```

### 4. Run

```bash
npm run dev
```

Scan the QR code with **Expo Go** on your phone.

> Background location tracking requires a physical device — it does not work in simulators.

## Project Structure

```
App.tsx                        Root — auth, permissions, navigation
src/
  screens/
    HomeScreen.tsx             Item list
    AddItemScreen.tsx          Add item form with product chips
  components/
    ItemCard.tsx               Individual item row
  hooks/
    useAuth.ts                 Firebase anonymous auth
    useItems.ts                Firestore CRUD + AsyncStorage cache
  services/
    firebase.ts                Firebase config + helpers
    places.ts                  Google Places nearby search
    locationTask.ts            Background location + notification logic
    notifications.ts           Push notification setup
  types/
    index.ts                   Shared TypeScript types
```

## License

MIT
