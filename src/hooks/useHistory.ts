import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreType } from '../types';

export interface HistoryEntry {
  id: string;
  action: 'added' | 'deleted' | 'updated' | 'collected';
  itemName: string;
  storeType: StoreType;
  storeName?: string;
  qty: number;
  timestamp: number;
}

const KEY = 'remindme_history_v1';
const MAX = 100;

export async function logHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: HistoryEntry[] = raw ? JSON.parse(raw) : [];
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...list].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      setEntries(raw ? JSON.parse(raw) : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { entries, loading, reload: load };
}
