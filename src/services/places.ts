import { NearbyStore, StoreType } from '../types';

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

// Multiple mirrors — tried in order until one succeeds (all CORS-enabled)
const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

const OVERPASS_TAGS: Record<StoreType, Array<[string, string]>> = {
  supermarket: [['shop', 'supermarket'], ['shop', 'grocery']],
  hardware:    [['shop', 'hardware'], ['shop', 'doityourself'], ['shop', 'paint'], ['shop', 'building_materials']],
  pharmacy:    [['amenity', 'pharmacy'], ['shop', 'chemist']],
  general:     [['shop', 'convenience'], ['shop', 'general']],
};

// Reverse tag lookup for classifying combined-query results
const _TAG_TO_TYPE = new Map<string, StoreType>();
for (const [type, tags] of Object.entries(OVERPASS_TAGS) as [StoreType, Array<[string,string]>][]) {
  for (const [k, v] of tags) _TAG_TO_TYPE.set(`${k}=${v}`, type);
}

function classifyTags(tags: Record<string, string>): StoreType | null {
  for (const [k, v] of Object.entries(tags)) {
    const t = _TAG_TO_TYPE.get(`${k}=${v}`);
    if (t) return t;
  }
  return null;
}

// Cache: key = "lat,lng,type,radius" (rounded to ~100m)
const _overpassCache = new Map<string, NearbyStore[]>();
const _combinedCache = new Map<string, Map<StoreType, NearbyStore[]>>();

// ─── Nominatim POI fallback (no key, CORS-safe, reliable) ───────────────────

const _NOMINATIM_AMENITY: Partial<Record<StoreType, string>> = {
  supermarket: 'supermarket',
  pharmacy:    'pharmacy',
};
const _NOMINATIM_QUERY: Record<StoreType, string> = {
  supermarket: 'supermarket',
  hardware:    'hardware store',
  pharmacy:    'pharmacy',
  general:     'convenience store',
};

async function findNearbyStoresNominatim(
  lat: number, lng: number, storeType: StoreType, radiusMeters: number
): Promise<NearbyStore[]> {
  try {
    const deg    = radiusMeters / 111_000;
    const vb     = `${lng - deg * 1.3},${lat - deg},${lng + deg * 1.3},${lat + deg}`;
    const amenity = _NOMINATIM_AMENITY[storeType];
    const url = amenity
      ? `https://nominatim.openstreetmap.org/search?amenity=${amenity}&format=json&limit=10&viewbox=${vb}&bounded=1`
      : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(_NOMINATIM_QUERY[storeType])}&format=json&limit=10&viewbox=${vb}&bounded=1`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'RemindMe-App/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    const data: any[] = await res.json();
    return data.map((el) => ({
      placeId:  `nom-${el.place_id}`,
      name:     el.display_name.split(',')[0].trim(),
      vicinity: el.display_name.split(',').slice(1, 3).join(', ').trim(),
      lat:      parseFloat(el.lat),
      lng:      parseFloat(el.lon),
      types:    [storeType],
    }));
  } catch { return []; }
}

export async function findNearbyStores(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters = 300
): Promise<NearbyStore[]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${storeType},${radiusMeters}`;
  if (_overpassCache.has(key)) return _overpassCache.get(key)!;
  let result = await findNearbyStoresOverpass(lat, lng, storeType, radiusMeters);
  if (!result.length) result = await findNearbyStoresNominatim(lat, lng, storeType, radiusMeters);
  if (result.length > 0) _overpassCache.set(key, result);
  return result;
}

/** Single Overpass call for ALL store types — use this in the map to avoid 4× calls. */
export async function findAllNearbyStores(
  lat: number,
  lng: number,
  storeTypes: StoreType[],
  radiusMeters = 800
): Promise<Map<StoreType, NearbyStore[]>> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${storeTypes.sort().join(',')},${radiusMeters}`;
  if (_combinedCache.has(key)) return _combinedCache.get(key)!;

  const deg  = radiusMeters / 111_000;
  const bbox = `${lat - deg},${lng - deg * 1.3},${lat + deg},${lng + deg * 1.3}`;
  const allTags = storeTypes.flatMap((t) => OVERPASS_TAGS[t]);
  const union   = allTags.map(([k, v]) => `node["${k}"="${v}"](${bbox});`).join('');
  const query   = `[out:json][timeout:20];(${union});out body;`;

  const data = await overpassFetch(query);
  const result = new Map<StoreType, NearbyStore[]>(storeTypes.map((t) => [t, []]));

  if (data?.elements?.length) {
    for (const el of data.elements as any[]) {
      if (el.lat == null) continue;
      const t     = el.tags ?? {};
      const type  = classifyTags(t);
      if (!type || !result.has(type)) continue;
      const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
      result.get(type)!.push({
        placeId:  `osm-${el.id}`,
        name:     t.name ?? t['name:en'] ?? t['brand'] ?? 'Unnamed Store',
        vicinity: street || t['addr:city'] || '',
        lat: el.lat, lng: el.lon,
        types: [type],
      });
    }
  }

  // Nominatim fallback for any type that got zero results from Overpass
  await Promise.all(storeTypes.map(async (t) => {
    if (result.get(t)!.length === 0) {
      const fallback = await findNearbyStoresNominatim(lat, lng, t, radiusMeters);
      if (fallback.length) result.set(t, fallback);
    }
  }));

  _combinedCache.set(key, result);
  return result;
}

async function overpassFetch(query: string): Promise<any> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(14000),
      });
      if (!res.ok) continue;
      return await res.json();
    } catch { /* try next mirror */ }
  }
  return null;
}

async function findNearbyStoresOverpass(
  lat: number,
  lng: number,
  storeType: StoreType,
  radiusMeters: number
): Promise<NearbyStore[]> {
  const tags = OVERPASS_TAGS[storeType];
  // Bounding box is faster than around: on the server side
  const deg  = radiusMeters / 111_000;
  const bbox = `${lat - deg},${lng - deg * 1.3},${lat + deg},${lng + deg * 1.3}`;
  const union = tags.map(([k, v]) => `node["${k}"="${v}"](${bbox});`).join('');
  const query = `[out:json][timeout:20];(${union});out body;`;

  const data = await overpassFetch(query);
  if (!data?.elements?.length) return [];

  return (data.elements as any[])
    .filter((el) => (el.lat ?? el.center?.lat) != null)
    .map((el) => {
      const t      = el.tags ?? {};
      const elLat  = el.lat ?? el.center?.lat;
      const elLng  = el.lon ?? el.center?.lon;
      const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
      return {
        placeId:  `osm-${el.id}`,
        name:     t.name ?? t['name:en'] ?? t['brand'] ?? 'Unnamed Store',
        vicinity: street || t['addr:city'] || '',
        lat:      elLat,
        lng:      elLng,
        types:    [storeType],
      };
    });
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
