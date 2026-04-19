import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocationContext } from '../context/LocationContext';
import { useItemsContext } from '../context/ItemsContext';
import { findAllNearbyStores, haversineDistanceMeters } from '../services/places';
import { C, STORE_COLORS } from '../theme';
import { NearbyStore, StoreType, STORE_TYPE_LABELS } from '../types';

interface StoreWithItems extends NearbyStore {
  storeType: StoreType;
  itemNames: string[];
  distanceM: number;
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).L) { resolve((window as any).L); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve((window as any).L);
    document.head.appendChild(script);
  });
}

// ─── Web map component ───────────────────────────────────────────────────────

function WebMap({ lat, lng, stores }: { lat: number; lng: number; stores: StoreWithItems[] }) {
  const mapRef      = useRef<any>(null);
  const leafRef     = useRef<any>(null);
  const markersRef  = useRef<any[]>([]);
  const userMarkRef = useRef<any>(null);

  // ── Init map once (lat/lng change = pan, not rebuild) ──────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !mapRef.current) return;
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 15);
      leafRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#5B9EFF;border:3px solid #fff;box-shadow:0 0 8px rgba(91,158,255,0.8)"></div>`,
        className: '', iconAnchor: [8, 8],
      });
      userMarkRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup('<b>You are here</b>');
    })();
    return () => { cancelled = true; };
  }, [lat, lng]);

  // ── Re-draw store markers when stores array changes ────────────────────────
  useEffect(() => {
    const map = leafRef.current;
    if (!map) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear old store markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const store of stores) {
      const color = STORE_COLORS[store.storeType];
      const icon  = L.divIcon({
        html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.6)"></div>`,
        className: '', iconAnchor: [9, 9],
      });
      const popup = `
        <div style="font-family:sans-serif;min-width:150px;padding:4px">
          <b style="font-size:14px">${store.name}</b><br/>
          <span style="color:#888;font-size:12px">${store.vicinity || STORE_TYPE_LABELS[store.storeType]}</span>
          <div style="margin-top:6px;font-size:12px">
            ${store.itemNames.map((n) => `<span style="display:inline-block;background:${color}22;color:${color};border-radius:4px;padding:2px 6px;margin:2px">${n}</span>`).join('')}
          </div>
          <div style="margin-top:4px;color:#aaa;font-size:11px">${store.distanceM < 1000 ? `${Math.round(store.distanceM)}m` : `${(store.distanceM / 1000).toFixed(1)}km`} away</div>
        </div>`;
      const marker = L.marker([store.lat, store.lng], { icon }).addTo(map).bindPopup(popup);
      markersRef.current.push(marker);
    }
  }, [stores]);

  function centerOnUser() {
    leafRef.current?.setView([lat, lng], 16, { animate: true });
  }

  useEffect(() => () => { leafRef.current?.remove(); leafRef.current = null; }, []);

  return (
    // position:relative + flex:1 gives the container a real pixel height on mobile
    <div style={{ position: 'relative', flex: 1 }}>
      {/* position:absolute fills the flex parent reliably on all mobile browsers */}
      <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <button
        onClick={centerOnUser}
        title="Center on my location"
        style={{
          position: 'absolute', bottom: 32, right: 12, zIndex: 1000,
          width: 44, height: 44, borderRadius: '50%' as any,
          background: '#1A1A1F', border: '1.5px solid #2A2A32',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B9EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2"  x2="12" y2="6"  />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="6"  y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Native fallback ─────────────────────────────────────────────────────────

function NativeStoreList({ stores, loading }: { stores: StoreWithItems[]; loading: boolean }) {
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={C.accent} /></View>;
  if (!stores.length) return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🗺️</Text>
      <Text style={styles.emptyTitle}>No stores found nearby</Text>
      <Text style={styles.emptySub}>Try enabling GPS or expanding your radius in Profile.</Text>
    </View>
  );
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.listContent}>
      <Text style={styles.listHint}>Stores near you that carry your items</Text>
      {stores.map((store, i) => (
        <View key={`${store.placeId}-${i}`} style={styles.storeCard}>
          <View style={[styles.storeColorBar, { backgroundColor: STORE_COLORS[store.storeType] }]} />
          <View style={styles.storeCardBody}>
            <Text style={styles.storeName}>{store.name}</Text>
            {!!store.vicinity && <Text style={styles.storeVicinity}>{store.vicinity}</Text>}
            <Text style={styles.storeDist}>
              {store.distanceM < 1000 ? `${Math.round(store.distanceM)}m away` : `${(store.distanceM / 1000).toFixed(1)}km away`}
              {' · '}{STORE_TYPE_LABELS[store.storeType]}
            </Text>
            <View style={styles.itemChips}>
              {store.itemNames.map((name) => (
                <View key={name} style={[styles.chip, { backgroundColor: STORE_COLORS[store.storeType] + '25' }]}>
                  <Text style={[styles.chipTxt, { color: STORE_COLORS[store.storeType] }]}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { lat, lng, city, loading: locLoading } = useLocationContext();
  const { items } = useItemsContext();
  const [stores,  setStores]  = useState<StoreWithItems[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!lat || !lng || !items.length) { setStores([]); return; }

    let cancelled = false;
    setFetching(true);

    (async () => {
      const storeTypes = [...new Set(items.map((i) => i.storeType))] as StoreType[];
      const allFound = await findAllNearbyStores(lat, lng, storeTypes, 800);
      const results: StoreWithItems[] = [];

      for (const [storeType, found] of allFound) {
        const itemNames = items.filter((i) => i.storeType === storeType).map((i) => i.name);
        for (const store of found) {
          const dist = haversineDistanceMeters(lat, lng, store.lat, store.lng);
          if (!results.find((r) => r.placeId === store.placeId)) {
            results.push({ ...store, storeType, itemNames, distanceM: dist });
          }
        }
      }

      results.sort((a, b) => a.distanceM - b.distanceM);
      if (!cancelled) { setStores(results); setFetching(false); }
    })();

    return () => { cancelled = true; };
  }, [lat, lng, items]);

  if (locLoading || (!lat && !lng)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingTxt}>Getting your location…</Text>
      </View>
    );
  }

  if (!lat || !lng) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons name="map-marker-off" size={48} color={C.textTertiary} />
        <Text style={styles.emptyTitle}>Location unavailable</Text>
        <Text style={styles.emptySub}>Enable location in Profile to see the map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header strip */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="map-marker" size={16} color={C.accent} />
        <Text style={styles.headerTxt} numberOfLines={1}>
          {city ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
        </Text>
        {fetching && <ActivityIndicator size="small" color={C.accent} style={{ marginLeft: 8 }} />}
        <Text style={styles.headerCount}>{stores.length} store{stores.length !== 1 ? 's' : ''}</Text>
      </View>

      {Platform.OS === 'web'
        ? <View style={{ flex: 1 }}><WebMap lat={lat} lng={lng} stores={stores} /></View>
        : <NativeStoreList stores={stores} loading={fetching} />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },
  loadingTxt:  { marginTop: 12, fontSize: 14, color: C.textSecondary },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginTop: 12, marginBottom: 6, textAlign: 'center' },
  emptySub:    { fontSize: 13, color: C.textSecondary, textAlign: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  headerTxt:   { flex: 1, fontSize: 13, color: C.textSecondary },
  headerCount: { fontSize: 12, color: C.textTertiary, fontWeight: '600' },

  listContent: { padding: 16, paddingBottom: 40 },
  listHint:    { fontSize: 12, color: C.textTertiary, marginBottom: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  storeCard:      { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12, overflow: 'hidden' },
  storeColorBar:  { width: 5 },
  storeCardBody:  { flex: 1, padding: 14, gap: 3 },
  storeName:      { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  storeVicinity:  { fontSize: 12, color: C.textSecondary },
  storeDist:      { fontSize: 12, color: C.textTertiary },
  itemChips:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip:           { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipTxt:        { fontSize: 11, fontWeight: '700' },
});
