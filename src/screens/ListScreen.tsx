import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ItemCard from '../components/ItemCard';
import { useItemsContext } from '../context/ItemsContext';
import { C } from '../theme';
import type { RootStackParamList } from '../../App';
import { ShoppingItem } from '../types';

export default function ListScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, loading, remove, updateQuantity, collect } = useItemsContext();

  const handleEdit    = useCallback((item: ShoppingItem) => nav.navigate('AddItem', { editItem: item }), [nav]);
  const handleDelete  = useCallback((id: string) => remove(id), [remove]);
  const handleQty     = useCallback((id: string, qty: number) => updateQuantity(id, qty), [updateQuantity]);
  const handleCollect = useCallback((id: string) => collect(id), [collect]);

  const renderItem = useCallback(({ item }: { item: ShoppingItem }) => (
    <ItemCard
      item={item}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onQtyChange={handleQty}
      onCollect={handleCollect}
    />
  ), [handleEdit, handleDelete, handleQty, handleCollect]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        renderItem={renderItem}
        removeClippedSubviews
        windowSize={5}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Tap + to add items and get{'\n'}notified near the right store.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate('AddItem', {})}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.emptyBtnTxt}>Add first item</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  list:           { paddingVertical: 8, paddingHorizontal: 8 },
  row:            { justifyContent: 'flex-start' },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyEmoji:     { fontSize: 64, marginBottom: 16 },
  emptyTitle:     { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 10 },
  emptySub:       { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  emptyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
