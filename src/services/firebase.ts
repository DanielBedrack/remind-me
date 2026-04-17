import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ShoppingItem } from '../types';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function signInAnon(): Promise<User> {
  const existing = auth.currentUser;
  if (existing) return existing;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerEmail(email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle(idToken: string, accessToken?: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const cred = await signInWithCredential(auth, credential);
  return cred.user;
}

export async function signInWithApple(idToken: string): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken });
  const cred = await signInWithCredential(auth, credential);
  return cred.user;
}

export async function signInWithMicrosoft(accessToken: string): Promise<User> {
  const provider = new OAuthProvider('microsoft.com');
  const credential = provider.credential({ accessToken });
  const cred = await signInWithCredential(auth, credential);
  return cred.user;
}

export function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export function waitForUser(): Promise<User> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { unsub(); resolve(user); }
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out — check Firestore rules and internet connection.`)), ms)
    ),
  ]);
}

// ─── Firestore ───────────────────────────────────────────────────────────────

export async function addItem(
  userId: string,
  item: Omit<ShoppingItem, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const ref = await withTimeout(
    addDoc(collection(db, 'items'), { ...item, userId, createdAt: Date.now() }),
    8000,
    'addItem'
  );
  return ref.id;
}

export async function updateItem(
  itemId: string,
  updates: Partial<Pick<ShoppingItem, 'name' | 'quantity' | 'storeType' | 'storeName'>>
): Promise<void> {
  await withTimeout(
    updateDoc(doc(db, 'items', itemId), updates),
    8000,
    'updateItem'
  );
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
