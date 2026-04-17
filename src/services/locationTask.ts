import { Platform } from 'react-native';
import { ShoppingItem } from '../types';
import { findNearbyStores } from './places';
import { sendStoreNotification } from './notifications';

export const LOCATION_TASK_NAME = 'background-location-task';

const NOTIF_STATE_KEY = 'notif_state_v2';

interface ItemNotifState {
  insideRadius: boolean;
  lastPlaceId: string | null;
  notifiedAt: number;
}

async function getAsyncStorage() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

async function loadNotifState(): Promise<Record<string, ItemNotifState>> {
  try {
    const AS = await getAsyncStorage();
    const raw = await AS.getItem(NOTIF_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveNotifState(state: Record<string, ItemNotifState>): Promise<void> {
  const AS = await getAsyncStorage();
  await AS.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
}

export async function checkNearbyStoresAndNotify(
  latitude: number,
  longitude: number
): Promise<void> {
  const AS = await getAsyncStorage();
  const raw = await AS.getItem('shopping_items');
  if (!raw) return;
  const items: ShoppingItem[] = JSON.parse(raw);
  if (!items.length) return;

  const state = await loadNotifState();

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
        if (prev.insideRadius) {
          state[item.id] = { insideRadius: false, lastPlaceId: null, notifiedAt: prev.notifiedAt };
          stateChanged = true;
        }
        continue;
      }

      const isNewEntry = !prev.insideRadius;
      const isDifferentStore = prev.lastPlaceId !== nearestPlaceId;

      if (isNewEntry || isDifferentStore) {
        await sendStoreNotification(item, nearestName);
        state[item.id] = {
          insideRadius: true,
          lastPlaceId: nearestPlaceId,
          notifiedAt: Date.now(),
        };
        stateChanged = true;
      }
    }
  }

  for (const itemId of Object.keys(state)) {
    if (!items.find((i) => i.id === itemId)) {
      delete state[itemId];
      stateChanged = true;
    }
  }

  if (stateChanged) await saveNotifState(state);
}

export async function runForegroundCheck(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Location = await import('expo-location');
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await checkNearbyStoresAndNotify(loc.coords.latitude, loc.coords.longitude);
  } catch {
    // Silently skip if location unavailable
  }
}

export async function startLocationTracking(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Location = await import('expo-location');
  const TaskManager = await import('expo-task-manager');

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') throw new Error('Foreground location permission denied');

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  if (bg !== 'granted') throw new Error('Background location permission denied');

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (already) return;

  // Define the task right before starting (safe on native, never runs on web)
  if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
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
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100,
    deferredUpdatesInterval: 90_000,
    deferredUpdatesDistance: 100,
    pausesLocationsUpdatesAutomatically: true,
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
  if (Platform.OS === 'web') return;
  const Location = await import('expo-location');
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
}
