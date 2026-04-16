import en from '@/constants/locales/en.json';
import es from '@/constants/locales/es.json';
import fr from '@/constants/locales/fr.json';
import ru from '@/constants/locales/ru.json';
import uk from '@/constants/locales/uk.json';

export type LanguageCode = 'en' | 'ru' | 'uk' | 'fr' | 'es';

export const languageLocaleMap: Record<LanguageCode, string> = {
  en: 'en-GB',
  es: 'es-ES',
  ru: 'ru-RU',
  uk: 'uk-UA',
  fr: 'fr-FR',
};

export const languageLabels: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
  uk: 'Українська',
  fr: 'Français',
};

export type TranslationMap = Record<string, string>;

export const translations: Record<LanguageCode, TranslationMap> = {
  en,
  es,
  ru,
  uk,
  fr,
};

export function detectPreferredLanguage(): LanguageCode {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();

  if (locale.startsWith('ru')) return 'ru';
  if (locale.startsWith('uk')) return 'uk';
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('es')) return 'es';

  return 'en';
}

export function translate(languageCode: LanguageCode, key: string, vars?: Record<string, string | number>): string {
  const table = translations[languageCode] || translations.en;
  const fallback = translations.en[key] || key;
  const template = table[key] || fallback;

  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}
