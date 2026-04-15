import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TimeFormat = '12h' | '24h';
export type FirstDayOfWeek = 'monday' | 'sunday';

type SettingsContextType = {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  firstDayOfWeek: FirstDayOfWeek;
  setFirstDayOfWeek: (value: FirstDayOfWeek) => void;
  timeOffsetMinutes: number;
  setTimeOffsetMinutes: (offset: number) => void;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_settings';

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('12h');
  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<FirstDayOfWeek>('monday');
  const [timeOffsetMinutes, setTimeOffsetMinutesState] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timeFormat) setTimeFormatState(parsed.timeFormat);
        if (parsed.firstDayOfWeek === 'monday' || parsed.firstDayOfWeek === 'sunday') setFirstDayOfWeekState(parsed.firstDayOfWeek);
        if (typeof parsed.timeOffsetMinutes === 'number') setTimeOffsetMinutesState(parsed.timeOffsetMinutes);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (format: TimeFormat, firstDay: FirstDayOfWeek, offset: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        timeFormat: format,
        firstDayOfWeek: firstDay,
        timeOffsetMinutes: offset,
      }));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const setTimeFormat = (format: TimeFormat) => {
    setTimeFormatState(format);
    saveSettings(format, firstDayOfWeek, timeOffsetMinutes);
  };

  const setFirstDayOfWeek = (value: FirstDayOfWeek) => {
    setFirstDayOfWeekState(value);
    saveSettings(timeFormat, value, timeOffsetMinutes);
  };

  const setTimeOffsetMinutes = (offset: number) => {
    setTimeOffsetMinutesState(offset);
    saveSettings(timeFormat, firstDayOfWeek, offset);
  };

  return (
    <SettingsContext.Provider value={{ timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, timeOffsetMinutes, setTimeOffsetMinutes, isLoaded }}>
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
