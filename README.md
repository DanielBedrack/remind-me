# RemindMe 🛒

A smart shopping reminder app that notifies you when you're near a store that carries something on your list.

**Live demo:** https://danielbedrack.github.io/remind-me/

---

## What it does

- Add items to your shopping list and assign them to a store type (supermarket, pharmacy, hardware, general)
- The app tracks your location in the background
- When you get close to a relevant store, you get a push notification reminding you to pick up your items
- Mark items as collected, edit quantities, or delete them from anywhere in the app

## Features

- **Smart notifications** — only notified near store types that carry your items, within a configurable radius (100m–2km)
- **Location tracking** — background task checks every 100m / 90s; foreground check runs every time you open the app
- **Shopping list** — add, edit, quantity stepper, collect with confetti animation
- **History** — full log of added, edited, collected, and deleted items grouped by day
- **Profile setup** — home + work address with autocomplete (OpenStreetMap), notification radius, store type preferences
- **Profile editing** — update all setup fields anytime from the Profile tab
- **Multi-language** — English, Hebrew, Español
- **Auth** — email/password, Google, Apple (iOS), Microsoft

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51 (React Native) |
| Navigation | React Navigation (stack + bottom tabs) |
| Database | Firebase Firestore (real-time sync) |
| Auth | Firebase Auth |
| Local storage | AsyncStorage (offline cache + history) |
| Location | expo-location background task |
| Notifications | expo-notifications |
| Address search | OpenStreetMap Nominatim (free, no key) |
| Hosting | GitHub Pages |

## Running locally

```bash
npm install
npm run dev        # Expo dev server — scan QR with Expo Go
npm run android    # Android emulator
npm run ios        # iOS simulator
```

## Deploying to GitHub Pages

```bash
npm run deploy
```

Runs `expo export --platform web`, fixes asset paths for the `/remind-me/` subpath, injects a service worker, and publishes to `gh-pages`.

## Project structure

```
src/
  screens/       # AuthScreen, SetupScreen, DashboardScreen, ListScreen,
                 # HistoryScreen, ProfileScreen, AddItemScreen
  components/    # BottomTabBar, ItemCard
  hooks/         # useAuth, useItems, useHistory
  context/       # ItemsContext, LanguageContext
  services/      # firebase.ts, places.ts, userProfile.ts,
                 # notifications.ts, locationTask.ts
  utils/         # confetti.ts / confetti.web.ts
  i18n/          # en.json, he.json, es.json
  theme.ts
  types.ts
```

## Notes

- `places.ts` runs in **demo mode** by default — a fake nearby store is always returned so the full notification flow works without a Google Places API key. Set `DEMO_MODE = false` and add `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` to `.env` to go live.
- Firebase config is hardcoded in `src/services/firebase.ts` (intentional for the GitHub Pages deploy — API keys are public identifiers secured by Firestore rules).
