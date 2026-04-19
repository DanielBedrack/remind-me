import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addItem, updateItem, removeItem, subscribeToItems } from '../services/firebase';
import { ShoppingItem, StoreType } from '../types';
import { logHistory } from './useHistory';

export function useItems(userId: string | null) {
  const [items, setItems]     = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const asyncTimer            = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref so callbacks always see the latest items without re-creating themselves
  const itemsRef              = useRef<ShoppingItem[]>(items);
  itemsRef.current            = items;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const unsub = subscribeToItems(userId, (updated) => {
      setItems(updated);
      setLoading(false);
      // Debounce AsyncStorage write — don't block UI on every snapshot
      if (asyncTimer.current) clearTimeout(asyncTimer.current);
      asyncTimer.current = setTimeout(() => {
        AsyncStorage.setItem('shopping_items', JSON.stringify(updated)).catch(() => {});
      }, 300);
    });
    return () => { unsub(); if (asyncTimer.current) clearTimeout(asyncTimer.current); };
  }, [userId]);

  const add = useCallback(async (name: string, quantity: number, storeType: StoreType, storeName?: string) => {
    if (!userId) throw new Error('Not signed in yet — please wait a moment and try again.');
    const existing = itemsRef.current.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      const newQty = existing.quantity + quantity;
      await updateItem(existing.id, { quantity: newQty });
      await logHistory({ action: 'updated', itemName: existing.name, storeType: existing.storeType, storeName: existing.storeName, qty: newQty });
    } else {
      await addItem(userId, { name: name.trim(), quantity, storeType, storeName });
      await logHistory({ action: 'added', itemName: name.trim(), storeType, storeName, qty: quantity });
    }
  }, [userId]);

  const update = useCallback(async (itemId: string, name: string, quantity: number, storeType: StoreType, storeName?: string) => {
    await updateItem(itemId, { name, quantity, storeType, storeName });
    await logHistory({ action: 'updated', itemName: name, storeType, storeName, qty: quantity });
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    const item = itemsRef.current.find((i) => i.id === itemId);
    await updateItem(itemId, { quantity });
    if (item) await logHistory({ action: 'updated', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: quantity });
  }, []);

  const remove = useCallback(async (itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    await removeItem(itemId);
    if (item) logHistory({ action: 'deleted', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: item.quantity }).catch(() => {});
  }, []);

  const collect = useCallback(async (itemId: string) => {
    const item = itemsRef.current.find((i) => i.id === itemId);
    // Fire history in background — never block removal on AsyncStorage
    if (item) logHistory({ action: 'collected', itemName: item.name, storeType: item.storeType, storeName: item.storeName, qty: item.quantity }).catch(() => {});
    await removeItem(itemId);
  }, []);

  return { items, loading, add, update, updateQuantity, remove, collect };
}
