import { Platform } from 'react-native';
import { ShoppingItem, StoreType } from '../types';

if (Platform.OS !== 'web') {
  import('expo-notifications').then((Notifications) => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = await import('expo-notifications');
  const Device = await import('expo-device');
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('store-reminders', {
      name: 'Store Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
    });
  }
  return true;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

function buildNotification(
  storeName: string,
  items: ShoppingItem[],
  distanceM: number,
  priority: 'medium' | 'high'
): { title: string; body: string } {
  const tod    = getTimeOfDay();
  const names  = items.map((i) => i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name).join(', ');
  const dist   = distanceM < 1000 ? `${Math.round(distanceM)}m` : `${(distanceM / 1000).toFixed(1)}km`;

  const emojis: Record<TimeOfDay, string> = { morning: '🌅', afternoon: '🛒', evening: '⚡' };
  const emoji = priority === 'high' ? '⚡' : emojis[tod];

  const title =
    tod === 'morning'   ? `${emoji} Morning reminder — ${storeName}` :
    tod === 'afternoon' ? `${emoji} ${storeName} is nearby!` :
    `${emoji} Don't forget — ${storeName}`;

  const body = `${names} · ${dist} away`;

  return { title, body };
}

export async function sendBundledNotification(
  storeName: string,
  storeType: StoreType,
  items: ShoppingItem[],
  distanceM: number,
  priority: 'medium' | 'high'
): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await import('expo-notifications');
  const { title, body } = buildNotification(storeName, items, distanceM, priority);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { storeType },
      ...(Platform.OS === 'android' && { channelId: 'store-reminders' }),
    },
    trigger: null,
  });
}

// Keep old single-item version for any callers that haven't migrated
export async function sendStoreNotification(item: ShoppingItem, storeName: string): Promise<void> {
  return sendBundledNotification(storeName, item.storeType, [item], 0, 'medium');
}
