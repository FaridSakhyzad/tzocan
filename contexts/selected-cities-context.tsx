import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { CityRow } from '@/components/add-city-modal';

type RepeatMode = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type CityNotification = {
  id: string;
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  repeat?: RepeatMode;
  weekdays?: number[]; // JS weekday format: 0=Sun ... 6=Sat (city timeline days)
  notes?: string;
  url?: string;
  enabled: boolean;
  notificationId?: string;
  notificationIds?: string[];
  isDaily?: boolean;
};

export type SelectedCity = CityRow & {
  customName?: string;
  notifications?: CityNotification[];
};

type SelectedCitiesContextType = {
  selectedCities: SelectedCity[];
  addCity: (city: CityRow) => void;
  removeCity: (cityId: number) => void;
  updateCityName: (cityId: number, customName: string) => void;
  reorderCities: (cities: SelectedCity[]) => void;
  addNotification: (cityId: number, hour: number, minute: number, year?: number, month?: number, day?: number, notes?: string, url?: string, repeat?: RepeatMode, weekdays?: number[]) => Promise<void>;
  updateNotification: (cityId: number, notificationId: string, hour: number, minute: number, year?: number, month?: number, day?: number, notes?: string, url?: string, repeat?: RepeatMode, weekdays?: number[]) => Promise<void>;
  removeNotification: (cityId: number, notificationId: string) => Promise<void>;
  toggleNotification: (cityId: number, notificationId: string, enabled: boolean) => Promise<boolean>;
  isLoaded: boolean;
};

const STORAGE_KEY = '@tzalac_cities';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getTriggerDateForTimezone(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const now = new Date();

  const targetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = targetFormatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const currentYearInTz = getPart('year');
  const currentMonthInTz = getPart('month');
  const currentDayInTz = getPart('day');
  const currentHourInTz = getPart('hour');
  const currentMinuteInTz = getPart('minute');
  const currentSecondInTz = getPart('second');

  const currentDateInTz = new Date(currentYearInTz, currentMonthInTz - 1, currentDayInTz, currentHourInTz, currentMinuteInTz, currentSecondInTz);
  const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);

  const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

  const triggerDate = new Date(now.getTime() + diffMs);

  return triggerDate;
}

async function scheduleNotification(
  city: SelectedCity,
  hour: number,
  minute: number,
  year?: number,
  month?: number,
  day?: number,
  notes?: string,
  url?: string,
  repeat: RepeatMode = 'none',
  weekdays: number[] = []
): Promise<string[] | null> {
  if (hour === undefined || minute === undefined) {
    console.warn('Cannot schedule notification: missing time values');
    return null;
  }

  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const cityName = city.customName || city.name;

  const now = new Date();
  const hasExplicitDate = Boolean(year && month && day);
  let anchorYear = year;
  let anchorMonth = month;
  let anchorDay = day;

  // If date is not provided, anchor to "today in target city"
  if (!anchorYear || !anchorMonth || !anchorDay) {
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: city.tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = targetFormatter.formatToParts(now);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    anchorYear = getPart('year');
    anchorMonth = getPart('month');
    anchorDay = getPart('day');
  }

  let anchorTrigger = getTriggerDateForTimezone(city.tz, anchorYear, anchorMonth, anchorDay, hour, minute);
  const localHour = anchorTrigger.getHours();
  const localMinute = anchorTrigger.getMinutes();
  const localWeekday = anchorTrigger.getDay() + 1; // 1..7
  const localDayOfMonth = anchorTrigger.getDate();
  const localMonth = anchorTrigger.getMonth() + 1;

  const body = notes ? `It's ${timeString} in ${cityName}\n${notes}` : `It's ${timeString} in ${cityName}`;

  if (repeat === 'none') {
    if (anchorTrigger.getTime() <= Date.now()) {
      if (!hasExplicitDate) {
        const next = new Date(anchorYear, anchorMonth - 1, anchorDay + 1);
        anchorYear = next.getFullYear();
        anchorMonth = next.getMonth() + 1;
        anchorDay = next.getDate();
        anchorTrigger = getTriggerDateForTimezone(city.tz, anchorYear, anchorMonth, anchorDay, hour, minute);
      } else {
        console.warn('Cannot schedule one-time notification in the past');
        return null;
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cityName}`,
        body,
        sound: true,
        data: { url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: anchorTrigger,
      },
    });
    return [notificationId];
  }

  if (repeat === 'daily') {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cityName}`,
        body,
        sound: true,
        data: { url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: localHour,
        minute: localMinute,
      },
    });
    return [notificationId];
  }

  if (repeat === 'weekly') {
    const targetCityWeekdays = weekdays.length > 0 ? weekdays : [new Date().getDay()];
    const cityTodayWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay).getDay();
    const uniqueTriggers = new Map<string, { weekday: number; hour: number; minute: number }>();

    for (const targetCityWeekday of targetCityWeekdays) {
      const diffDays = (targetCityWeekday - cityTodayWeekday + 7) % 7;
      const cityDateForWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay + diffDays);
      const localTrigger = getTriggerDateForTimezone(
        city.tz,
        cityDateForWeekday.getFullYear(),
        cityDateForWeekday.getMonth() + 1,
        cityDateForWeekday.getDate(),
        hour,
        minute
      );
      const weeklyWeekday = localTrigger.getDay() + 1;
      const weeklyHour = localTrigger.getHours();
      const weeklyMinute = localTrigger.getMinutes();
      uniqueTriggers.set(`${weeklyWeekday}-${weeklyHour}-${weeklyMinute}`, {
        weekday: weeklyWeekday,
        hour: weeklyHour,
        minute: weeklyMinute,
      });
    }

    const ids: string[] = [];
    for (const trigger of uniqueTriggers.values()) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${cityName}`,
          body,
          sound: true,
          data: { url },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: trigger.weekday,
          hour: trigger.hour,
          minute: trigger.minute,
        },
      });
      ids.push(id);
    }
    return ids;
  }

  if (repeat === 'monthly') {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${cityName}`,
        body,
        sound: true,
        data: { url },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: localDayOfMonth,
        hour: localHour,
        minute: localMinute,
      },
    });
    return [notificationId];
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${cityName}`,
      body,
      sound: true,
      data: { url },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      month: localMonth,
      day: localDayOfMonth,
      hour: localHour,
      minute: localMinute,
    },
  });
  return [notificationId];
}

async function cancelNotificationIds(notification: CityNotification): Promise<void> {
  const ids = notification.notificationIds && notification.notificationIds.length > 0
    ? notification.notificationIds
    : notification.notificationId
      ? [notification.notificationId]
      : [];

  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

const SelectedCitiesContext = createContext<SelectedCitiesContextType | null>(null);

export function SelectedCitiesProvider({ children }: { children: ReactNode }) {
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSelectedCities(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load cities:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveCities = async (cities: SelectedCity[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
    } catch (error) {
      console.error('Failed to save cities:', error);
    }
  };

  const addCity = (city: CityRow) => {
    setSelectedCities((prev) => {
      const isAlreadySelected = prev.some((c) => c.id === city.id);
      if (isAlreadySelected) {
        return prev;
      }
      const newCities = [...prev, city];

      saveCities(newCities);

      return newCities;
    });
  };

  const removeCity = (cityId: number) => {
    setSelectedCities((prev) => {
      const newCities = prev.filter((c) => c.id !== cityId);

      saveCities(newCities);

      return newCities;
    });
  };

  const updateCityName = (cityId: number, customName: string) => {
    setSelectedCities((prev) => {
      const newCities = prev.map((c) =>
        c.id === cityId ? { ...c, customName: customName || undefined } : c
      );

      saveCities(newCities);

      return newCities;
    });
  };

  const reorderCities = (cities: SelectedCity[]) => {
    setSelectedCities(cities);

    saveCities(cities);
  };

  const addNotification = async (cityId: number, hour: number, minute: number, year?: number, month?: number, day?: number, notes?: string, url?: string, repeat: RepeatMode = 'none', weekdays: number[] = []) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return;
    }

    const city = selectedCities.find(c => c.id === cityId);
    if (!city) return;

    const notificationIds = await scheduleNotification(city, hour, minute, year, month, day, notes, url, repeat, weekdays);

    if (!notificationIds || notificationIds.length === 0) {
      return;
    }

    const newNotification: CityNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      year,
      month,
      day,
      hour,
      minute,
      repeat,
      weekdays: weekdays.length > 0 ? weekdays : undefined,
      notes,
      url,
      enabled: true,
      notificationId: notificationIds[0],
      notificationIds,
      isDaily: repeat === 'daily',
    };

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: [...(c.notifications || []), newNotification],
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const updateNotification = async (cityId: number, notificationId: string, hour: number, minute: number, year?: number, month?: number, day?: number, notes?: string, url?: string, repeat: RepeatMode = 'none', weekdays: number[] = []) => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return;

    // Cancel old notification
    await cancelNotificationIds(notification);

    // Schedule new notification
    const newSystemNotificationIds = await scheduleNotification(city, hour, minute, year, month, day, notes, url, repeat, weekdays);

    if (!newSystemNotificationIds || newSystemNotificationIds.length === 0) {
      return;
    }

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: (c.notifications || []).map(n =>
              n.id === notificationId
                ? {
                    ...n,
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    repeat,
                    weekdays: weekdays.length > 0 ? weekdays : undefined,
                    notes,
                    url,
                    enabled: true,
                    notificationId: newSystemNotificationIds[0],
                    notificationIds: newSystemNotificationIds,
                    isDaily: repeat === 'daily',
                  }
                : n
            ),
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const removeNotification = async (cityId: number, notificationId: string) => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (notification) {
      await cancelNotificationIds(notification);
    }

    setSelectedCities((prev) => {
      const newCities = prev.map((c) => {
        if (c.id === cityId) {
          return {
            ...c,
            notifications: (c.notifications || []).filter(n => n.id !== notificationId),
          };
        }
        return c;
      });

      saveCities(newCities);

      return newCities;
    });
  };

  const toggleNotification = async (cityId: number, notificationId: string, enabled: boolean): Promise<boolean> => {
    const city = selectedCities.find(c => c.id === cityId);
    const notification = city?.notifications?.find(n => n.id === notificationId);

    if (!city || !notification) return false;

    if (enabled) {
      const newNotificationId = await scheduleNotification(
        city,
        notification.hour,
        notification.minute,
        notification.year,
        notification.month,
        notification.day,
        notification.notes,
        notification.url,
        notification.repeat || (notification.isDaily ? 'daily' : 'none'),
        notification.weekdays || []
      );

      if (!newNotificationId || newNotificationId.length === 0) {
        return false;
      }

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? { ...n, enabled: true, notificationId: newNotificationId[0], notificationIds: newNotificationId }
                  : n
              ),
            };
          }
          return c;
        });

        saveCities(newCities);

        return newCities;
      });

      return true;
    } else {
      await cancelNotificationIds(notification);

      setSelectedCities((prev) => {
        const newCities = prev.map((c) => {
          if (c.id === cityId) {
            return {
              ...c,
              notifications: (c.notifications || []).map(n =>
                n.id === notificationId
                  ? { ...n, enabled: false, notificationId: undefined, notificationIds: undefined }
                  : n
              ),
            };
          }
          return c;
        });

        saveCities(newCities);

        return newCities;
      });

      return true;
    }
  };

  return (
    <SelectedCitiesContext.Provider value={{ selectedCities, addCity, removeCity, updateCityName, reorderCities, addNotification, updateNotification, removeNotification, toggleNotification, isLoaded }}>
      {children}
    </SelectedCitiesContext.Provider>
  );
}

export function useSelectedCities() {
  const context = useContext(SelectedCitiesContext);

  if (!context) {
    throw new Error('useSelectedCities must be used within a SelectedCitiesProvider');
  }

  return context;
}
