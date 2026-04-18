import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useItemsContext } from '../context/ItemsContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { signOut } from '../services/firebase';
import { C, STORE_COLORS } from '../theme';

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English',  native: 'English'  },
  { code: 'he', label: 'Hebrew',   native: 'עברית'    },
  { code: 'es', label: 'Spanish',  native: 'Español'  },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const { items } = useItemsContext();
  const email = user?.email ?? 'Anonymous';
  const initials = email.slice(0, 2).toUpperCase();

  const stats = (['supermarket', 'hardware', 'pharmacy', 'general'] as const).map((t) => ({
    type: t,
    count: items.filter((i) => i.storeType === t).length,
    color: STORE_COLORS[t],
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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

      {/* Language selector */}
      <Text style={styles.sectionLabel}>{t('profile.language')}</Text>
      <View style={styles.langCard}>
        {LANGUAGES.map((lang, idx) => (
          <React.Fragment key={lang.code}>
            {idx > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.langRow}
              onPress={() => setLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langNative}>{lang.native}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {language === lang.code && (
                <MaterialCommunityIcons name="check-circle" size={20} color={C.accent} />
              )}
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      {/* Settings rows */}
      <Text style={styles.sectionLabel}>{t('profile.app')}</Text>
      <View style={styles.settingsCard}>
        <SettingRow icon="map-marker-outline" label={t('profile.locationTracking')} value={t('profile.active')} valueColor={C.success} />
        <View style={styles.divider} />
        <SettingRow icon="bell-outline" label={t('profile.notifications')} value={t('profile.on')} valueColor={C.success} />
        <View style={styles.divider} />
        <SettingRow icon="information-outline" label={t('profile.version')} value="1.0.0" />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={() => signOut()} activeOpacity={0.8}>
        <MaterialCommunityIcons name="logout" size={18} color={C.danger} />
        <Text style={styles.signOutTxt}>{t('common.signOut')}</Text>
      </TouchableOpacity>

    </ScrollView>
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

  sectionLabel: { fontSize: 11, fontWeight: '800', color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard:  { flex: 1, minWidth: 80, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  statNum:   { fontSize: 26, fontWeight: '800', color: C.textPrimary },
  statLbl:   { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: 'center' },

  langCard:     { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 28 },
  langRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  langNative:   { fontSize: 16, fontWeight: '700', color: C.textPrimary, width: 70 },
  langLabel:    { flex: 1, fontSize: 14, color: C.textSecondary },

  settingsCard: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: 28 },
  settingRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingLabel: { flex: 1, fontSize: 15, color: C.textPrimary },
  settingValue: { fontSize: 14, color: C.textSecondary, fontWeight: '600' },
  divider:      { height: 1, backgroundColor: C.cardBorder, marginLeft: 52 },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: C.danger + '50', borderRadius: 16, paddingVertical: 14 },
  signOutTxt: { fontSize: 15, fontWeight: '700', color: C.danger },
});
