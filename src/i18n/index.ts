import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import he from './locales/he.json';
import es from './locales/es.json';

const deviceLocale = getLocales()[0]?.languageCode ?? 'en';
const supportedLocales = ['en', 'he', 'es'];
const defaultLocale = supportedLocales.includes(deviceLocale) ? deviceLocale : 'en';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: { en: { translation: en }, he: { translation: he }, es: { translation: es } },
    lng: defaultLocale,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
