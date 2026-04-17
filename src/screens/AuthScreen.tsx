import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform as RNPlatform } from 'react-native';
import { C } from '../theme';
import { signInEmail, registerEmail, signInWithGoogle, signInWithMicrosoft, signInWithApple } from '../services/firebase';

WebBrowser.maybeCompleteAuthSession();

// Cast once to avoid per-line TS errors for EXPO_PUBLIC_* vars
const ENV = process.env as Record<string, string | undefined>;

const MICROSOFT_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint:         'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

export default function AuthScreen() {
  const [mode,     setMode]     = useState<'signin' | 'register'>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState<string | null>(null);

  // ─── Google ────────────────────────────────────────────────────────────────
  const [googleRequest, googleResponse, googlePrompt] = Google.useAuthRequest({
    webClientId:     ENV.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId:     ENV.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: ENV.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.idToken) {
        signInWithGoogle(authentication.idToken, authentication.accessToken ?? undefined)
          .catch((e) => Alert.alert('Google sign-in failed', e.message));
      }
    }
  }, [googleResponse]);

  // ─── Microsoft ─────────────────────────────────────────────────────────────
  const msClientId = ENV.EXPO_PUBLIC_MICROSOFT_CLIENT_ID ?? '';
  const [msRequest, msResponse, msPrompt] = AuthSession.useAuthRequest(
    {
      clientId:    msClientId,
      scopes:      ['openid', 'profile', 'email'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'remindme' }),
    },
    msClientId ? MICROSOFT_DISCOVERY : null
  );

  useEffect(() => {
    if (msResponse?.type === 'success' && msResponse.authentication?.accessToken) {
      signInWithMicrosoft(msResponse.authentication.accessToken)
        .catch((e) => Alert.alert('Microsoft sign-in failed', e.message));
    }
  }, [msResponse]);

  // ─── Apple (iOS only) ──────────────────────────────────────────────────────
  async function handleApple() {
    if (RNPlatform.OS !== 'ios') {
      Alert.alert('Apple Sign-In', 'Apple Sign-In is only available on iOS devices.');
      return;
    }
    try {
      const AppleAuth = await import('expo-apple-authentication');
      setLoading('apple');
      const credential = await AppleAuth.signInAsync({
        requestedScopes: [AppleAuth.AppleAuthenticationScope.FULL_NAME, AppleAuth.AppleAuthenticationScope.EMAIL],
      });
      if (credential.identityToken) await signInWithApple(credential.identityToken);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('canceled')) Alert.alert('Apple sign-in failed', msg);
    } finally { setLoading(null); }
  }

  // ─── Email / Password ──────────────────────────────────────────────────────
  async function handleEmail() {
    if (!email.trim() || !password) { Alert.alert('Missing fields', 'Please enter your email and password.'); return; }
    setLoading('email');
    try {
      if (mode === 'signin') {
        await signInEmail(email.trim(), password);
      } else {
        if (password.length < 6) { Alert.alert('Weak password', 'Password must be at least 6 characters.'); return; }
        await registerEmail(email.trim(), password);
      }
    } catch (e: unknown) {
      Alert.alert(mode === 'signin' ? 'Sign-in failed' : 'Registration failed', e instanceof Error ? e.message : String(e));
    } finally { setLoading(null); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logo}>🛒</Text>
          <Text style={styles.title}>RemindMe</Text>
          <Text style={styles.subtitle}>Your smart shopping reminder</Text>
        </View>

        <View style={styles.socialRow}>
          <SocialBtn icon="google"    label="Google"    color="#EA4335" loading={loading === 'google'}    disabled={!googleRequest}          onPress={() => { setLoading('google');    googlePrompt().finally(() => setLoading(null)); }} />
          <SocialBtn icon="microsoft" label="Microsoft" color="#00A4EF" loading={loading === 'microsoft'} disabled={!msRequest || !msClientId} onPress={() => { setLoading('microsoft'); msPrompt().finally(() => setLoading(null)); }} />
          <SocialBtn icon="apple"     label="Apple"     color="#fff"    loading={loading === 'apple'}                                        onPress={handleApple} />
        </View>

        <View style={styles.divRow}>
          <View style={styles.divLine} /><Text style={styles.divTxt}>or</Text><View style={styles.divLine} />
        </View>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={C.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={C.textSecondary} value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleEmail} />

        <TouchableOpacity style={[styles.primaryBtn, loading === 'email' && styles.dim]} onPress={handleEmail} disabled={loading === 'email'}>
          {loading === 'email'
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryTxt}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'register' : 'signin')} style={styles.toggle}>
          <Text style={styles.toggleTxt}>
            {mode === 'signin' ? "Don't have an account?  " : 'Already have an account?  '}
            <Text style={styles.toggleLink}>{mode === 'signin' ? 'Register' : 'Sign In'}</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SocialBtn({ icon, label, color, loading, disabled, onPress }: {
  icon: string; label: string; color: string; loading: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.socialBtn, disabled && styles.dim]} onPress={onPress} disabled={disabled || loading}>
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      }
      <Text style={styles.socialLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: C.bg, padding: 28, justifyContent: 'center' },
  header:     { alignItems: 'center', marginBottom: 44 },
  logo:       { fontSize: 60, marginBottom: 14 },
  title:      { fontSize: 34, fontWeight: '800', color: C.textPrimary },
  subtitle:   { fontSize: 15, color: C.textSecondary, marginTop: 6 },
  socialRow:  { flexDirection: 'row', gap: 10, marginBottom: 28 },
  socialBtn:  { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder },
  socialLabel:{ fontSize: 11, color: C.textSecondary, fontWeight: '600' },
  divRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  divLine:    { flex: 1, height: 1, backgroundColor: C.cardBorder },
  divTxt:     { marginHorizontal: 14, color: C.textSecondary, fontSize: 13 },
  input:      { backgroundColor: C.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.textPrimary, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12 },
  primaryBtn: { backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  dim:        { opacity: 0.4 },
  toggle:     { marginTop: 24, alignItems: 'center' },
  toggleTxt:  { fontSize: 14, color: C.textSecondary },
  toggleLink: { color: C.accent, fontWeight: '700' },
});
