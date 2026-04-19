import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addItem, updateItem, removeItem, subscribeToItems } from '../services/firebase';
import { ShoppingItem, StoreType } from '../types';
import { logHistory } from './useHistory';

export function useItems(userId: string | null) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsub = subscribeToItems(userId, async (updated) => {
      setItems(updated);
      setLoading(false);
      await AsyncStorage.setItem('shopping_items', JSON.stringify(updated));
    });
    return unsub;
  }, [userId]);

  async function add(name: string, quantity: number, storeType: StoreType, storeName?: string) {
    if (!userId) throw new Error('Not signed in yet — please wait a moment and try again.');
    await addItem(userId, { name, quantity, storeType, storeName });
    await logHistory({ action: 'added', itemName: name, storeType, storeName, qty: quantity });
  }

  async function update(itemId: string, name: string, quantity: number, storeType: StoreType, storeName?: string) {
    await updateItem(itemId, { name, quantity, storeType, storeName });
    await logHistory({ action: 'updated', itemName: name, storeType, storeName, qty: quantity });
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    const item = items.find((i) => i.id === itemId);
    await updateItem(itemId, { quantity });
    if (item) await logHistory({ action: 'updated', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: quantity });
  }

  async function remove(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    await removeItem(itemId);
    if (item) await logHistory({ action: 'deleted', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: item.quantity });
  }

  async function collect(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (item) await logHistory({ action: 'collected', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: item.quantity });
    await removeItem(itemId);
  }

  return { items, loading, add, update, updateQuantity, remove, collect };
}
