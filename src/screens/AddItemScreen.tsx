import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StoreType, STORE_TYPE_LABELS } from '../types';

const STORE_TYPES: StoreType[] = ['supermarket', 'hardware', 'pharmacy', 'general'];

const COMMON_PRODUCTS: Record<StoreType, string[]> = {
  supermarket: [
    'Milk', 'Bread', 'Eggs', 'Butter', 'Cheese', 'Yogurt',
    'Chicken', 'Rice', 'Pasta', 'Tomatoes', 'Onions', 'Apples',
    'Bananas', 'Orange Juice', 'Coffee', 'Sugar', 'Flour', 'Oil',
  ],
  hardware: [
    'Screws', 'Nails', 'Paint', 'Drill Bits', 'Sandpaper',
    'Light Bulbs', 'Duct Tape', 'WD-40', 'Cable Ties', 'Wall Plugs',
    'Batteries', 'Extension Cord', 'Paintbrush', 'Putty',
  ],
  pharmacy: [
    'Aspirin', 'Bandages', 'Vitamins', 'Sunscreen', 'Ibuprofen',
    'Cough Syrup', 'Hand Sanitizer', 'Thermometer', 'Eye Drops',
    'Antacid', 'Allergy Pills', 'Paracetamol', 'Band-Aid',
  ],
  general: [
    'Trash Bags', 'Cleaning Spray', 'Paper Towels', 'Toilet Paper',
    'Dish Soap', 'Laundry Detergent', 'Sponges', 'Candles',
    'Zip Bags', 'Aluminum Foil', 'Matches', 'Air Freshener',
  ],
};

interface Props {
  onAdd: (name: string, quantity: number, storeType: StoreType) => Promise<void>;
}

export default function AddItemScreen({ onAdd }: Props) {
  const nav = useNavigation();
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [storeType, setStoreType] = useState<StoreType>('supermarket');
  const [saving, setSaving] = useState(false);

  function selectProduct(product: string) {
    setName(product);
  }

  function handleStoreTypeChange(type: StoreType) {
    setStoreType(type);
    setName(''); // clear selection when switching categories
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Missing name', 'Please enter an item name.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Invalid quantity', 'Quantity must be at least 1.');
      return;
    }

    setSaving(true);
    try {
      await onAdd(trimmed, qty, storeType);
      nav.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save item. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const products = COMMON_PRODUCTS[storeType];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Store Type</Text>
        <View style={styles.storeGrid}>
          {STORE_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.storeOption, storeType === type && styles.storeOptionActive]}
              onPress={() => handleStoreTypeChange(type)}
            >
              <Text
                style={[
                  styles.storeOptionText,
                  storeType === type && styles.storeOptionTextActive,
                ]}
              >
                {STORE_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Common Products</Text>
        <View style={styles.productGrid}>
          {products.map((product) => {
            const selected = name === product;
            return (
              <TouchableOpacity
                key={product}
                style={[styles.productChip, selected && styles.productChipSelected]}
                onPress={() => selectProduct(product)}
              >
                <Text style={[styles.productChipText, selected && styles.productChipTextSelected]}>
                  {product}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Item Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Or type a custom item…"
          placeholderTextColor="#bbb"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          style={[styles.input, styles.inputSmall]}
          keyboardType="number-pad"
          value={quantity}
          onChangeText={setQuantity}
          returnKeyType="done"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add to List'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 24 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  storeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  storeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  storeOptionActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#EBF3FF',
  },
  storeOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  storeOptionTextActive: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  productChipSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  productChipText: {
    fontSize: 13,
    color: '#444',
  },
  productChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  inputSmall: { width: 100 },
  saveBtn: {
    marginTop: 36,
    marginBottom: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
