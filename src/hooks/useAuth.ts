import { useState, useEffect } from 'react';
import { signInAnon, auth } from '../services/firebase';

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid ?? null);
      setReady(true);
    });

    signInAnon().catch(console.error);

    return unsub;
  }, []);

  return { userId, ready };
}
