import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  return { user, userId: user?.uid ?? null, ready };
}
