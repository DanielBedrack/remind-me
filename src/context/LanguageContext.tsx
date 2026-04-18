import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18nManager, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export type Language = 'en' | 'he' | 'es';

const RTL_LANGUAGES: Language[] = ['he'];
const STORAGE_KEY = '@remindme/language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  isRTL: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      const lang = (saved as Language) || (i18n.language as Language) || 'en';
      applyLanguage(lang, false);
      setLang(lang);
      setReady(true);
    });
  }, []);

  function applyLanguage(lang: Language, showReloadPrompt: boolean) {
    i18n.changeLanguage(lang);
    const shouldBeRTL = RTL_LANGUAGES.includes(lang);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
    } else {
      const currentlyRTL = I18nManager.isRTL;
      if (currentlyRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL);
        if (showReloadPrompt) {
          Alert.alert(
            i18n.t('common.restartRequired'),
            i18n.t('common.restartMessage'),
            [{ text: i18n.t('common.ok'), onPress: () => reloadApp() }]
          );
        }
      }
    }
  }

  function reloadApp() {
    // Graceful reload — works in Expo Go and standalone builds
    try {
      const Updates = require('expo-updates');
      Updates.reloadAsync?.();
    } catch {
      // expo-updates not available (web / dev without EAS) — no-op
    }
  }

  function setLanguage(lang: Language) {
    AsyncStorage.setItem(STORAGE_KEY, lang);
    applyLanguage(lang, true);
    setLang(lang);
  }

  if (!ready) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL: RTL_LANGUAGES.includes(language) }}>
      {children}
    </LanguageContext.Provider>
  );
}
