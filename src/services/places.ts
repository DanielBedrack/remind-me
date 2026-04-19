import { NearbyStore, StoreType, STORE_TYPE_PRIMARY, STORE_TYPE_KEYWORDS, STORE_TYPE_PLACE_TYPES } from '../types';

// ─── Address autocomplete (OpenStreetMap Nominatim — free, no key) ────────────

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

export interface CountrySuggestion {
  name: string;
  code: string; // ISO 3166-1 alpha-2
}

// Curated list — covers most common cases; fallback to Nominatim for unknown queries
const COUNTRIES: CountrySuggestion[] = [
  { name: 'Israel', code: 'il' },
  { name: 'United States', code: 'us' },
  { name: 'United Kingdom', code: 'gb' },
  { name: 'Germany', code: 'de' },
  { name: 'France', code: 'fr' },
  { name: 'Italy', code: 'it' },
  { name: 'Spain', code: 'es' },
  { name: 'Netherlands', code: 'nl' },
  { name: 'Belgium', code: 'be' },
  { name: 'Switzerland', code: 'ch' },
  { name: 'Austria', code: 'at' },
  { name: 'Sweden', code: 'se' },
  { name: 'Norway', code: 'no' },
  { name: 'Denmark', code: 'dk' },
  { name: 'Finland', code: 'fi' },
  { name: 'Poland', code: 'pl' },
  { name: 'Russia', code: 'ru' },
  { name: 'Ukraine', code: 'ua' },
  { name: 'Turkey', code: 'tr' },
  { name: 'Canada', code: 'ca' },
  { name: 'Australia', code: 'au' },
  { name: 'New Zealand', code: 'nz' },
  { name: 'Japan', code: 'jp' },
  { name: 'South Korea', code: 'kr' },
  { name: 'China', code: 'cn' },
  { name: 'India', code: 'in' },
  { name: 'Brazil', code: 'br' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Mexico', code: 'mx' },
  { name: 'South Africa', code: 'za' },
  { name: 'Egypt', code: 'eg' },
  { name: 'Jordan', code: 'jo' },
  { name: 'UAE', code: 'ae' },
  { name: 'Saudi Arabia', code: 'sa' },
  { name: 'Portugal', code: 'pt' },
  { name: 'Greece', code: 'gr' },
  { name: 'Czech Republic', code: 'cz' },
  { name: 'Hungary', code: 'hu' },
  { name: 'Romania', code: 'ro' },
  { name: 'Singapore', code: 'sg' },
];

export function searchCountries(query: string): CountrySuggestion[] {
  if (!query.trim()) return COUNTRIES.slice(0, 8);
  const q = query.trim().toLowerCase();
  return COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q));
}

// Session-scoped cache — same query returns instantly on second call
const _nominatimCache = new Map<string, AddressSuggestion[]>();

async function nominatim(params: Record<string, string>, mapper: (r: { display_name: string; lat: string; lon: string }) => AddressSuggestion): Promise<AddressSuggestion[]> {
  const key = JSON.stringify(params);
  if (_nominatimCache.has(key)) return _nominatimCache.get(key)!;
  try {
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams(params);
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'RemindMe-App/1.0' } });
    const data: Array<{ display_name: string; lat: string; lon: string }> = await res.json();
    const results = data.map(mapper);
    _nominatimCache.set(key, results);
    return results;
  } catch { return []; }
}

export async function searchCities(query: string, countryCode: string): Promise<AddressSuggestion[]> {
  if (!query.trim() || query.trim().length < 2) return [];
  const params: Record<string, string> = { q: query, format: 'json', limit: '6', featuretype: 'city' };
  if (countryCode) params.countrycodes = countryCode;
  return nominatim(params, (r) => ({ displayName: r.display_name.split(',')[0].trim(), lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
}

export async function searchAddress(query: string, countryCode?: string, city?: string): Promise<AddressSuggestion[]> {
  if (!query.trim() || query.trim().length < 3) return [];
  const q = city ? `${query}, ${city}` : query;
  const params: Record<string, string> = { q, format: 'json', limit: '6', addressdetails: '1' };
  if (countryCode) params.countrycodes = countryCode;
  return nominatim(params, (r) => ({ displayName: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) }));
}

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
