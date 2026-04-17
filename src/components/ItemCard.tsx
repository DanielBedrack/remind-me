import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';

const STORE_COLORS: Record<string, string> = {
  supermarket: '#4CAF50',
  hardware:    '#FF9800',
  pharmacy:    '#2196F3',
  general:     '#9C27B0',
};

interface Props {
  item: ShoppingItem;
  onEdit:   (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onEdit, onDelete }: Props) {
  const color = STORE_COLORS[item.storeType] ?? '#666';

  return (
    <View style={styles.card}>
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{STORE_TYPE_LABELS[item.storeType]}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>
          Qty: {item.quantity}
          {item.storeName ? `  ·  ${item.storeName}` : ''}
        </Text>
      </View>

      <TouchableOpacity onPress={() => onEdit(item)} style={styles.btn}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color="#aaa" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.btn}>
        <MaterialCommunityIcons name="close" size={18} color="#ccc" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  sub:  { fontSize: 13, color: '#888', marginTop: 2 },
  btn:  { padding: 6 },
});
