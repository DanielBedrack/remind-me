import { createContext, useContext } from 'react';
import { ShoppingItem, StoreType } from '../types';

export interface ItemsContextValue {
  items: ShoppingItem[];
  loading: boolean;
  add: (name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
  update: (id: string, name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
  updateQuantity: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => void;
  collect: (id: string) => Promise<void>;
}

export const ItemsContext = createContext<ItemsContextValue | null>(null);

export function useItemsContext(): ItemsContextValue {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItemsContext must be used inside ItemsContext.Provider');
  return ctx;
}
