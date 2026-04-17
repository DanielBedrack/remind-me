import { NearbyStore, StoreType, STORE_TYPE_PRIMARY, STORE_TYPE_KEYWORDS, STORE_TYPE_PLACE_TYPES } from '../types';

// ─── DEMO MODE ───────────────────────────────────────────────────────────────
// Real Google Places calls are disabled to avoid API costs during the demo.
// Set DEMO_MODE = false and fill in GOOGLE_PLACES_API_KEY to go live.
const DEMO_MODE = true;
const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY';
const NEARBY_SEARCH_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

const DEMO_STORES: Record<StoreType, NearbyStore> = {
  supermarket: {
    placeId: 'demo-supermarket-001',
    name: 'Demo Supermarket',
    vicinity: '123 Main St',
    lat: 0, lng: 0,
    types: ['supermarket'],
  },
  hardware: {
    placeId: 'demo-hardware-001',
    name: 'Demo Hardware Store',
    vicinity: '456 Oak Ave',
    lat: 0, lng: 0,
    types: ['hardware_store'],
  },
  pharmacy: {
    placeId: 'demo-pharmacy-001',
    name: 'Demo Pharmacy',
    vicinity: '789 Pine Rd',
    lat: 0, lng: 0,
    types: ['pharmacy'],
  },
  general: {
    placeId: 'demo-general-001',
    name: 'Demo General Store',
    vicinity: '321 Elm Blvd',
    lat: 0, lng: 0,
    types: ['convenience_store'],
  },
};

/**
 * In demo mode always returns one mock store so the full notification flow
 * (entry detection, cooldown, exit reset) can be exercised without API costs.
 * Swap DEMO_MODE to false to enable real Places lookups.
 */
export async function findNearbyStores(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters = 300
): Promise<NearbyStore[]> {
  if (DEMO_MODE) {
    const mock = { ...DEMO_STORES[storeType], lat, lng };
    return [mock];
  }
  return findNearbyStoresLive(lat, lng, storeType, radiusMeters);
}

// ─── Live implementation (used when DEMO_MODE = false) ───────────────────────

interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  geometry: { location: { lat: number; lng: number } };
}

async function findNearbyStoresLive(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters: number
): Promise<NearbyStore[]> {
  const primaryType = STORE_TYPE_PRIMARY[storeType];
  const keyword = STORE_TYPE_KEYWORDS[storeType];
  const validTypes = STORE_TYPE_PLACE_TYPES[storeType];

  const url =
    `${NEARBY_SEARCH_URL}?location=${lat},${lng}` +
    `&radius=${radiusMeters}` +
    `&type=${encodeURIComponent(primaryType)}` +
    `&keyword=${encodeURIComponent(keyword)}` +
    `&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return [];
    return (data.results as GooglePlace[])
      .filter((place) => place.types?.some((t) => validTypes.includes(t)))
      .map((place) => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        types: place.types,
      }));
  } catch {
    return [];
  }
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
