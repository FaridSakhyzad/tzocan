import { useCallback, useMemo } from 'react';

import { detectPreferredLanguage, languageLabels, languageLocaleMap, translate, type LanguageCode } from '@/constants/i18n';
import { useSettings } from '@/contexts/settings-context';

export function useI18n() {
  const { languageCode, setLanguageCode } = useSettings();

  const resolvedLanguageCode: LanguageCode = languageCode || detectPreferredLanguage();
  const locale = languageLocaleMap[resolvedLanguageCode];

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    return translate(resolvedLanguageCode, key, vars);
  }, [resolvedLanguageCode]);

  const weekdayShortLabels = useMemo(() => ({
    0: t('weekday.short.0'),
    1: t('weekday.short.1'),
    2: t('weekday.short.2'),
    3: t('weekday.short.3'),
    4: t('weekday.short.4'),
    5: t('weekday.short.5'),
    6: t('weekday.short.6'),
  }), [t]);

  return {
    languageCode: resolvedLanguageCode,
    setLanguageCode,
    locale,
    languageLabels,
    weekdayShortLabels,
    t,
  };
}
