import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findNearbyStores } from './places';
import { sendStoreNotification } from './notifications';
import { ShoppingItem } from '../types';

export const LOCATION_TASK_NAME = 'background-location-task';

const NOTIF_STATE_KEY = 'notif_state_v2';

/**
 * Per-item state persisted across background wakes and foreground checks.
 *
 * insideRadius: true while the user is within 300 m of a matching store.
 *   Flips to false when no matching store is found → triggers re-notify on
 *   next entry, implementing "exit and re-enter" semantics.
 *
 * lastPlaceId: which store triggered the last notification. A different
 *   nearby store (same type, different placeId) counts as a new entry.
 */
interface ItemNotifState {
  insideRadius: boolean;
  lastPlaceId: string | null;
  notifiedAt: number;
}

async function loadNotifState(): Promise<Record<string, ItemNotifState>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveNotifState(state: Record<string, ItemNotifState>): Promise<void> {
  await AsyncStorage.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
}

/**
 * Core check — shared by the background task and the foreground AppState hook.
 * Reads items from the AsyncStorage cache written by useItems.ts.
 */
export async function checkNearbyStoresAndNotify(
  latitude: number,
  longitude: number
): Promise<void> {
  const raw = await AsyncStorage.getItem('shopping_items');
  if (!raw) return;
  const items: ShoppingItem[] = JSON.parse(raw);
  if (!items.length) return;

  const state = await loadNotifState();

  // Group items by store type — one Places API call per type
  const byType = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const list = byType.get(item.storeType) ?? [];
    list.push(item);
    byType.set(item.storeType, list);
  }

  let stateChanged = false;

  for (const [storeType, typeItems] of byType) {
    const stores = await findNearbyStores(
      latitude,
      longitude,
      storeType as ShoppingItem['storeType'],
      300
    );

    const nearestPlaceId = stores[0]?.placeId ?? null;
    const nearestName = stores[0]?.name ?? '';

    for (const item of typeItems) {
      const prev: ItemNotifState = state[item.id] ?? {
        insideRadius: false,
        lastPlaceId: null,
        notifiedAt: 0,
      };

      if (nearestPlaceId === null) {
        // No store nearby — user has exited (or was never inside)
        if (prev.insideRadius) {
          state[item.id] = { insideRadius: false, lastPlaceId: null, notifiedAt: prev.notifiedAt };
          stateChanged = true;
        }
        continue;
      }

      // Store is nearby
      const isNewEntry = !prev.insideRadius;
      const isDifferentStore = prev.lastPlaceId !== nearestPlaceId;

      if (isNewEntry || isDifferentStore) {
        // Entered a (new) store's radius — fire notification
        await sendStoreNotification(item, nearestName);
        state[item.id] = {
          insideRadius: true,
          lastPlaceId: nearestPlaceId,
          notifiedAt: Date.now(),
        };
        stateChanged = true;
      }
      // else: already inside this store's radius — stay silent
    }
  }

  // Clean up state entries for items that no longer exist
  for (const itemId of Object.keys(state)) {
    if (!items.find((i) => i.id === itemId)) {
      delete state[itemId];
      stateChanged = true;
    }
  }

  if (stateChanged) await saveNotifState(state);
}

// ─── Background task definition ────────────────────────────────────────────

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) return;
  const { locations } = data ?? {};
  if (!locations?.length) return;
  const { latitude, longitude } = locations[0].coords;
  try {
    await checkNearbyStoresAndNotify(latitude, longitude);
  } catch {
    // Background tasks must never throw
  }
});

// ─── Foreground one-shot check ──────────────────────────────────────────────

/**
 * Called when the app comes to the foreground via AppState.
 * Gets the current position once and runs the same logic as the background task.
 */
export async function runForegroundCheck(): Promise<void> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await checkNearbyStoresAndNotify(loc.coords.latitude, loc.coords.longitude);
  } catch {
    // Silently skip if location unavailable in foreground
  }
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function startLocationTracking(): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') throw new Error('Foreground location permission denied');

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') throw new Error('Background location permission denied');

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (already) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    // Wake up after 100 m of movement (was 50 m) — halves wake-ups in urban areas
    distanceInterval: 100,
    // Batch updates over 90 s so the task fires at most once per 90 s even if
    // the user is moving continuously (iOS deferred updates, Android batching)
    deferredUpdatesInterval: 90_000,
    deferredUpdatesDistance: 100,
    // Let iOS suspend updates when the device is stationary (significant power saving)
    pausesLocationsUpdatesAutomatically: true,
    // Hint to iOS that this is pedestrian/vehicle navigation → better duty-cycling
    activityType: Location.ActivityType.OtherNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'RemindMe is active',
      notificationBody: 'Watching for nearby stores…',
      notificationColor: '#4A90E2',
    },
  });
}

export async function stopLocationTracking(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(
    () => false
  );
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
