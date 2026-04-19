import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, STORE_COLORS } from '../theme';
import { StoreType, STORE_TYPE_LABELS } from '../types';
import { UserProfile, saveProfile } from '../services/userProfile';
import { searchAddress, searchCountries, AddressSuggestion, CountrySuggestion } from '../services/places';

const STORE_TYPES: StoreType[] = ['supermarket', 'hardware', 'pharmacy', 'general'];

const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: '100m', value: 100  },
  { label: '250m', value: 250  },
  { label: '500m', value: 500  },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
];

const STORE_ICONS: Record<StoreType, string> = {
  supermarket: 'cart-outline',
  hardware:    'hammer-wrench',
  pharmacy:    'pill',
  general:     'store-outline',
};

interface Props {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

export default function SetupScreen({ userId, userEmail, onComplete }: Props) {
  const defaultName = userEmail.split('@')[0] ?? '';

  const [displayName,   setDisplayName]   = useState(defaultName);
  const [countryName,   setCountryName]   = useState('');
  const [countryCode,   setCountryCode]   = useState('');
  const [countrySugs,   setCountrySugs]   = useState<CountrySuggestion[]>([]);

  const [homeText,      setHomeText]      = useState('');
  const [homeLat,       setHomeLat]       = useState<number | undefined>();
  const [homeLng,       setHomeLng]       = useState<number | undefined>();
  const [homeSugs,      setHomeSugs]      = useState<AddressSuggestion[]>([]);

  const [workText,      setWorkText]      = useState('');
  const [workLat,       setWorkLat]       = useState<number | undefined>();
  const [workLng,       setWorkLng]       = useState<number | undefined>();
  const [workSugs,      setWorkSugs]      = useState<AddressSuggestion[]>([]);

  const [radius,        setRadius]        = useState(500);
  const [storeTypes,    setStoreTypes]    = useState<StoreType[]>([...STORE_TYPES]);
  const [saving,        setSaving]        = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});

  const homeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Country ───────────────────────────────────────────────────────────────────
  function handleCountryChange(text: string) {
    setCountryName(text);
    setCountryCode('');
    setHomeText(''); setHomeLat(undefined); setHomeLng(undefined); setHomeSugs([]);
    setWorkText(''); setWorkLat(undefined); setWorkLng(undefined); setWorkSugs([]);
    setErrors((e) => ({ ...e, country: '' }));
    setCountrySugs(text.trim() ? searchCountries(text) : []);
  }
  function selectCountry(c: CountrySuggestion) {
    setCountryName(c.name);
    setCountryCode(c.code);
    setCountrySugs([]);
  }

  // ── Home address ──────────────────────────────────────────────────────────────
  function handleHomeChange(text: string) {
    setHomeText(text);
    setHomeLat(undefined); setHomeLng(undefined);
    setErrors((e) => ({ ...e, homeLocation: '' }));
    if (homeDebounce.current) clearTimeout(homeDebounce.current);
    if (!text.trim()) { setHomeSugs([]); return; }
    homeDebounce.current = setTimeout(async () => {
      setHomeSugs(await searchAddress(text, countryCode));
    }, 400);
  }
  function selectHome(s: AddressSuggestion) {
    setHomeText(s.displayName);
    setHomeLat(s.lat); setHomeLng(s.lng);
    setHomeSugs([]);
  }

  // ── Work address ──────────────────────────────────────────────────────────────
  function handleWorkChange(text: string) {
    setWorkText(text);
    setWorkLat(undefined); setWorkLng(undefined);
    if (workDebounce.current) clearTimeout(workDebounce.current);
    if (!text.trim()) { setWorkSugs([]); return; }
    workDebounce.current = setTimeout(async () => {
      setWorkSugs(await searchAddress(text, countryCode));
    }, 400);
  }
  function selectWork(s: AddressSuggestion) {
    setWorkText(s.displayName);
    setWorkLat(s.lat); setWorkLng(s.lng);
    setWorkSugs([]);
  }

  function toggleStore(type: StoreType) {
    setStoreTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!displayName.trim())   errs.displayName  = 'Please enter your name.';
    if (!countryName.trim())   errs.country      = 'Please select your country.';
    if (!homeText.trim())      errs.homeLocation = 'Please enter your home address.';
    if (storeTypes.length === 0) errs.storeTypes = 'Select at least one store type.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const profile: UserProfile = {
        displayName:        displayName.trim(),
        homeLocation:       homeText.trim(),
        homeLat, homeLng,
        workLocation:       workText.trim(),
        workLat, workLng,
        notificationRadius: radius,
        trackedStoreTypes:  storeTypes,
        setupComplete:      true,
      };
      await saveProfile(userId, profile);
      onComplete();
    } catch {
      setErrors({ save: 'Could not save profile. Please try again.' });
    } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🛍️</Text>
          <Text style={styles.heroTitle}>Set Up Your Profile</Text>
          <Text style={styles.heroSub}>Takes about 30 seconds · You can change this later</Text>
        </View>

        {/* Display name */}
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={[styles.input, !!errors.displayName && styles.inputError]}
          placeholder="e.g. Daniel"
          placeholderTextColor={C.textSecondary}
          value={displayName}
          onChangeText={(t) => { setDisplayName(t); setErrors((e) => ({ ...e, displayName: '' })); }}
          returnKeyType="next"
          autoCapitalize="words"
        />
        {!!errors.displayName && <Text style={styles.errorTxt}>{errors.displayName}</Text>}

        {/* Country */}
        <Text style={styles.label}>
          Country<Text style={styles.required}> *</Text>
        </Text>
        <View style={{ zIndex: 30 }}>
          <View style={[styles.inputRow, !!errors.country && styles.inputRowError]}>
            <MaterialCommunityIcons name="earth" size={20} color={C.accent} style={styles.inputIcon} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Select your country…"
              placeholderTextColor={C.textSecondary}
              value={countryName}
              onChangeText={handleCountryChange}
            />
            {countryCode ? (
              <MaterialCommunityIcons name="check-circle" size={18} color={C.success} style={{ marginRight: 8 }} />
            ) : null}
          </View>
          {countrySugs.length > 0 && (
            <View style={styles.dropdown}>
              {countrySugs.map((c, i) => (
                <TouchableOpacity key={c.code} style={[styles.sugRow, i < countrySugs.length - 1 && styles.sugBorder]} onPress={() => selectCountry(c)}>
                  <MaterialCommunityIcons name="flag-outline" size={16} color={C.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={styles.sugTxt}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {!!errors.country && <Text style={styles.errorTxt}>{errors.country}</Text>}

        {/* Home address */}
        <Text style={styles.label}>
          Home Address<Text style={styles.required}> *</Text>
        </Text>
        <Text style={styles.sublabel}>City, street, building number, zip</Text>
        <View style={{ zIndex: 20 }}>
          <View style={[styles.inputRow, !!errors.homeLocation && styles.inputRowError]}>
            <MaterialCommunityIcons name="home-outline" size={20} color={C.accent} style={styles.inputIcon} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Start typing your address…"
              placeholderTextColor={C.textSecondary}
              value={homeText}
              onChangeText={handleHomeChange}
              returnKeyType="next"
            />
            {homeLat !== undefined && (
              <MaterialCommunityIcons name="check-circle" size={18} color={C.success} style={{ marginRight: 8 }} />
            )}
          </View>
          {homeSugs.length > 0 && (
            <View style={styles.dropdown}>
              {homeSugs.map((s, i) => (
                <TouchableOpacity key={i} style={[styles.sugRow, i < homeSugs.length - 1 && styles.sugBorder]} onPress={() => selectHome(s)}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color={C.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={styles.sugTxt} numberOfLines={2}>{s.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {!!errors.homeLocation && <Text style={styles.errorTxt}>{errors.homeLocation}</Text>}

        {/* Work / second address (same country) */}
        <Text style={styles.label}>
          Work / Second Address<Text style={styles.opt}>  (optional)</Text>
        </Text>
        <Text style={styles.sublabel}>Same country · city, street, building number, zip</Text>
        <View style={{ zIndex: 10 }}>
          <View style={styles.inputRow}>
            <MaterialCommunityIcons name="briefcase-outline" size={20} color={C.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.inputFlex}
              placeholder="Start typing your address…"
              placeholderTextColor={C.textSecondary}
              value={workText}
              onChangeText={handleWorkChange}
              returnKeyType="next"
            />
            {workLat !== undefined && (
              <MaterialCommunityIcons name="check-circle" size={18} color={C.success} style={{ marginRight: 8 }} />
            )}
          </View>
          {workSugs.length > 0 && (
            <View style={styles.dropdown}>
              {workSugs.map((s, i) => (
                <TouchableOpacity key={i} style={[styles.sugRow, i < workSugs.length - 1 && styles.sugBorder]} onPress={() => selectWork(s)}>
                  <MaterialCommunityIcons name="map-marker-outline" size={16} color={C.textTertiary} style={{ marginRight: 8 }} />
                  <Text style={styles.sugTxt} numberOfLines={2}>{s.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notification radius */}
        <Text style={styles.label}>Notify Me Within</Text>
        <Text style={styles.sublabel}>How close to a store before you get a reminder?</Text>
        <View style={styles.radiusRow}>
          {RADIUS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.radiusChip, radius === opt.value && styles.radiusChipActive]}
              onPress={() => setRadius(opt.value)}
            >
              <Text style={[styles.radiusChipTxt, radius === opt.value && styles.radiusChipTxtActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Store types */}
        <Text style={styles.label}>Store Types to Track</Text>
        <Text style={styles.sublabel}>You'll only be notified near stores you care about.</Text>
        {!!errors.storeTypes && <Text style={styles.errorTxt}>{errors.storeTypes}</Text>}
        <View style={styles.storeGrid}>
          {STORE_TYPES.map((type) => {
            const active = storeTypes.includes(type);
            const color  = STORE_COLORS[type];
            return (
              <TouchableOpacity
                key={type}
                style={[styles.storeChip, { borderColor: color + '60' }, active && { backgroundColor: color + '20', borderColor: color }]}
                onPress={() => toggleStore(type)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name={STORE_ICONS[type] as any} size={22} color={active ? color : C.textTertiary} />
                <Text style={[styles.storeChipTxt, active && { color, fontWeight: '700' }]}>
                  {STORE_TYPE_LABELS[type]}
                </Text>
                {active && <MaterialCommunityIcons name="check-circle" size={16} color={color} style={styles.storeCheck} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {!!errors.save && <Text style={[styles.errorTxt, { textAlign: 'center', marginTop: 8 }]}>{errors.save}</Text>}

        {/* CTA */}
        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveTxt}>Complete Setup</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.skipNote}>You can update these settings anytime in your Profile.</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bg },
  content: { padding: 24, paddingBottom: 56 },

  hero:      { alignItems: 'center', marginBottom: 32, marginTop: 12 },
  heroEmoji: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: C.textSecondary, textAlign: 'center' },

  label:    { fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 24 },
  required: { color: C.danger },
  opt:      { fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: C.textTertiary },
  sublabel: { fontSize: 12, color: C.textTertiary, marginBottom: 8, marginTop: 0 },

  input:        { backgroundColor: C.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.cardBorder },
  inputError:   { borderColor: C.danger + '80' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 14 },
  inputRowError:{ borderColor: C.danger + '80' },
  inputIcon:    { marginRight: 10 },
  inputFlex:    { flex: 1, paddingVertical: 14, fontSize: 15, color: C.textPrimary },
  errorTxt:     { fontSize: 12, color: C.danger, marginTop: 4 },

  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, zIndex: 99, marginTop: 4, overflow: 'hidden' },
  sugRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  sugBorder:{ borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  sugTxt:   { flex: 1, fontSize: 13, color: C.textPrimary, lineHeight: 18 },

  radiusRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  radiusChip:          { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.cardBorder },
  radiusChipActive:    { backgroundColor: C.accentSoft, borderColor: C.accent },
  radiusChipTxt:       { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  radiusChipTxtActive: { color: C.accent, fontWeight: '800' },

  storeGrid:    { gap: 10 },
  storeChip:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5 },
  storeChipTxt: { flex: 1, fontSize: 15, color: C.textSecondary, fontWeight: '500' },
  storeCheck:   { marginLeft: 'auto' as any },

  saveBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.accent, borderRadius: 18, paddingVertical: 16, marginTop: 36 },
  saveTxt:  { color: '#fff', fontSize: 16, fontWeight: '800' },
  skipNote: { fontSize: 12, color: C.textTertiary, textAlign: 'center', marginTop: 16 },
});
