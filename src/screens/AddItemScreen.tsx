import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StoreType, STORE_TYPE_LABELS } from '../types';
import { C, STORE_COLORS, productEmoji } from '../theme';
import type { RootStackParamList } from '../../App';

const STORE_TYPES: StoreType[] = ['supermarket', 'hardware', 'pharmacy', 'general'];

const COMMON_PRODUCTS: Record<StoreType, string[]> = {
  supermarket: ['Milk','Bread','Eggs','Butter','Cheese','Yogurt','Chicken','Rice','Pasta','Tomatoes','Onions','Apples','Bananas','Orange Juice','Coffee','Sugar'],
  hardware:    ['Screws','Nails','Paint','Drill Bits','Sandpaper','Light Bulbs','Duct Tape','WD-40','Cable Ties','Wall Plugs','Extension Cord','Paintbrush'],
  pharmacy:    ['Aspirin','Bandages','Vitamins','Sunscreen','Ibuprofen','Cough Syrup','Hand Sanitizer','Thermometer','Eye Drops','Antacid','Allergy Pills'],
  general:     ['Trash Bags','Cleaning Spray','Paper Towels','Toilet Paper','Dish Soap','Laundry Detergent','Sponges','Candles','Zip Bags','Aluminum Foil'],
};

const ALL_PRODUCTS = Array.from(new Set([
  ...COMMON_PRODUCTS.supermarket,
  'Beef','Fish','Garlic','Potatoes','Carrots','Strawberries','Grapes','Tea','Salt','Olive Oil','Flour','Cereal','Chocolate','Frozen Pizza','Ice Cream','Cucumber','Avocado','Lemon','Lettuce','Spinach','Mushrooms','Bell Peppers','Broccoli','Corn','Tuna','Salmon','Shrimp','Bacon','Sausage','Ham','Turkey','Ketchup','Mustard','Mayonnaise','Soy Sauce','Honey','Jam','Peanut Butter','Chips','Crackers','Cookies','Water','Sparkling Water','Soda','Beer','Wine','Juice','Oats','Granola','Nuts',
  ...COMMON_PRODUCTS.hardware,
  'Primer','LED Bulbs','Electrical Tape','Roller Brush','Measuring Tape','Hammer','Screwdriver','Wrench','Pliers','Utility Knife','Work Gloves','Ladder','Caulk','Plywood','Faucet','Hinges','Door Handle','Lock','Batteries','Smoke Detector','Wire','Saw','Spray Paint','Wood Glue','Zip Ties',
  ...COMMON_PRODUCTS.pharmacy,
  'Vitamin C','Vitamin D','Paracetamol','Antihistamine','Nasal Spray','Lip Balm','Moisturizer','Shampoo','Conditioner','Body Wash','Soap','Toothbrush','Toothpaste','Floss','Mouthwash','Deodorant','Razor','Cotton Balls','Q-Tips','Baby Wipes','Diapers','Heating Pad','Ice Pack',
  ...COMMON_PRODUCTS.general,
  'Fabric Softener','Plastic Wrap','Baking Paper','Matches','Lighter','Air Freshener','Mop','Broom','Bleach','Window Cleaner','Floor Cleaner','Rubber Gloves','Tape','Notebook','Pens','Scissors','Phone Charger','Hangers',
]));

const DEMO_STORE_NAMES: Record<StoreType, string[]> = {
  supermarket: ['Walmart','Costco','Whole Foods','Kroger','Safeway','Aldi','Lidl','Target','Publix','Sprouts'],
  hardware:    ['Home Depot','Ace Hardware','Menards','True Value','Harbor Freight'],
  pharmacy:    ['CVS','Walgreens','Rite Aid','Duane Reade','Bartell Drugs'],
  general:     ['Dollar General','Dollar Tree','Family Dollar','7-Eleven','Circle K','Wawa'],
};

const GOOGLE_KEY = (process.env as Record<string, string | undefined>).EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
const DEMO_MODE = !GOOGLE_KEY || GOOGLE_KEY === 'YOUR_GOOGLE_PLACES_API_KEY';

async function fetchSuggestions(input: string, storeType: StoreType): Promise<string[]> {
  if (DEMO_MODE || input.length < 2) {
    return DEMO_STORE_NAMES[storeType].filter((s) => s.toLowerCase().includes(input.toLowerCase()));
  }
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=' +
      encodeURIComponent(input) + '&types=establishment&key=' + GOOGLE_KEY;
    const res = await fetch(url);
    const data = await res.json();
    return (data.predictions ?? []).map((p: { description: string }) => p.description).slice(0, 6);
  } catch { return []; }
}

interface Props {
  onAdd:    (name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
  onUpdate: (id: string, name: string, qty: number, storeType: StoreType, storeName?: string) => Promise<void>;
}

export default function AddItemScreen({ onAdd, onUpdate }: Props) {
  const nav      = useNavigation();
  const route    = useRoute<RouteProp<RootStackParamList, 'AddItem'>>();
  const editItem = route.params?.editItem;
  const isEdit   = !!editItem;

  const [name,        setName]        = useState(editItem?.name ?? '');
  const [quantity,    setQuantity]    = useState(String(editItem?.quantity ?? 1));
  const [storeType,   setStoreType]   = useState<StoreType>(editItem?.storeType ?? 'supermarket');
  const [storeName,   setStoreName]   = useState(editItem?.storeName ?? '');
  const [suggestions,        setSuggestions]        = useState<string[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [saving,             setSaving]             = useState(false);
  const debounce    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accent = STORE_COLORS[storeType];

  function handleTypeChange(type: StoreType) {
    setStoreType(type); setName(''); setStoreName(''); setSuggestions([]); setProductSuggestions([]);
  }

  function handleNameChange(text: string) {
    setName(text);
    if (nameDebounce.current) clearTimeout(nameDebounce.current);
    if (!text.trim()) { setProductSuggestions([]); return; }
    nameDebounce.current = setTimeout(() => {
      const q = text.trim().toLowerCase();
      const matches = ALL_PRODUCTS
        .filter((p) => p.toLowerCase().includes(q) && p.toLowerCase() !== q)
        .slice(0, 6);
      setProductSuggestions(matches);
    }, 150);
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
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Preview emoji */}
        <View style={[styles.previewWrap, { backgroundColor: accent + '20' }]}>
          <Text style={styles.previewEmoji}>{productEmoji(name)}</Text>
        </View>

        <Text style={styles.label}>Store Type</Text>
        <View style={styles.row}>
          {STORE_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, { borderColor: STORE_COLORS[t] + '50' }, storeType === t && { backgroundColor: STORE_COLORS[t] + '25', borderColor: STORE_COLORS[t] }]}
              onPress={() => handleTypeChange(t)}
            >
              <Text style={[styles.chipTxt, storeType === t && { color: STORE_COLORS[t], fontWeight: '700' }]}>
                {STORE_TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Store Name  <Text style={styles.opt}>(optional)</Text></Text>
        <View style={{ zIndex: 10 }}>
          <TextInput
            style={styles.input}
            placeholder={'e.g. ' + DEMO_STORE_NAMES[storeType][0]}
            placeholderTextColor={C.textSecondary}
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
            <TouchableOpacity
              key={p}
              style={[styles.productChip, name === p && { backgroundColor: accent + '25', borderColor: accent }]}
              onPress={() => setName(p)}
            >
              <Text style={styles.productEmoji}>{productEmoji(p)}</Text>
              <Text style={[styles.productTxt, name === p && { color: accent, fontWeight: '700' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Item Name</Text>
        <View style={{ zIndex: 9 }}>
          <TextInput
            style={styles.input}
            placeholder="Or type a custom item..."
            placeholderTextColor={C.textSecondary}
            value={name}
            onChangeText={handleNameChange}
            returnKeyType="next"
          />
          {productSuggestions.length > 0 && (
            <View style={styles.dropdown}>
              {productSuggestions.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.sugRow}
                  onPress={() => { setName(p); setProductSuggestions([]); }}
                >
                  <Text style={styles.sugTxt}>{productEmoji(p)}  {p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.label}>Quantity</Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(Math.max(1, parseInt(quantity || '1', 10) - 1)))}>
            <Text style={styles.qtyBtnTxt}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, styles.qtyInput]}
            keyboardType="number-pad"
            value={quantity}
            onChangeText={setQuantity}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(String(parseInt(quantity || '1', 10) + 1))}>
            <Text style={styles.qtyBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveTxt}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add to List'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  content:      { padding: 20, paddingBottom: 48 },
  previewWrap:  { width: 88, height: 88, borderRadius: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  previewEmoji: { fontSize: 48 },
  label:        { fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 24 },
  opt:          { fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: C.cardBorder },
  row:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.cardBorder },
  chipTxt:      { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  input:        { backgroundColor: C.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.cardBorder },
  dropdown:     { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, zIndex: 99, marginTop: 4, overflow: 'hidden' },
  sugRow:       { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  sugTxt:       { fontSize: 15, color: C.textPrimary },
  productChip:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.cardBorder },
  productEmoji: { fontSize: 16 },
  productTxt:   { fontSize: 13, color: C.textSecondary, fontWeight: '500' },
  qtyRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn:       { width: 46, height: 46, borderRadius: 23, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt:    { fontSize: 22, color: C.textPrimary },
  qtyInput:     { flex: 1, textAlign: 'center' },
  saveBtn:      { marginTop: 36, marginBottom: 16, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveTxt:      { color: '#fff', fontSize: 16, fontWeight: '800' },
});
