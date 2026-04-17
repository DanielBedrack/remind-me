import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
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
  const storeLabel = STORE_TYPE_LABELS[item.storeType];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🛒 Nearby ${storeLabel}!`,
      body: `Don't forget: ${item.name} (×${item.quantity}) — ${storeName} is nearby.`,
      data: { itemId: item.id },
      ...(Platform.OS === 'android' && { channelId: 'store-reminders' }),
    },
    trigger: null, // fire immediately
  });
}
