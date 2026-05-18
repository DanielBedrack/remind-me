# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start Expo dev server (scan QR with Expo Go)
npm run android        # Start with Android emulator
npm run ios            # Start with iOS simulator
npm run build:ios      # EAS cloud build for iOS
npm run build:android  # EAS cloud build for Android
npm run export:web     # Build web bundle → dist/ (runs post-build.js)
npm run deploy         # export:web + gh-pages publish
```

There is no test suite. TypeScript checking: `npx tsc --noEmit`.

## Architecture

**RemindMe** is an Expo (React Native) app that notifies users when they're near a store that carries something on their shopping list. It targets iOS, Android, and web (GitHub Pages).

### Directory layout

```
src/
  components/     BottomTabBar.tsx, ItemCard.tsx
  context/        ItemsContext.tsx, LanguageContext.tsx, LocationContext.tsx
  hooks/          useAuth.ts, useItems.ts, useHistory.ts, useCurrentLocation.ts
  i18n/           index.ts + locales/en.json, he.json, es.json
  screens/        Auth, Setup, Dashboard, List, AddItem, Map, Profile, History, Home
  services/       firebase.ts, locationTask.ts, notifications.ts, places.ts, userProfile.ts
  types/          index.ts (core types), env.d.ts
  utils/          confetti.ts (native no-op), confetti.web.ts (canvas-confetti)
  theme.ts
App.tsx
scripts/post-build.js
web/service-worker.js
```

### Data flow

1. `useAuth` → Firebase Auth (email/password, Google, Apple, Microsoft) → `userId`
2. `useItems(userId)` → Firestore `items` collection (`where userId == uid`) → real-time sync via `onSnapshot`
3. Items are also written to `AsyncStorage` key `shopping_items` on every Firestore update — this is the source of truth for the background location task (which cannot access React state)
4. Background location task (`locationTask.ts`) reads `shopping_items` from `AsyncStorage`, calls `findNearbyStores`, fires `sendBundledNotification` on store entry

### State management

Provider nesting order in `App.tsx` (outermost first — **do not reorder**):

```
LanguageProvider        ← must be outermost (drives RTL)
  LocationProvider      ← GPS / IP geolocation
    ItemsContext.Provider
      NavigationContainer
```

- `ItemsContext` exposes `{ items, loading, add, update, updateQuantity, remove, collect }`
- `LocationContext` exposes `{ location, locationName, isLoading, refresh, useGPS, setUseGPS }`
- No Redux or Zustand — all state is React context + hooks

### Navigation

Two-level navigation in `App.tsx`:

```
RootStack
  Auth            (no userId)
  Setup           (userId present, setupComplete === false)
  Main            (userId + setupComplete)
    MainTabs (bottom tab navigator, custom BottomTabBar)
      Home    → DashboardScreen
      List    → ListScreen
      Add     → FAB spacer (opens AddItem modal)
      Map     → MapScreen
      Profile → ProfileScreen
    AddItem   (modal overlay — AddItemScreen)
```

`BottomTabBar` is a fully custom component — never use the default tab bar renderer.
`HistoryScreen` is not a tab; it is rendered inline inside `ProfileScreen`.
`HomeScreen.tsx` is an unused placeholder.

### Location + notification pipeline

`locationTask.ts` is the core of the app's value proposition:

- `startLocationTracking()` registers a background task (`background-location-task`) that fires every 100 m distance or 90 s (deferred), whichever comes first
- `checkNearbyStoresAndNotify()` groups items by `storeType`, queries `findNearbyStores` per type (300 m default radius), notifies only on **entry** (first detection) or **store change** — tracked in `AsyncStorage` key `notif_state_v3`
- `runForegroundCheck()` is called each time the app comes to foreground (`AppState` listener in `App.tsx`)
- **Background tasks must never throw** — all errors are silently swallowed

Anti-spam rules (in `locationTask.ts`):
- Max 2 notifications per day (`notif_daily_count` key in AsyncStorage)
- 4-hour minimum gap between notifications
- Both limits are waived for "critical items" (milk, bread, eggs, aspirin, etc. — defined in `CRITICAL_ITEMS` set)
- Distance-aware strictness: >800 m requires ≥ 3 matching items; <200 m = high priority

### Places + geocoding

`src/services/places.ts` uses **free, keyless APIs** — no Google Places:

- **Overpass API** (OSM) — primary store search; 4 mirror endpoints tried in order
- **Nominatim** (OSM) — fallback for stores + all address/city autocomplete
- `findNearbyStores(lat, lng, storeType, radiusMeters)` — single type
- `findAllNearbyStores(lat, lng, storeTypes, radiusMeters)` — batch (one Overpass call, used by MapScreen)
- Results are session-cached to avoid duplicate network calls

### i18n

`src/i18n/index.ts` initialises i18next before any component renders (imported first in `App.tsx`). Supported locales: `en`, `he`, `es`. Add new strings to **all three** `src/i18n/locales/*.json` files. Hebrew enables RTL automatically via `I18nManager.forceRTL()`.

### Web build

`npm run export:web` runs `expo export --platform web` then `scripts/post-build.js`, which:
- Copies `web/service-worker.js` → `dist/`
- Rewrites asset paths from `/_expo/` to `./_expo/` (needed for GitHub Pages subpath `/remind-me/`)
- Injects service worker registration into `index.html`
- Creates `.nojekyll` so GitHub Pages serves the `_expo/` folder

Firebase config is hardcoded in `src/services/firebase.ts` (intentional — no `.env` available on GitHub Pages).

### Theme

All colours come from `src/theme.ts`:
- Import `C` for the colour palette (dark background, blue accent, semantic colours)
- Import `STORE_COLORS` for per-store-type accent colours
- Call `productEmoji(name)` for item emoji lookup (60+ products mapped)

## Environment variables

Used in `.env` for native/local builds (not needed for the web deploy):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In (web OAuth) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In (iOS) |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google Sign-In (Android) |
| `EXPO_PUBLIC_MICROSOFT_CLIENT_ID` | Microsoft Sign-In |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Optional: store name autocomplete in AddItemScreen (falls back to a demo list if absent) |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase config (only needed if overriding the hardcoded values) |

## Core types (`src/types/index.ts`)

```ts
type StoreType = 'supermarket' | 'hardware' | 'pharmacy' | 'general'

interface ShoppingItem {
  id: string; name: string; quantity: number;
  storeType: StoreType; storeName?: string; userId: string;
  createdAt: number;
  lastNotifiedPlaceId?: string;   // dedup: last store that triggered a notification
  lastNotifiedAt?: number;
}

interface NearbyStore {
  placeId: string; name: string; vicinity: string;
  lat: number; lng: number; types: string[];
}
```

`STORE_TYPE_LABELS`, `STORE_TYPE_PRIMARY`, `STORE_TYPE_KEYWORDS`, `STORE_TYPE_PLACE_TYPES` are all exported from this file.

## Key conventions

- **Platform file variants**: `confetti.ts` (native) vs `confetti.web.ts` — Metro picks the correct one automatically. Use the same pattern for any platform-specific code.
- **History logging**: all item mutations call `logHistory()` from `src/hooks/useHistory.ts`; history is stored in AsyncStorage key `remindme_history_v1` (max 100 entries, in-memory cache).
- **AsyncStorage keys in use**: `shopping_items`, `notif_state_v3`, `notif_daily_count`, `remindme_history_v1`, `@language`, `@useGPS`
- **No default tab bar**: always pass `tabBar={(props) => <BottomTabBar {...props} />}` to `Tab.Navigator`
- **Firestore collections**: `items` (shopping items), `profiles` (user preferences + setupComplete flag)
- **Web-only APIs**: `MapScreen` uses Leaflet which only works on web; wrap any web-only imports with `Platform.OS === 'web'` checks or `.web.ts` file variants
