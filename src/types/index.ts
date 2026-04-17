export type StoreType = 'supermarket' | 'hardware' | 'pharmacy' | 'general';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  storeType: StoreType;
  storeName?: string;
  userId: string;
  createdAt: number;
  /** placeId of the store that last triggered a notification for this item */
  lastNotifiedPlaceId?: string;
  /** timestamp of last notification */
  lastNotifiedAt?: number;
}

export interface NearbyStore {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  types: string[];
}

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  supermarket: 'Supermarket',
  hardware: 'Hardware Store',
  pharmacy: 'Pharmacy',
  general: 'General Store',
};

/**
 * Primary Google Places `type` used for the nearby search.
 * The Places API only accepts one `type` param per request, so we pick the
 * most specific one and rely on `keyword` for broader matching (see places.ts).
 */
export const STORE_TYPE_PRIMARY: Record<StoreType, string> = {
  supermarket: 'supermarket',
  hardware: 'hardware_store',
  pharmacy: 'pharmacy',
  general: 'store',
};

/**
 * Supplemental keywords sent alongside the Places search so the API matches
 * a wider variety of real-world store names without extra API calls.
 */
export const STORE_TYPE_KEYWORDS: Record<StoreType, string> = {
  supermarket: 'grocery supermarket food market',
  hardware: 'hardware tools DIY building supplies',
  pharmacy: 'pharmacy chemist drugstore medicine',
  general: 'convenience general store mini market',
};

/**
 * All Google Places types that are considered a match for each category.
 * Used client-side to validate results returned by the API.
 */
export const STORE_TYPE_PLACE_TYPES: Record<StoreType, string[]> = {
  supermarket: [
    'supermarket',
    'grocery_or_supermarket',
    'food',
    'store',
  ],
  hardware: [
    'hardware_store',
    'home_goods_store',
    'store',
  ],
  pharmacy: [
    'pharmacy',
    'drugstore',
    'health',
    'store',
  ],
  general: [
    'convenience_store',
    'department_store',
    'shopping_mall',
    'store',
    'point_of_interest',
  ],
};
