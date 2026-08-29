import Constants from 'expo-constants';
import type * as ExpoCalendar from 'expo-calendar';
import type { PermissionResponse } from 'expo-modules-core';
import { Platform } from 'react-native';

import { RepeatMode } from '@/types/notifications';
import { getDateTimePartsInTimezone } from '@/utils/abstract-timezone';

const CALENDAR_EVENT_DURATION_MINUTES = 15;

export type CalendarOption = {
  id: string;
  label: string;
  hint?: string;
};

export type CalendarSyncValues = {
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  repeat: RepeatMode;
  weekdays?: number[];
  label?: string;
  notes?: string;
  url?: string;
  calendarId?: string | null;
  durationMinutes?: number;
};

type CalendarSyncCity = {
  name: string;
  customName?: string;
  tz: string;
};

type CalendarModule = typeof ExpoCalendar;

type CalendarOptionsResult = {
  available: boolean;
  options: CalendarOption[];
};

let calendarModulePromise: Promise<CalendarModule | null> | null = null;

function isUnsupportedCalendarRuntime() {
  return Constants.appOwnership === 'expo';
}

async function getCalendarModule(): Promise<CalendarModule | null> {
  if (isUnsupportedCalendarRuntime()) {
    return null;
  }

  if (!calendarModulePromise) {
    calendarModulePromise = import('expo-calendar')
      .then((module) => module)
      .catch((error) => {
        console.warn('Calendar module is unavailable in this runtime', error);

        return null;
      });
  }

  return calendarModulePromise;
}

async function ensureCalendarPermissions(): Promise<boolean> {
  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return false;
  }

  try {
    const permissionResponse = await Calendar.getCalendarPermissionsAsync();
    const { status: existingStatus } = permissionResponse;
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Failed to request calendar permissions', error);

    return false;
  }
}

async function getCalendarPermissionResponse(): Promise<PermissionResponse | null> {
  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return null;
  }

  try {
    return Calendar.getCalendarPermissionsAsync();
  } catch (error) {
    console.warn('Failed to get calendar permissions', error);

    return null;
  }
}

export async function getCalendarPermissionState() {
  const permission = await getCalendarPermissionResponse();

  return {
    granted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? false,
    available: permission !== null,
  };
}

export async function requestCalendarPermission() {
  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return {
      granted: false,
      canAskAgain: false,
      available: false,
    };
  }

  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();

    return {
      granted: permission.granted,
      canAskAgain: permission.canAskAgain,
      available: true,
    };
  } catch (error) {
    console.warn('Failed to request calendar permission explicitly', error);

    return {
      granted: false,
      canAskAgain: false,
      available: true,
    };
  }
}

function getTriggerDateForTimezone(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const now = new Date();
  const parts = getDateTimePartsInTimezone(now, timezone);
  const currentDateInTz = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);
  const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

  return new Date(now.getTime() + diffMs);
}

function getCalendarEventTitle(city: CalendarSyncCity, label?: string) {
  return label?.trim() || city.customName || city.name;
}

function getCalendarEventLocation(city: CalendarSyncCity) {
  return city.customName || city.name;
}

function buildCalendarEventNotes(notes?: string) {
  return notes?.trim() || '';
}

function buildCalendarEventOccurrences(
  city: CalendarSyncCity,
  values: CalendarSyncValues
): Date[] {
  const now = new Date();
  const hasExplicitDate = Boolean(values.year && values.month && values.day);
  let anchorYear = values.year;
  let anchorMonth = values.month;
  let anchorDay = values.day;

  if (!anchorYear || !anchorMonth || !anchorDay) {
    const parts = getDateTimePartsInTimezone(now, city.tz);
    anchorYear = parts.year;
    anchorMonth = parts.month;
    anchorDay = parts.day;
  }

  const anchorTrigger = getTriggerDateForTimezone(
    city.tz,
    anchorYear,
    anchorMonth,
    anchorDay,
    values.hour,
    values.minute
  );

  if (values.repeat === RepeatMode.none) {
    if (!hasExplicitDate && anchorTrigger.getTime() <= now.getTime()) {
      const next = new Date(anchorYear, anchorMonth - 1, anchorDay + 1);

      return [
        getTriggerDateForTimezone(
          city.tz,
          next.getFullYear(),
          next.getMonth() + 1,
          next.getDate(),
          values.hour,
          values.minute
        ),
      ];
    }

    return [anchorTrigger];
  }

  if (values.repeat === RepeatMode.weekly && values.weekdays && values.weekdays.length > 0) {
    const cityTodayWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay).getDay();
    const triggers = new Map<string, Date>();

    for (const targetCityWeekday of values.weekdays) {
      const diffDays = (targetCityWeekday - cityTodayWeekday + 7) % 7;
      const cityDateForWeekday = new Date(anchorYear, anchorMonth - 1, anchorDay + diffDays);
      const localTrigger = getTriggerDateForTimezone(
        city.tz,
        cityDateForWeekday.getFullYear(),
        cityDateForWeekday.getMonth() + 1,
        cityDateForWeekday.getDate(),
        values.hour,
        values.minute
      );

      triggers.set(
        `${localTrigger.getDay()}-${localTrigger.getHours()}-${localTrigger.getMinutes()}`,
        localTrigger
      );
    }

    return Array.from(triggers.values());
  }

  return [anchorTrigger];
}

function buildCalendarEventRecurrenceRule(
  Calendar: CalendarModule,
  values: CalendarSyncValues
) {
  if (values.repeat === RepeatMode.none) {
    return null;
  }

  if (values.repeat === RepeatMode.daily) {
    return {
      frequency: Calendar.Frequency.DAILY,
    };
  }

  if (values.repeat === RepeatMode.weekly) {
    return {
      frequency: Calendar.Frequency.WEEKLY,
    };
  }

  if (values.repeat === RepeatMode.monthly) {
    return {
      frequency: Calendar.Frequency.MONTHLY,
    };
  }

  return {
    frequency: Calendar.Frequency.YEARLY,
  };
}

export async function getCalendarOptions(): Promise<CalendarOptionsResult> {
  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return {
      available: false,
      options: [],
    };
  }

  const hasPermissions = await ensureCalendarPermissions();

  if (!hasPermissions) {
    return {
      available: false,
      options: [],
    };
  }

  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const options = calendars
      .filter((calendar) => {
        if (!calendar.allowsModifications) {
          return false;
        }

        if (Platform.OS === 'android' && calendar.isSynced === false) {
          return false;
        }

        return true;
      })
      .sort((left, right) => {
        if (Boolean(left.isPrimary) !== Boolean(right.isPrimary)) {
          return left.isPrimary ? -1 : 1;
        }

        return left.title.localeCompare(right.title);
      })
      .map((calendar) => ({
        id: calendar.id,
        label: calendar.title || calendar.name || calendar.ownerAccount || calendar.id,
        hint:
          calendar.ownerAccount || calendar.source?.name || undefined,
      }));

    return {
      available: true,
      options,
    };
  } catch (error) {
    console.warn('Failed to load calendar options', error);

    return {
      available: false,
      options: [],
    };
  }
}

export async function createCalendarEntryIds(
  city: CalendarSyncCity,
  values: CalendarSyncValues
): Promise<string[] | null> {
  if (!values.calendarId) {
    return [];
  }

  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return null;
  }

  const hasPermissions = await ensureCalendarPermissions();

  if (!hasPermissions) {
    return null;
  }

  try {
    const eventStartDates = buildCalendarEventOccurrences(city, values);
    const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const title = getCalendarEventTitle(city, values.label);
    const location = getCalendarEventLocation(city);
    const notes = buildCalendarEventNotes(values.notes);
    const recurrenceRule = buildCalendarEventRecurrenceRule(Calendar, values);
    const ids: string[] = [];
    const durationMinutes = values.durationMinutes ?? CALENDAR_EVENT_DURATION_MINUTES;

    for (const startDate of eventStartDates) {
      const id = await Calendar.createEventAsync(values.calendarId, {
        title,
        location,
        notes,
        url: values.url,
        startDate,
        endDate: new Date(startDate.getTime() + durationMinutes * 60000),
        timeZone: localTimezone,
        allDay: false,
        alarms: [{ relativeOffset: 0 }],
        recurrenceRule,
      });

      ids.push(id);
    }

    return ids;
  } catch (error) {
    console.warn('Failed to create calendar entries', error);

    return null;
  }
}

export async function deleteCalendarEntryIds(
  calendarEventId?: string,
  calendarEventIds?: string[]
): Promise<void> {
  const Calendar = await getCalendarModule();

  if (!Calendar) {
    return;
  }

  const ids =
    calendarEventIds && calendarEventIds.length > 0
      ? calendarEventIds
      : calendarEventId
        ? [calendarEventId]
        : [];

  await Promise.all(
    ids.map(async (id) => {
      try {
        await Calendar.deleteEventAsync(id);
      } catch (error) {
        console.warn('Failed to delete calendar entry', error);
      }
    })
  );
}
