import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addItem, updateItem, removeItem, subscribeToItems } from '../services/firebase';
import { ShoppingItem, StoreType } from '../types';

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
  }

  async function update(itemId: string, name: string, quantity: number, storeType: StoreType, storeName?: string) {
    await updateItem(itemId, { name, quantity, storeType, storeName });
  }

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    await updateItem(itemId, { quantity });
  }

  async function remove(itemId: string) {
    await removeItem(itemId);
  }

  return { items, loading, add, update, updateQuantity, remove };
}
