import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ShoppingItem, STORE_TYPE_LABELS } from '../types';
import { C, STORE_COLORS, productEmoji } from '../theme';

const CARD_WIDTH = (Dimensions.get('window').width - 16 * 3) / 2;

interface Props {
  item:        ShoppingItem;
  onEdit:      (item: ShoppingItem) => void;
  onDelete:    (id: string) => void;
  onQtyChange: (id: string, qty: number) => void;
  onCollect:   (id: string) => void;
}

export default function ItemCard({ item, onEdit, onDelete, onQtyChange, onCollect }: Props) {
  const accent  = STORE_COLORS[item.storeType] ?? C.accent;
  const emoji   = productEmoji(item.name);
  const checkScale = useRef(new Animated.Value(1)).current;

  function handleCollect() {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(checkScale, { toValue: 0,   useNativeDriver: true, speed: 30 }),
    ]).start(() => onCollect(item.id));
  }

  return (
    <View style={[styles.card, { borderColor: accent + '33' }]}>

      {/* Top-right delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <MaterialCommunityIcons name="close" size={14} color={C.textSecondary} />
      </TouchableOpacity>

      {/* Top-left edit */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => onEdit(item)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <MaterialCommunityIcons name="pencil-outline" size={14} color={C.textSecondary} />
      </TouchableOpacity>

      {/* Emoji */}
      <View style={[styles.emojiWrap, { backgroundColor: accent + '18' }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>

      {/* Store label */}
      <Text style={[styles.storeName, { color: accent }]} numberOfLines={1}>
        {item.storeName || STORE_TYPE_LABELS[item.storeType]}
      </Text>

      {/* Product name */}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>

      {/* Qty stepper */}
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
      </View>

      {/* Collect button */}
      <Animated.View style={{ transform: [{ scale: checkScale }], width: '100%', marginTop: 10 }}>
        <TouchableOpacity style={[styles.collectBtn, { borderColor: C.success + '60' }]} onPress={handleCollect} activeOpacity={0.8}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={C.success} />
          <Text style={styles.collectTxt}>Collected</Text>
        </TouchableOpacity>
      </Animated.View>

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
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtn: {
    position: 'absolute', top: 10, left: 10,
    width: 24, height: 24, borderRadius: 12,
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
  name:      { fontSize: 15, fontWeight: '700', color: C.textPrimary, textAlign: 'center', marginBottom: 10, lineHeight: 20 },
  qtyRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  qtyBtnDim: { opacity: 0.3 },
  qtyBtnTxt: { fontSize: 18, color: C.textPrimary, lineHeight: 22 },
  qtyNum:    { fontSize: 15, fontWeight: '700', color: C.textPrimary, minWidth: 22, textAlign: 'center' },
  collectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 7, backgroundColor: C.success + '12',
  },
  collectTxt: { fontSize: 12, fontWeight: '700', color: C.success },
});
