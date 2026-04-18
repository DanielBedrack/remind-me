import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useItemsContext } from '../context/ItemsContext';
import { useAuth } from '../hooks/useAuth';
import { C, STORE_COLORS, productEmoji } from '../theme';
import type { RootStackParamList } from '../../App';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';

export default function DashboardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items } = useItemsContext();
  const { user } = useAuth();

  const recentItems = items.slice(0, 4);
  const greeting = getGreeting();
  const displayName = user?.email?.split('@')[0] ?? 'there';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ─────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{displayName} 👋</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(displayName[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── Location card ──────────────────────────── */}
      <View style={styles.locationCard}>
        <View style={styles.locationBadge}>
          <Text style={styles.locationBadgeTxt}>DEMO</Text>
        </View>
        <View style={styles.locationRow}>
          <MaterialCommunityIcons name="map-marker" size={20} color={C.accent} />
          <Text style={styles.locationTxt}>Tel Aviv, Israel</Text>
        </View>
        <Text style={styles.locationSub}>Simulated location · Nearby stores active</Text>
        <View style={styles.locationDots}>
          {['supermarket', 'pharmacy', 'hardware'].map((t) => (
            <View key={t} style={[styles.storeDot, { backgroundColor: STORE_COLORS[t] }]} />
          ))}
          <Text style={styles.locationDotsTxt}>3 store types tracked</Text>
        </View>
      </View>

      {/* ── Quick Add ──────────────────────────────── */}
      <TouchableOpacity style={styles.quickAdd} onPress={() => nav.navigate('AddItem', {})} activeOpacity={0.8}>
        <MaterialCommunityIcons name="plus-circle-outline" size={20} color={C.accent} />
        <Text style={styles.quickAddTxt}>What do you need to buy?</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={C.textTertiary} />
      </TouchableOpacity>

      {/* ── Recent items ───────────────────────────── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Items</Text>
        <Text style={styles.sectionCount}>{items.length} total</Text>
      </View>

      {recentItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTxt}>No items yet. Tap + to add one!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
          {recentItems.map((item: ShoppingItem) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.recentCard, { borderColor: STORE_COLORS[item.storeType] + '40' }]}
              onPress={() => nav.navigate('AddItem', { editItem: item })}
              activeOpacity={0.8}
            >
              <Text style={styles.recentEmoji}>{productEmoji(item.name)}</Text>
              <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.recentQty}>×{item.quantity}</Text>
              <View style={[styles.recentStore, { backgroundColor: STORE_COLORS[item.storeType] + '20' }]}>
                <View style={[styles.recentStoreDot, { backgroundColor: STORE_COLORS[item.storeType] }]} />
                <Text style={[styles.recentStoreTxt, { color: STORE_COLORS[item.storeType] }]}>
                  {STORE_TYPE_LABELS[item.storeType]}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Summary row ────────────────────────────── */}
      {items.length > 0 && (
        <View style={styles.summaryRow}>
          {(['supermarket', 'hardware', 'pharmacy', 'general'] as const).map((t) => {
            const count = items.filter((i: any) => i.storeType === t).length;
            if (!count) return null;
            return (
              <View key={t} style={styles.summaryChip}>
                <View style={[styles.summaryDot, { backgroundColor: STORE_COLORS[t] }]} />
                <Text style={styles.summaryTxt}>{count} {STORE_TYPE_LABELS[t]}</Text>
              </View>
            );
          })}
        </View>
      )}

    </ScrollView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { padding: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 14, color: C.textSecondary, fontWeight: '500' },
  name:     { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginTop: 2 },
  avatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, borderWidth: 1.5, borderColor: C.accent, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.accent },

  locationCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: C.cardBorder,
    ...Platform.select({
      web: { boxShadow: '0px 4px 20px rgba(91,158,255,0.08)' } as any,
      default: {},
    }),
  },
  locationBadge: { alignSelf: 'flex-start', backgroundColor: C.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  locationBadgeTxt: { fontSize: 10, fontWeight: '800', color: C.accent, letterSpacing: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  locationTxt: { fontSize: 17, fontWeight: '700', color: C.textPrimary },
  locationSub: { fontSize: 13, color: C.textSecondary, marginBottom: 12 },
  locationDots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storeDot:    { width: 8, height: 8, borderRadius: 4 },
  locationDotsTxt: { fontSize: 12, color: C.textTertiary },

  quickAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.cardElevated, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.cardBorder, marginBottom: 28,
  },
  quickAddTxt: { flex: 1, fontSize: 15, color: C.textSecondary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  sectionCount:  { fontSize: 13, color: C.textTertiary },

  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTxt:   { fontSize: 14, color: C.textSecondary },

  recentScroll: { paddingBottom: 4, gap: 12 },
  recentCard: {
    width: 130, backgroundColor: C.card, borderRadius: 18, padding: 14,
    borderWidth: 1, alignItems: 'flex-start', gap: 6,
  },
  recentEmoji: { fontSize: 32, marginBottom: 2 },
  recentName:  { fontSize: 14, fontWeight: '700', color: C.textPrimary, width: '100%' },
  recentQty:   { fontSize: 12, color: C.textSecondary },
  recentStore: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  recentStoreDot: { width: 6, height: 6, borderRadius: 3 },
  recentStoreTxt: { fontSize: 11, fontWeight: '600' },

  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.cardBorder },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryTxt: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
});
