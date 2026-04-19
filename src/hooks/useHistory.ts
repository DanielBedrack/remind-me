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

// In-memory cache — avoids AsyncStorage read on every logHistory call
let _cache: HistoryEntry[] | null = null;

async function getCache(): Promise<HistoryEntry[]> {
  if (_cache !== null) return _cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch { _cache = []; }
  return _cache!;
}

export async function logHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const list = await getCache();
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    _cache = [newEntry, ...list].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(_cache));
  } catch {}
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await getCache();
    setEntries([...list]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { entries, loading, reload: load };
}
