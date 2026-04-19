import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { StoreType } from '../types';

export interface UserProfile {
  displayName: string;
  homeLocation: string;
  homeLat?: number;
  homeLng?: number;
  workLocation: string;
  workLat?: number;
  workLng?: number;
  notificationRadius: number;
  trackedStoreTypes: StoreType[];
  setupComplete: boolean;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  homeLocation: '',
  workLocation: '',
  notificationRadius: 500,
  trackedStoreTypes: ['supermarket', 'pharmacy', 'hardware', 'general'],
  setupComplete: false,
};

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'profiles', userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch { return null; }
}

export async function saveProfile(userId: string, profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'profiles', userId), profile);
}
