import { createContext, useContext, useState, ReactNode } from 'react';

export type TimeFormat = '12h' | '24h';

type SettingsContextType = {
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  timeOffsetMinutes: number;
  setTimeOffsetMinutes: (offset: number) => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState<number>(0);

  return (
    <SettingsContext.Provider value={{ timeFormat, setTimeFormat, timeOffsetMinutes, setTimeOffsetMinutes }}>
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
