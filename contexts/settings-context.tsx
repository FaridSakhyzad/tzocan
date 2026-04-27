import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectPreferredLanguage, type LanguageCode } from '@/constants/i18n';
import { DEFAULT_THEME_NAME, ThemeName } from '@/constants/ui-theme';

export type TimeFormat = '12h' | '24h';
export type FirstDayOfWeek = 'monday' | 'sunday';

type SettingsContextType = {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  firstDayOfWeek: FirstDayOfWeek;
  setFirstDayOfWeek: (value: FirstDayOfWeek) => void;
  timeOffsetMinutes: number;
  setTimeOffsetMinutes: (offset: number) => void;
  languageCode: LanguageCode;
  setLanguageCode: (languageCode: LanguageCode) => void;
  themeName: ThemeName;
  setThemeName: (themeName: ThemeName) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_settings';

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('12h');
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<FirstDayOfWeek>('monday');
  const [timeOffsetMinutes, setTimeOffsetMinutesState] = useState<number>(0);
  const [languageCode, setLanguageCodeState] = useState<LanguageCode>(detectPreferredLanguage());
  const [themeName, setThemeNameState] = useState<ThemeName>(DEFAULT_THEME_NAME);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveSettings(timeFormat, firstDayOfWeek, timeOffsetMinutes, languageCode, themeName);
  }, [firstDayOfWeek, isLoaded, languageCode, themeName, timeFormat, timeOffsetMinutes]);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timeFormat) setTimeFormatState(parsed.timeFormat);
        if (parsed.firstDayOfWeek === 'monday' || parsed.firstDayOfWeek === 'sunday') setFirstDayOfWeekState(parsed.firstDayOfWeek);
        if (typeof parsed.timeOffsetMinutes === 'number') setTimeOffsetMinutesState(parsed.timeOffsetMinutes);
        if (parsed.languageCode === 'en' || parsed.languageCode === 'es' || parsed.languageCode === 'ru' || parsed.languageCode === 'uk' || parsed.languageCode === 'fr') {
          setLanguageCodeState(parsed.languageCode);
        }
        if (parsed.themeName === 'dark' || parsed.themeName === 'light') {
          setThemeNameState(parsed.themeName);
        } else if (parsed.themeName === 'sea' || parsed.themeName === 'paper') {
          setThemeNameState('light');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (
    format: TimeFormat,
    firstDay: FirstDayOfWeek,
    offset: number,
    nextLanguageCode: LanguageCode,
    nextThemeName: ThemeName
  ) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        timeFormat: format,
        firstDayOfWeek: firstDay,
        timeOffsetMinutes: offset,
        languageCode: nextLanguageCode,
        themeName: nextThemeName,
      }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatState(format);
  };

  const setFirstDayOfWeek = (value: FirstDayOfWeek) => {
    setFirstDayOfWeekState(value);
  };

  const setTimeOffsetMinutes = (offset: number) => {
    setTimeOffsetMinutesState(offset);
  };

  const setLanguageCode = (nextLanguageCode: LanguageCode) => {
    setLanguageCodeState(nextLanguageCode);
  };

  const setThemeName = (nextThemeName: ThemeName) => {
    setThemeNameState(nextThemeName);
  };

  return (
    <SettingsContext.Provider value={{ timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, timeOffsetMinutes, setTimeOffsetMinutes, languageCode, setLanguageCode, themeName, setThemeName, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
