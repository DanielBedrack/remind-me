import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export const LOCATION_GPS_KEY = 'location_use_gps';

export interface LocationState {
  city:        string | null;
  street:      string | null;
  lat:         number | null;
  lng:         number | null;
  source:      'gps' | 'ip' | null;
  loading:     boolean;
  error:       string | null;
  usingGps:    boolean;
  setUsingGps: (val: boolean) => void;
  refresh:     () => void;
}

const LocationContext = createContext<LocationState | null>(null);

const _reverseCache = new Map<string, { city: string | null; street: string | null }>();
export function clearLocationCache() { _reverseCache.clear(); }

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string | null; street: string | null }> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (_reverseCache.has(key)) return _reverseCache.get(key)!;
  try {
    // zoom=16 = street level (more reliable road names than zoom=18 building level)
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1&accept-language=en`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'RemindMe-App/1.0' },
    });
    const data = await res.json();
    const addr   = data.address ?? {};
    const city   = addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? null;
    const road   = addr.road ?? addr.pedestrian ?? addr.footway ?? addr.path ?? addr.cycleway ?? addr.street ?? null;
    const number = addr.house_number ?? null;
    const street = road ? (number ? `${road} ${number}` : road) : (addr.neighbourhood ?? addr.suburb ?? addr.city_district ?? null);
    const result = { city, street };
    _reverseCache.set(key, result);
    return result;
  } catch { return { city: null, street: null }; }
}

async function getIpLocation(): Promise<{ lat: number; lng: number; city: string } | null> {
  try {
    // ipapi.co works from both browser and native (CORS-enabled, free, no key)
    const res  = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if (!data.latitude || data.error) return null;
    return { lat: data.latitude, lng: data.longitude, city: data.city ?? data.region ?? 'Unknown' };
  } catch { return null; }
}

async function readGpsPref(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const AS  = await import('@react-native-async-storage/async-storage');
    const val = await AS.default.getItem(LOCATION_GPS_KEY);
    return val === null ? true : val === 'true';
  } catch { return true; }
}

async function writeGpsPref(val: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const AS = await import('@react-native-async-storage/async-storage');
    await AS.default.setItem(LOCATION_GPS_KEY, val ? 'true' : 'false');
  } catch {}
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [city,     setCity]     = useState<string | null>(null);
  const [street,   setStreet]   = useState<string | null>(null);
  const [lat,      setLat]      = useState<number | null>(null);
  const [lng,      setLng]      = useState<number | null>(null);
  const [source,   setSource]   = useState<'gps' | 'ip' | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [usingGps, setUsingGpsState] = useState(true);
  const [tick,     setTick]     = useState(0);

  useEffect(() => {
    readGpsPref().then(setUsingGpsState);
  }, []);

  const setUsingGps = useCallback((val: boolean) => {
    setUsingGpsState(val);
    writeGpsPref(val);
    _reverseCache.clear();
    setTick((n) => n + 1);
  }, []);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      if (usingGps && Platform.OS !== 'web') {
        try {
          const Location = await import('expo-location');
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            if (cancelled) return;
            const { latitude, longitude } = pos.coords;
            setLat(latitude); setLng(longitude); setSource('gps');
            const { city: name, street: rd } = await reverseGeocode(latitude, longitude);
            if (!cancelled) { setCity(name); setStreet(rd); setLoading(false); }
            return;
          }
        } catch {}
        if (cancelled) return;
      }

      const ip = await getIpLocation();
      if (cancelled) return;
      if (ip) {
        setLat(ip.lat); setLng(ip.lng); setCity(ip.city); setStreet(null); setSource('ip');
      } else {
        setError('Could not determine location');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tick, usingGps]);

  return (
    <LocationContext.Provider value={{ city, street, lat, lng, source, loading, error, usingGps, setUsingGps, refresh }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocationContext must be used inside LocationProvider');
  return ctx;
}
