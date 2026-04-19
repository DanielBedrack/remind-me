import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useItemsContext } from '../context/ItemsContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { signOut } from '../services/firebase';
import { fetchProfile, saveProfile, UserProfile } from '../services/userProfile';
import { searchAddress, searchCountries, AddressSuggestion, CountrySuggestion } from '../services/places';
import { C, STORE_COLORS } from '../theme';
import { StoreType, STORE_TYPE_LABELS } from '../types';

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'he', label: 'Hebrew',  native: 'עברית'   },
  { code: 'es', label: 'Spanish', native: 'Español' },
];

const ALL_STORE_TYPES: StoreType[] = ['supermarket', 'hardware', 'pharmacy', 'general'];
const STORE_ICONS: Record<StoreType, string> = {
  supermarket: 'cart-outline', hardware: 'hammer-wrench',
  pharmacy: 'pill', general: 'store-outline',
};
const RADIUS_OPTIONS = [
  { label: '100m', value: 100  },
  { label: '250m', value: 250  },
  { label: '500m', value: 500  },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { user, userId } = useAuth();
  const { items } = useItemsContext();
  const email    = user?.email ?? 'Anonymous';
  const initials = email.slice(0, 2).toUpperCase();

  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  // Edit form state
  const [displayName,  setDisplayName]  = useState('');
  const [countryName,  setCountryName]  = useState('');
  const [countryCode,  setCountryCode]  = useState('');
  const [countrySugs,  setCountrySugs]  = useState<CountrySuggestion[]>([]);
  const [homeText,     setHomeText]     = useState('');
  const [homeLat,      setHomeLat]      = useState<number | undefined>();
  const [homeLng,      setHomeLng]      = useState<number | undefined>();
  const [homeSugs,     setHomeSugs]     = useState<AddressSuggestion[]>([]);
  const [workText,     setWorkText]     = useState('');
  const [workLat,      setWorkLat]      = useState<number | undefined>();
  const [workLng,      setWorkLng]      = useState<number | undefined>();
  const [workSugs,     setWorkSugs]     = useState<AddressSuggestion[]>([]);
  const [radius,       setRadius]       = useState(500);
  const [storeTypes,   setStoreTypes]   = useState<StoreType[]>([...ALL_STORE_TYPES]);
  const [errors,       setErrors]       = useState<Record<string, string>>({});

  const homeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stats = (['supermarket', 'hardware', 'pharmacy', 'general'] as const).map((type) => ({
    type, count: items.filter((i) => i.storeType === type).length, color: STORE_COLORS[type],
  }));

  useEffect(() => {
    if (!userId) return;
    fetchProfile(userId).then((p) => {
      if (p) setProfile(p);
    });
  }, [userId]);

  function openEdit() {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setCountryName(''); setCountryCode('');
    setHomeText(profile.homeLocation || '');
    setHomeLat(profile.homeLat); setHomeLng(profile.homeLng);
    setWorkText(profile.workLocation || '');
    setWorkLat(profile.workLat); setWorkLng(profile.workLng);
    setRadius(profile.notificationRadius ?? 500);
    setStoreTypes(profile.trackedStoreTypes?.length ? profile.trackedStoreTypes : [...ALL_STORE_TYPES]);
    setErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setHomeSugs([]); setWorkSugs([]); setCountrySugs([]);
  }

  // Country
  function handleCountryChange(text: string) {
    setCountryName(text); setCountryCode('');
    setCountrySugs(text.trim() ? searchCountries(text) : []);
  }
  function selectCountry(c: CountrySuggestion) {
    setCountryName(c.name); setCountryCode(c.code);
    setCountrySugs([]);
  }

  // Home address
  function handleHomeChange(text: string) {
    setHomeText(text); setHomeLat(undefined); setHomeLng(undefined);
    setErrors((e) => ({ ...e, homeLocation: '' }));
    if (homeDebounce.current) clearTimeout(homeDebounce.current);
    if (!text.trim()) { setHomeSugs([]); return; }
    homeDebounce.current = setTimeout(async () => {
      setHomeSugs(await searchAddress(text, countryCode));
    }, 400);
  }
  function selectHome(s: AddressSuggestion) {
    setHomeText(s.displayName); setHomeLat(s.lat); setHomeLng(s.lng);
    setHomeSugs([]);
  }

  // Work address
  function handleWorkChange(text: string) {
    setWorkText(text); setWorkLat(undefined); setWorkLng(undefined);
    if (workDebounce.current) clearTimeout(workDebounce.current);
    if (!text.trim()) { setWorkSugs([]); return; }
    workDebounce.current = setTimeout(async () => {
      setWorkSugs(await searchAddress(text, countryCode));
    }, 400);
  }
  function selectWork(s: AddressSuggestion) {
    setWorkText(s.displayName); setWorkLat(s.lat); setWorkLng(s.lng);
    setWorkSugs([]);
  }

  function toggleStore(type: StoreType) {
    setStoreTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!displayName.trim())  errs.displayName  = 'Please enter your name.';
    if (!homeText.trim())     errs.homeLocation = 'Please enter your home address.';
    if (storeTypes.length === 0) errs.storeTypes = 'Select at least one store type.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const updated: UserProfile = {
        displayName:        displayName.trim(),
        homeLocation:       homeText.trim(),
        homeLat, homeLng,
        workLocation:       workText.trim(),
        workLat, workLng,
        notificationRadius: radius,
        trackedStoreTypes:  storeTypes,
        setupComplete:      true,
      };
      await saveProfile(userId!, updated);
      setProfile(updated);
      setEditing(false);
    } catch {
      setErrors({ save: 'Could not save. Please try again.' });
    } finally { setSaving(false); }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="shield-check" size={13} color={C.success} />
          <Text style={styles.badgeTxt}>{t('profile.signedIn')}</Text>
        </View>
      </View>

      {/* Stats */}
      <Text style={styles.sectionLabel}>{t('profile.shoppingList')}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{items.length}</Text>
          <Text style={styles.statLbl}>{t('profile.totalItems')}</Text>
        </View>
        {stats.filter((s) => s.count > 0).map((s) => (
          <View key={s.type} style={[styles.statCard, { borderColor: s.color + '40' }]}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLbl}>{t(`stores.${s.type}`)}</Text>
          </View>
        ))}
      </View>

      {/* ── Profile Settings ─────────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>Profile Settings</Text>
        {!editing && profile && (
          <TouchableOpacity onPress={openEdit} style={styles.editChip} activeOpacity={0.75}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={C.accent} />
            <Text style={styles.editChipTxt}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {!editing ? (
        /* ── Read-only view ── */
        <View style={styles.settingsCard}>
          {profile ? (
            <>
              <InfoRow icon="account-outline"    label="Name"            value={profile.displayName || '—'} />
              <View style={styles.divider} />
              <InfoRow icon="home-outline"        label="Home address"    value={profile.homeLocation || '—'} />
              {!!profile.workLocation && (
                <>
                  <View style={styles.divider} />
                  <InfoRow icon="briefcase-outline" label="Work address"  value={profile.workLocation} />
                </>
              )}
              <View style={styles.divider} />
              <InfoRow icon="map-marker-radius-outline" label="Notify radius"
                value={profile.notificationRadius >= 1000 ? `${profile.notificationRadius / 1000} km` : `${profile.notificationRadius}m`} />
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <MaterialCommunityIcons name="store-outline" size={20} color={C.textSecondary} />
                <Text style={styles.settingLabel}>Store types</Text>
                <View style={styles.storeTagsRow}>
                  {(profile.trackedStoreTypes ?? []).map((type) => (
                    <View key={type} style={[styles.storeTag, { backgroundColor: STORE_COLORS[type] + '22' }]}>
                      <Text style={[styles.storeTagTxt, { color: STORE_COLORS[type] }]}>{STORE_TYPE_LABELS[type]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator color={C.accent} />
            </View>
          )}
        </View>
      ) : (
        /* ── Edit form ── */
        <View style={styles.editCard}>

          {/* Display name */}
          <Text style={styles.fieldLabel}>Your Name</Text>
          <TextInput
            style={[styles.input, !!errors.displayName && styles.inputError]}
            placeholder="Name"
            placeholderTextColor={C.textSecondary}
            value={displayName}
            onChangeText={(t) => { setDisplayName(t); setErrors((e) => ({ ...e, displayName: '' })); }}
            autoCapitalize="words"
          />
          {!!errors.displayName && <Text style={styles.errorTxt}>{errors.displayName}</Text>}

          {/* Country (optional filter) */}
          <Text style={styles.fieldLabel}>Country</Text>
          <View style={{ zIndex: 30 }}>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="earth" size={18} color={C.accent} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputFlex}
                placeholder="Type to filter address search…"
                placeholderTextColor={C.textSecondary}
                value={countryName}
                onChangeText={handleCountryChange}
              />
              {countryCode ? <MaterialCommunityIcons name="check-circle" size={16} color={C.success} style={{ marginRight: 6 }} /> : null}
            </View>
            {countrySugs.length > 0 && (
              <View style={styles.dropdown}>
                {countrySugs.map((c, i) => (
                  <TouchableOpacity key={c.code} style={[styles.sugRow, i < countrySugs.length - 1 && styles.sugBorder]} onPress={() => selectCountry(c)}>
                    <MaterialCommunityIcons name="flag-outline" size={14} color={C.textTertiary} style={{ marginRight: 8 }} />
                    <Text style={styles.sugTxt}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Home address */}
          <Text style={styles.fieldLabel}>Home Address <Text style={{ color: C.danger }}>*</Text></Text>
          <View style={{ zIndex: 20 }}>
            <View style={[styles.inputRow, !!errors.homeLocation && styles.inputRowError]}>
              <MaterialCommunityIcons name="home-outline" size={18} color={C.accent} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputFlex}
                placeholder="City, street, building…"
                placeholderTextColor={C.textSecondary}
                value={homeText}
                onChangeText={handleHomeChange}
              />
              {homeLat !== undefined && <MaterialCommunityIcons name="check-circle" size={16} color={C.success} style={{ marginRight: 6 }} />}
            </View>
            {homeSugs.length > 0 && (
              <View style={styles.dropdown}>
                {homeSugs.map((s, i) => (
                  <TouchableOpacity key={i} style={[styles.sugRow, i < homeSugs.length - 1 && styles.sugBorder]} onPress={() => selectHome(s)}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textTertiary} style={{ marginRight: 8 }} />
                    <Text style={styles.sugTxt} numberOfLines={2}>{s.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          {!!errors.homeLocation && <Text style={styles.errorTxt}>{errors.homeLocation}</Text>}

          {/* Work address */}
          <Text style={styles.fieldLabel}>Work / Second Address <Text style={styles.optTxt}>(optional)</Text></Text>
          <View style={{ zIndex: 10 }}>
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="briefcase-outline" size={18} color={C.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputFlex}
                placeholder="City, street, building…"
                placeholderTextColor={C.textSecondary}
                value={workText}
                onChangeText={handleWorkChange}
              />
              {workLat !== undefined && <MaterialCommunityIcons name="check-circle" size={16} color={C.success} style={{ marginRight: 6 }} />}
            </View>
            {workSugs.length > 0 && (
              <View style={styles.dropdown}>
                {workSugs.map((s, i) => (
                  <TouchableOpacity key={i} style={[styles.sugRow, i < workSugs.length - 1 && styles.sugBorder]} onPress={() => selectWork(s)}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={C.textTertiary} style={{ marginRight: 8 }} />
                    <Text style={styles.sugTxt} numberOfLines={2}>{s.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Radius */}
          <Text style={styles.fieldLabel}>Notify Me Within</Text>
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
          <Text style={styles.fieldLabel}>Store Types to Track</Text>
          {!!errors.storeTypes && <Text style={styles.errorTxt}>{errors.storeTypes}</Text>}
          <View style={styles.storeGrid}>
            {ALL_STORE_TYPES.map((type) => {
              const active = storeTypes.includes(type);
              const color  = STORE_COLORS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.storeChip, { borderColor: color + '60' }, active && { backgroundColor: color + '20', borderColor: color }]}
                  onPress={() => toggleStore(type)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name={STORE_ICONS[type] as any} size={20} color={active ? color : C.textTertiary} />
                  <Text style={[styles.storeChipTxt, active && { color, fontWeight: '700' }]}>{STORE_TYPE_LABELS[type]}</Text>
                  {active && <MaterialCommunityIcons name="check-circle" size={14} color={color} style={{ marginLeft: 'auto' as any }} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {!!errors.save && <Text style={[styles.errorTxt, { textAlign: 'center', marginTop: 4 }]}>{errors.save}</Text>}

          {/* Save / Cancel */}
          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator color="#fff" />
              : <><MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" /><Text style={styles.saveTxt}>Save Changes</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} activeOpacity={0.75}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Language selector */}
      <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('profile.language')}</Text>
      <View style={styles.settingsCard}>
        {LANGUAGES.map((lang, idx) => (
          <React.Fragment key={lang.code}>
            {idx > 0 && <View style={styles.divider} />}
            <TouchableOpacity style={styles.langRow} onPress={() => setLanguage(lang.code)} activeOpacity={0.7}>
              <Text style={styles.langNative}>{lang.native}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {language === lang.code && <MaterialCommunityIcons name="check-circle" size={20} color={C.accent} />}
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* App settings */}
      <Text style={styles.sectionLabel}>{t('profile.app')}</Text>
      <View style={styles.settingsCard}>
        <SettingRow icon="map-marker-outline"  label={t('profile.locationTracking')} value={t('profile.active')} valueColor={C.success} />
        <View style={styles.divider} />
        <SettingRow icon="bell-outline"         label={t('profile.notifications')}    value={t('profile.on')}     valueColor={C.success} />
        <View style={styles.divider} />
        <SettingRow icon="information-outline"  label={t('profile.version')}          value="1.0.0" />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()} activeOpacity={0.8}>
        <MaterialCommunityIcons name="logout" size={18} color={C.danger} />
        <Text style={styles.signOutTxt}>{t('common.signOut')}</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color={C.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SettingRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.settingRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color={C.textSecondary} />
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={[styles.settingValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { padding: 20, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accentSoft, borderWidth: 2, borderColor: C.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  avatarText: { fontSize: 30, fontWeight: '800', color: C.accent },
  email:      { fontSize: 16, fontWeight: '600', color: C.textPrimary, marginBottom: 8 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.success + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTxt:   { fontSize: 12, fontWeight: '700', color: C.success },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 },
  sectionLabel:     { fontSize: 11, fontWeight: '800', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2 },
  editChip:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.accentSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  editChipTxt:      { fontSize: 12, fontWeight: '700', color: C.accent },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard:  { flex: 1, minWidth: 80, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  statNum:   { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  statLbl:   { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: 'center' },

  settingsCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 8 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingLabel: { flex: 1, fontSize: 15, color: C.textPrimary },
  settingValue: { fontSize: 13, color: C.textSecondary, fontWeight: '600', maxWidth: 160, textAlign: 'right' },
  divider:      { height: 1, backgroundColor: C.cardBorder, marginLeft: 52 },

  storeTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end', maxWidth: 180 },
  storeTag:     { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  storeTagTxt:  { fontSize: 10, fontWeight: '700' },

  // Edit form
  editCard:  { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, padding: 18, marginBottom: 8, gap: 4 },
  fieldLabel:{ fontSize: 11, fontWeight: '700', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: 12 },
  optTxt:    { fontWeight: '400', textTransform: 'none', letterSpacing: 0, color: C.textTertiary },
  input:     { backgroundColor: C.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.cardBorder },
  inputError:{ borderColor: C.danger + '80' },
  inputRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, paddingHorizontal: 12 },
  inputRowError: { borderColor: C.danger + '80' },
  inputFlex: { flex: 1, paddingVertical: 12, fontSize: 15, color: C.textPrimary },
  errorTxt:  { fontSize: 12, color: C.danger, marginTop: 2 },

  dropdown:  { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, zIndex: 99, marginTop: 4, overflow: 'hidden' },
  sugRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  sugBorder: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  sugTxt:    { flex: 1, fontSize: 13, color: C.textPrimary, lineHeight: 18 },

  radiusRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  radiusChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.cardBorder, borderWidth: 1.5, borderColor: C.cardBorder },
  radiusChipActive:    { backgroundColor: C.accentSoft, borderColor: C.accent },
  radiusChipTxt:       { fontSize: 13, fontWeight: '600', color: C.textSecondary },
  radiusChipTxtActive: { color: C.accent, fontWeight: '800' },

  storeGrid:    { gap: 8, marginBottom: 4 },
  storeChip:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 14, backgroundColor: C.cardElevated, borderWidth: 1.5 },
  storeChipTxt: { flex: 1, fontSize: 14, color: C.textSecondary, fontWeight: '500' },

  saveBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  saveTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelTxt: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },

  langCard:   { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 28 },
  langRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  langNative: { fontSize: 16, fontWeight: '700', color: C.textPrimary, width: 70 },
  langLabel:  { flex: 1, fontSize: 14, color: C.textSecondary },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: C.danger + '50', borderRadius: 16, paddingVertical: 14, marginTop: 8 },
  signOutTxt: { fontSize: 15, fontWeight: '700', color: C.danger },
});
