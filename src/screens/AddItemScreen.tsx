import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StoreType, STORE_TYPE_LABELS, ShoppingItem } from '../types';
import type { RootStackParamList } from '../../App';

const STORE_TYPES: StoreType[] = ['supermarket', 'hardware', 'pharmacy', 'general'];

const COMMON_PRODUCTS: Record<StoreType, string[]> = {
  supermarket: ['Milk','Bread','Eggs','Butter','Cheese','Yogurt','Chicken','Rice','Pasta','Tomatoes','Onions','Apples','Bananas','Orange Juice','Coffee','Sugar'],
  hardware:    ['Screws','Nails','Paint','Drill Bits','Sandpaper','Light Bulbs','Duct Tape','WD-40','Cable Ties','Wall Plugs','Extension Cord','Paintbrush'],
  pharmacy:    ['Aspirin','Bandages','Vitamins','Sunscreen','Ibuprofen','Cough Syrup','Hand Sanitizer','Thermometer','Eye Drops','Antacid','Allergy Pills'],
  general:     ['Trash Bags','Cleaning Spray','Paper Towels','Toilet Paper','Dish Soap','Laundry Detergent','Sponges','Candles','Zip Bags','Aluminum Foil'],
};

const DEMO_STORE_NAMES: Record<StoreType, string[]> = {
  supermarket: ['Walmart','Costco','Whole Foods','Kroger','Safeway','Aldi','Lidl','Target','Publix','Sprouts'],
  hardware:    ['Home Depot','Ace Hardware','Menards','True Value','Harbor Freight'],
  pharmacy:    ['CVS','Walgreens','Rite Aid','Duane Reade','Bartell Drugs'],
  general:     ['Dollar General','Dollar Tree','Family Dollar','7-Eleven','Circle K','Wawa'],
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const DEMO_MODE = !GOOGLE_KEY || GOOGLE_KEY === 'YOUR_GOOGLE_PLACES_API_KEY';

async function fetchSuggestions(input: string, storeType: StoreType): Promise<string[]> {
  if (DEMO_MODE || input.length < 2) {
    return DEMO_STORE_NAMES[storeType].filter((s) =>
      s.toLowerCase().includes(input.toLowerCase())
    );
  }
  try {
    const url =
      'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
      '?input=' + encodeURIComponent(input) +
      '&types=establishment&key=' + GOOGLE_KEY;
    const res = await fetch(url);
    const data = await res.json();
    return (data.predictions ?? []).map((p: { description: string }) => p.description).slice(0, 6);
  } catch {
    return [];
  }
}

interface Props {
  onAdd:    (name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
  onUpdate: (id: string, name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
}

export default function AddItemScreen({ onAdd, onUpdate }: Props) {
  const nav    = useNavigation();
  const route  = useRoute<RouteProp<RootStackParamList, 'AddItem'>>();
  const editItem = route.params?.editItem;
  const isEdit   = !!editItem;

  const [name,        setName]        = useState(editItem?.name ?? '');
  const [quantity,    setQuantity]    = useState(String(editItem?.quantity ?? 1));
  const [storeType,   setStoreType]   = useState<StoreType>(editItem?.storeType ?? 'supermarket');
  const [storeName,   setStoreName]   = useState(editItem?.storeName ?? '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [saving,      setSaving]      = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTypeChange(type: StoreType) {
    setStoreType(type);
    setName('');
    setStoreName('');
    setSuggestions([]);
  }

  function handleStoreNameChange(text: string) {
    setStoreName(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (!text.trim()) { setSuggestions([]); return; }
    debounce.current = setTimeout(async () => {
      setSuggestions(await fetchSuggestions(text, storeType));
    }, 300);
  }

  async function handleSave() {
    const trimName = name.trim();
    if (!trimName) { Alert.alert('Missing name', 'Please enter an item name.'); return; }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) { Alert.alert('Invalid quantity', 'Quantity must be at least 1.'); return; }
    const trimStore = storeName.trim() || undefined;
    setSaving(true);
    try {
      if (isEdit) await onUpdate(editItem.id, trimName, qty, storeType, trimStore);
      else        await onAdd(trimName, qty, storeType, trimStore);
      nav.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Store Type</Text>
        <View style={styles.row}>
          {STORE_TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, storeType === t && styles.chipOn]} onPress={() => handleTypeChange(t)}>
              <Text style={[styles.chipTxt, storeType === t && styles.chipTxtOn]}>{STORE_TYPE_LABELS[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>
          Store Name{'  '}<Text style={styles.opt}>(optional)</Text>
        </Text>
        <View style={{ zIndex: 10 }}>
          <TextInput
            style={styles.input}
            placeholder={'e.g. ' + DEMO_STORE_NAMES[storeType][0]}
            placeholderTextColor="#bbb"
            value={storeName}
            onChangeText={handleStoreNameChange}
            returnKeyType="next"
          />
          {suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((s) => (
                <TouchableOpacity key={s} style={styles.sugRow} onPress={() => { setStoreName(s); setSuggestions([]); }}>
                  <Text style={styles.sugTxt}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Common Products</Text>
        <View style={styles.row}>
          {COMMON_PRODUCTS[storeType].map((p) => (
            <TouchableOpacity key={p} style={[styles.chip, name === p && styles.chipOn]} onPress={() => setName(p)}>
              <Text style={[styles.chipTxt, name === p && styles.chipTxtOn]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Item Name</Text>
        <TextInput style={styles.input} placeholder="Or type a custom item..." placeholderTextColor="#bbb" value={name} onChangeText={setName} returnKeyType="next" />

        <Text style={styles.label}>Quantity</Text>
        <TextInput style={[styles.input, { width: 100 }]} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} returnKeyType="done" />

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add to List'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content:   { padding: 24, paddingBottom: 40 },
  label:     { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },
  opt:       { fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: '#bbb', fontSize: 12 },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0' },
  chipOn:    { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  chipTxt:   { fontSize: 13, color: '#555', fontWeight: '500' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  input:     { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e8e8e8' },
  dropdown:  { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8e8e8', zIndex: 99, marginTop: 4, overflow: 'hidden' },
  sugRow:    { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sugTxt:    { fontSize: 15, color: '#1a1a1a' },
  saveBtn:   { marginTop: 36, marginBottom: 16, backgroundColor: '#4A90E2', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveTxt:   { color: '#fff', fontSize: 16, fontWeight: '700' },
});
