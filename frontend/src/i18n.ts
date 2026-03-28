import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
    },
    lng: 'en', // Default language
    fallbackLng: 'en', // Fallback if translation key missing
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
