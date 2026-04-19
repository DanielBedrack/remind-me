import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHistory, HistoryEntry } from '../hooks/useHistory';
import { C, STORE_COLORS, productEmoji } from '../theme';
import { STORE_TYPE_LABELS } from '../types';

const ACTION_CONFIG = {
  added:     { icon: 'plus-circle',   color: C.success,  label: 'Added'     },
  deleted:   { icon: 'minus-circle',  color: C.danger,   label: 'Removed'   },
  updated:   { icon: 'pencil-circle', color: C.warning,  label: 'Edited'    },
  collected: { icon: 'check-circle',  color: '#34C759',  label: 'Collected' },
};

function groupByDay(entries: HistoryEntry[]): { title: string; data: HistoryEntry[] }[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const key = dayLabel(e.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryScreen() {
  const { entries, loading, reload } = useHistory();

  useFocusEffect(React.useCallback(() => { reload(); }, [reload]));

  // Must be before any early return — hooks must run in the same order every render
  const groups = useMemo(() => groupByDay(entries), [entries]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
        <Text style={styles.emptyTitle}>No history yet</Text>
        <Text style={styles.emptySub}>Your add/remove actions will appear here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={groups}
      keyExtractor={(g) => g.title}
      renderItem={({ item: group }) => (
        <View style={styles.group}>
          <Text style={styles.dayLabel}>{group.title}</Text>
          {group.data.map((entry) => {
            const cfg = ACTION_CONFIG[entry.action];
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={20} color={cfg.color} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.itemName}>{productEmoji(entry.itemName)} {entry.itemName}</Text>
                    <Text style={styles.time}>{timeLabel(entry.timestamp)}</Text>
                  </View>
                  <View style={styles.rowMeta}>
                    <Text style={[styles.actionLabel, { color: cfg.color }]}>{cfg.label}</Text>
                    <Text style={styles.dot}>·</Text>
                    <View style={[styles.storePill, { backgroundColor: STORE_COLORS[entry.storeType] + '20' }]}>
                      <Text style={[styles.storePillTxt, { color: STORE_COLORS[entry.storeType] }]}>
                        {STORE_TYPE_LABELS[entry.storeType]}
                      </Text>
                    </View>
                    <Text style={styles.qty}>×{entry.qty}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { padding: 16, paddingBottom: 40 },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: C.textSecondary, textAlign: 'center' },

  group:    { marginBottom: 24 },
  dayLabel: { fontSize: 12, fontWeight: '800', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  iconWrap:{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rowBody: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.cardBorder },
  rowTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName:{ fontSize: 15, fontWeight: '700', color: C.textPrimary },
  time:    { fontSize: 12, color: C.textTertiary },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  dot:     { color: C.textTertiary, fontSize: 12 },
  storePill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  storePillTxt: { fontSize: 11, fontWeight: '700' },
  qty:     { fontSize: 12, color: C.textTertiary },
});
