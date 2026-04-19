# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start Expo dev server (scan QR with Expo Go)
npm run android        # Start with Android emulator
npm run ios            # Start with iOS simulator
npm run export:web     # Build web bundle → dist/ (runs post-build.js)
npm run deploy         # export:web + gh-pages publish
```

There is no test suite. TypeScript checking: `npx tsc --noEmit`.

## Architecture

**RemindMe** is an Expo (React Native) app that notifies users when they're near a store that carries something on their shopping list. It targets iOS, Android, and web (GitHub Pages).

### Data flow

1. `useAuth` (hook) → Firebase Auth (email/password, Google, Apple, Microsoft) → `userId`
2. `useItems` (hook) → Firestore `items` collection (`where userId == uid`) → real-time sync via `onSnapshot`
3. Items are also written to `AsyncStorage` key `shopping_items` on every Firestore update — this is the source of truth for the background location task (which cannot access React state)
4. Background location task (`locationTask.ts`) reads from `AsyncStorage`, calls `findNearbyStores`, fires `sendStoreNotification` on store entry

### State management

- `ItemsContext` (in `App.tsx`) wraps the whole app, providing `{ items, loading, add, update, updateQuantity, remove, collect }` to all screens
- `LanguageProvider` wraps `ItemsContext` — it must be outermost
- No Redux or Zustand — all state is React context + hooks

### Navigation

Two-level navigation in `App.tsx`:
- Root `Stack`: `Auth` → `Main` (tab bar) | `AddItem` (modal)
- `MainTabs` bottom tab navigator: Dashboard, List, (FAB Add), History, Profile
- `BottomTabBar` is a fully custom component — do not use the default tab bar renderer

### Location + notification pipeline

`locationTask.ts` is the core of the app's value proposition:
- `startLocationTracking()` registers a background task (`background-location-task`) that fires every 100m or 90s
- `checkNearbyStoresAndNotify()` groups items by `storeType`, queries `findNearbyStores` per type (300m radius), then notifies only on **entry** (first detection) or **store change** — tracked in `AsyncStorage` key `notif_state_v2`
- `runForegroundCheck()` is called each time the app comes to foreground (`AppState` listener in `App.tsx`)
- Background tasks must never throw — all errors are silently swallowed

### Places API

`src/services/places.ts` defaults to `DEMO_MODE = true` — a fake store is always returned, so the notification flow works without Google API costs. To go live: set `DEMO_MODE = false` and add `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` to `.env`.

### i18n

`src/i18n/index.ts` initialises i18next before any component renders (imported first in `App.tsx`). Supported locales: `en`, `he`, `es`. Add new strings to all three `src/i18n/locales/*.json` files.

### Web build

`npm run export:web` runs `expo export --platform web` then `scripts/post-build.js`, which:
- Copies `web/service-worker.js` → `dist/`
- Rewrites asset paths from `/_expo/` to `./_expo/` (needed for GitHub Pages subpath `/remind-me/`)
- Injects service worker registration into `index.html`
- Creates `.nojekyll` so GitHub Pages serves the `_expo/` folder

Firebase config is hardcoded in `src/services/firebase.ts` (intentional for the web deploy — no `.env` on GitHub Pages).

### Theme

All colours come from `src/theme.ts` — import `C` for colours, `STORE_COLORS` for per-store-type accents, `productEmoji()` for item emoji lookup.
