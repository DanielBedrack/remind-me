import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';
import { C, STORE_COLORS, productEmoji } from '../theme';

const CARD_WIDTH = (Dimensions.get('window').width - 16 * 3) / 2;

interface Props {
  item:           ShoppingItem;
  onEdit:         (item: ShoppingItem) => void;
  onDelete:       (id: string) => void;
  onQtyChange:    (id: string, qty: number) => void;
}

export default function ItemCard({ item, onEdit, onDelete, onQtyChange }: Props) {
  const accent = STORE_COLORS[item.storeType] ?? C.accent;
  const emoji  = productEmoji(item.name);

  return (
    <View style={[styles.card, { borderColor: accent + '33' }]}>

      {/* Top-right delete */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <MaterialCommunityIcons name="close" size={14} color={C.textSecondary} />
      </TouchableOpacity>

      {/* Cartoon emoji */}
      <View style={[styles.emojiWrap, { backgroundColor: accent + '18' }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Store badge */}
      {item.storeName ? (
        <Text style={[styles.storeName, { color: accent }]} numberOfLines={1}>{item.storeName}</Text>
      ) : (
        <Text style={[styles.storeName, { color: accent }]}>{STORE_TYPE_LABELS[item.storeType]}</Text>
      )}

      {/* Product name */}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

      {/* Quantity row */}
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDim]}
          onPress={() => onQtyChange(item.id, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Text style={styles.qtyBtnTxt}>−</Text>
        </TouchableOpacity>

        <Text style={styles.qtyNum}>{item.quantity}</Text>

        <TouchableOpacity style={styles.qtyBtn} onPress={() => onQtyChange(item.id, item.quantity + 1)}>
          <Text style={styles.qtyBtnTxt}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
          <MaterialCommunityIcons name="pencil-outline" size={14} color={C.textSecondary} />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    margin: 8,
    alignItems: 'center',
  },
  deleteBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10, marginTop: 6,
  },
  emoji:     { fontSize: 38 },
  storeName: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  name:      { fontSize: 15, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 20 },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDim: { opacity: 0.3 },
  qtyBtnTxt: { fontSize: 18, color: C.textPrimary, lineHeight: 22 },
  qtyNum:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, minWidth: 22, textAlign: 'center' },
  editBtn:   { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
