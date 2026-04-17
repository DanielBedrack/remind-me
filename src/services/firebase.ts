import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ShoppingItem } from '../types';

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function signInAnon(): Promise<User> {
  const existing = auth.currentUser;
  if (existing) return existing;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function waitForUser(): Promise<User> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function addItem(
  userId: string,
  item: Omit<ShoppingItem, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const ref = await withTimeout(
    addDoc(collection(db, 'items'), {
      ...item,
      userId,
      createdAt: Date.now(),
    }),
    8000,
    'addItem'
  );
  return ref.id;
}

export async function removeItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'items', itemId));
}

export function subscribeToItems(
  userId: string,
  callback: (items: ShoppingItem[]) => void
): Unsubscribe {
  const q = query(collection(db, 'items'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const items: ShoppingItem[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ShoppingItem, 'id'>),
    }));
    callback(items.sort((a, b) => b.createdAt - a.createdAt));
  });
}
