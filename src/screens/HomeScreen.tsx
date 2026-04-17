import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ItemCard from '../components/ItemCard';
import { ShoppingItem } from '../types';
import { C } from '../theme';
import type { RootStackParamList } from '../../App';

interface Props {
  items:          ShoppingItem[];
  loading:        boolean;
  onDelete:       (id: string) => void;
  onQtyChange:    (id: string, qty: number) => void;
}

export default function HomeScreen({ items, loading, onDelete, onQtyChange }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

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
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onEdit={(i) => nav.navigate('AddItem', { editItem: i })}
            onDelete={onDelete}
            onQtyChange={onQtyChange}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🛒</Text>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items and get notified{'\n'}when you're near the right store.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddItem', {})}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  list:           { paddingVertical: 8, paddingHorizontal: 8 },
  row:            { justifyContent: 'flex-start' },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 140 },
  emptyEmoji:     { fontSize: 64, marginBottom: 16 },
  emptyTitle:     { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 10 },
  emptySub:       { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: C.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
});
