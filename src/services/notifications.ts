import { Platform } from 'react-native';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';

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

export async function sendStoreNotification(
  item: ShoppingItem,
  storeName: string
): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await import('expo-notifications');
  const storeLabel = STORE_TYPE_LABELS[item.storeType];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🛒 Nearby ${storeLabel}!`,
      body: `Don't forget: ${item.name} (×${item.quantity}) — ${storeName} is nearby.`,
      data: { itemId: item.id },
      ...(Platform.OS === 'android' && { channelId: 'store-reminders' }),
    },
    trigger: null,
  });
}
