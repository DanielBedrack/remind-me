import { Platform } from 'react-native';
import { ShoppingItem, StoreType } from '../types';
import { findNearbyStores, haversineDistanceMeters } from './places';
import { sendBundledNotification } from './notifications';

export const LOCATION_TASK_NAME = 'background-location-task';

const NOTIF_STATE_KEY  = 'notif_state_v3';
const DAILY_COUNT_KEY  = 'notif_daily_count';
const MAX_PER_DAY      = 2;
const MIN_GAP_MS       = 4 * 60 * 60 * 1000; // 4 hours

const CRITICAL_ITEMS = new Set([
  'milk', 'bread', 'eggs', 'aspirin', 'ibuprofen', 'paracetamol', 'bandages',
  'חלב', 'לחם', 'ביצים', 'אספירין', 'איבופרופן', 'פרצטמול', 'תחבושות',
]);

interface StoreNotifState {
  insidePlaceId: string | null;
  notifiedAt: number;
}

interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
  lastNotifAt: number;
}

async function getAS() {
  const mod = await import('@react-native-async-storage/async-storage');
  return mod.default;
}

async function loadNotifState(): Promise<Record<string, StoreNotifState>> {
  try {
    const AS = await getAS();
    const raw = await AS.getItem(NOTIF_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveNotifState(state: Record<string, StoreNotifState>): Promise<void> {
  try {
    const AS = await getAS();
    await AS.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
  } catch {}
}

async function loadDailyCount(): Promise<DailyCount> {
  try {
    const AS = await getAS();
    const raw = await AS.getItem(DAILY_COUNT_KEY);
    if (raw) {
      const d: DailyCount = JSON.parse(raw);
      const today = new Date().toISOString().slice(0, 10);
      if (d.date === today) return d;
    }
  } catch {}
  return { date: new Date().toISOString().slice(0, 10), count: 0, lastNotifAt: 0 };
}

async function saveDailyCount(d: DailyCount): Promise<void> {
  try {
    const AS = await getAS();
    await AS.setItem(DAILY_COUNT_KEY, JSON.stringify(d));
  } catch {}
}

function isCritical(item: ShoppingItem): boolean {
  return CRITICAL_ITEMS.has(item.name.toLowerCase().trim());
}

async function getUserRadius(): Promise<number> {
  try {
    const AS = await getAS();
    const raw = await AS.getItem('user_radius');
    return raw ? parseInt(raw, 10) : 300;
  } catch { return 300; }
}

export async function checkNearbyStoresAndNotify(
  latitude: number,
  longitude: number
): Promise<void> {
  const AS = await getAS();
  const raw = await AS.getItem('shopping_items');
  if (!raw) return;
  const items: ShoppingItem[] = JSON.parse(raw);
  if (!items.length) return;

  const userRadius = await getUserRadius();
  const daily = await loadDailyCount();
  const state = await loadNotifState();

  const now = Date.now();
  const byType = new Map<StoreType, ShoppingItem[]>();
  for (const item of items) {
    const list = byType.get(item.storeType) ?? [];
    list.push(item);
    byType.set(item.storeType, list);
  }

  let stateChanged = false;
  let dailyChanged = false;

  for (const [storeType, typeItems] of byType) {
    const stores = await findNearbyStores(latitude, longitude, storeType, userRadius);
    const nearest = stores[0] ?? null;

    if (!nearest) {
      // Mark store type as outside radius
      const key = storeType as string;
      if (state[key]?.insidePlaceId) {
        state[key] = { insidePlaceId: null, notifiedAt: state[key].notifiedAt };
        stateChanged = true;
      }
      continue;
    }

    const distanceM = haversineDistanceMeters(latitude, longitude, nearest.lat, nearest.lng);

    // Radius-aware strictness: >800m needs ≥3 items
    if (distanceM > 800 && typeItems.length < 3) continue;

    const key = storeType;
    const prev: StoreNotifState = state[key] ?? { insidePlaceId: null, notifiedAt: 0 };
    const isNewEntry      = prev.insidePlaceId !== nearest.placeId;

    if (!isNewEntry) continue; // already notified for this store

    // Determine which items qualify
    const criticalItems = typeItems.filter(isCritical);
    const allItems      = typeItems;

    const hasCritical = criticalItems.length > 0;
    const hasEnough   = allItems.length >= 2;

    if (!hasCritical && !hasEnough) continue;

    // Anti-spam (critical items bypass daily limit but still respect 4h gap)
    const gapOk = (now - daily.lastNotifAt) >= MIN_GAP_MS || daily.lastNotifAt === 0;
    if (!gapOk) continue;
    if (!hasCritical && daily.count >= MAX_PER_DAY) continue;

    const priority: 'high' | 'medium' = hasCritical || distanceM < 200 ? 'high' : 'medium';
    const itemsToSend = hasCritical && !hasEnough ? criticalItems : allItems;

    await sendBundledNotification(nearest.name, storeType, itemsToSend, distanceM, priority);

    state[key] = { insidePlaceId: nearest.placeId, notifiedAt: now };
    stateChanged = true;

    daily.count += 1;
    daily.lastNotifAt = now;
    dailyChanged = true;
  }

  // Clean up stale keys
  const activeTypes = new Set(items.map((i) => i.storeType as string));
  for (const key of Object.keys(state)) {
    if (!activeTypes.has(key)) { delete state[key]; stateChanged = true; }
  }

  if (stateChanged) await saveNotifState(state);
  if (dailyChanged) await saveDailyCount(daily);
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
    pausesUpdatesAutomatically: true,
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
