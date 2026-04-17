import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ItemCard from '../components/ItemCard';
import { ShoppingItem } from '../types';
import type { RootStackParamList } from '../../App';

interface Props {
  items:    ShoppingItem[];
  loading:  boolean;
  onDelete: (id: string) => void;
}

export default function HomeScreen({ items, loading, onDelete }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            onEdit={(i) => nav.navigate('AddItem', { editItem: i })}
            onDelete={onDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>Your list is empty</Text>
            <Text style={styles.emptySub}>Add items and get notified when you're near the right store.</Text>
          </View>
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
      />

      <TouchableOpacity style={styles.fab} onPress={() => nav.navigate('AddItem', {})}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f7' },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:           { paddingVertical: 12 },
  emptyContainer: { flex: 1 },
  empty:          { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: 120 },
  emptyIcon:      { fontSize: 52, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  emptySub:       { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A90E2', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 28, color: '#fff', marginTop: -2 },
});
