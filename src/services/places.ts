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
    const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ ...params, 'accept-language': 'en' });
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

// ─── OpenStreetMap Overpass API (free, no key required) ─────────────────────

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const OVERPASS_TAGS: Record<StoreType, Array<[string, string]>> = {
  supermarket: [['shop', 'supermarket'], ['shop', 'grocery'], ['shop', 'food']],
  hardware:    [['shop', 'hardware'], ['shop', 'doityourself'], ['shop', 'tools']],
  pharmacy:    [['amenity', 'pharmacy'], ['shop', 'pharmacy'], ['shop', 'chemist']],
  general:     [['shop', 'convenience'], ['shop', 'general'], ['shop', 'variety_store']],
};

export async function findNearbyStores(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters = 300
): Promise<NearbyStore[]> {
  return findNearbyStoresOverpass(lat, lng, storeType, radiusMeters);
}

async function findNearbyStoresOverpass(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters: number
): Promise<NearbyStore[]> {
  const tags = OVERPASS_TAGS[storeType];
  const nodeUnion = tags.map(([k, v]) => `node["${k}"="${v}"](around:${radiusMeters},${lat},${lng});`).join('');
  const wayUnion  = tags.map(([k, v]) => `way["${k}"="${v}"](around:${radiusMeters},${lat},${lng});`).join('');
  const query = `[out:json][timeout:10];(${nodeUnion}${wayUnion});out center;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });
    const data = await res.json();
    if (!data.elements?.length) return [];

    return (data.elements as any[]).map((el) => {
      const elLat = el.lat ?? el.center?.lat ?? lat;
      const elLng = el.lon ?? el.center?.lon ?? lng;
      const tags  = el.tags ?? {};
      const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
      return {
        placeId:  `osm-${el.id}`,
        name:     tags.name ?? tags['name:en'] ?? tags['brand'] ?? 'Unnamed Store',
        vicinity: street || tags['addr:city'] || '',
        lat:      elLat,
        lng:      elLng,
        types:    [storeType],
      };
    });
  } catch {
    return [];
  }
}

// ─── Google Places fallback (requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY) ─────
// To enable: replace findNearbyStoresOverpass with findNearbyStoresGoogle below.

const _GOOGLE_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

interface _GooglePlace {
  place_id: string; name: string; vicinity: string;
  types: string[]; geometry: { location: { lat: number; lng: number } };
}

async function findNearbyStoresGoogle(
  lat: number, lng: number, storeType: StoreType, radiusMeters: number
): Promise<NearbyStore[]> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) return [];
  const url =
    `${_GOOGLE_URL}?location=${lat},${lng}` +
    `&radius=${radiusMeters}` +
    `&type=${encodeURIComponent(STORE_TYPE_PRIMARY[storeType])}` +
    `&keyword=${encodeURIComponent(STORE_TYPE_KEYWORDS[storeType])}` +
    `&key=${key}`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return [];
    return (data.results as _GooglePlace[])
      .filter((p) => p.types?.some((t) => STORE_TYPE_PLACE_TYPES[storeType].includes(t)))
      .map((p) => ({ placeId: p.place_id, name: p.name, vicinity: p.vicinity, lat: p.geometry.location.lat, lng: p.geometry.location.lng, types: p.types }));
  } catch { return []; }
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
