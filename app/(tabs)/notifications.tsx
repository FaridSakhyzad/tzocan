import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';
import { DeleteNotificationModal } from '@/components/delete-notification-modal';
import { NotificationPickerModal } from '@/components/notification-picker-modal';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import {
  CityOrderMode,
  NotificationOrderMode,
  useNotificationsSort,
} from '@/contexts/notifications-sort-context';
import { CityNotification, useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat, FirstDayOfWeek } from '@/contexts/settings-context';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import type { UiTheme } from '@/constants/ui-theme.types';
import { getCityDisplayName } from '@/utils/city-display';

import ClockIcon from '../../assets/images/icon--clock-2--outlined.svg';
import CalendarIcon from '../../assets/images/icon--calendar-2--outlined.svg';
import EditIcon from '../../assets/images/icon--edit-2.svg';
import DeleteIcon from '../../assets/images/icon--delete-3.svg';
import RepeatIcon from '../../assets/images/icon--repeat-1.svg';
import IconAddCity from '@/assets/images/icon--cities--outlined.svg';
import IconAddNotification from '@/assets/images/icon--notification-3--outlined.svg';

const NOTIFICATIONS_CITY_TIME_REFRESH_INTERVAL_MS = 5000;
const NOTIFICATION_SWITCH_THUMB_TRAVEL = 16;
const CITY_SORT_SECTION_HEIGHT = 220;

function NotificationToggleSwitch({
  enabled,
  onPress,
  theme,
}: {
  enabled: boolean;
  onPress: () => void;
  theme: UiTheme;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const thumbTranslateX = useState(() => new Animated.Value(enabled ? NOTIFICATION_SWITCH_THUMB_TRAVEL : 0))[0];

  useEffect(() => {
    Animated.timing(thumbTranslateX, {
      toValue: enabled ? NOTIFICATION_SWITCH_THUMB_TRAVEL : 0,
      duration: 300,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [enabled, thumbTranslateX]);

  return (
    <Pressable onPress={onPress} style={styles.toggleNotificationSwitch}>
      <Animated.View
        style={[
          styles.toggleNotificationSwitchThumb,
          { transform: [{ translateX: thumbTranslateX }] },
        ]}
      />
    </Pressable>
  );
}

function getDatePartsInTimezone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
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
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
  const cityNowDate = new Date(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );
  const cityTargetDate = new Date(year, month - 1, day, hour, minute, 0);
  const diffMs = cityTargetDate.getTime() - cityNowDate.getTime();

  return new Date(now.getTime() + diffMs);
}

function getNotificationRepeatLabel(
  notification: CityNotification,
  firstDayOfWeek: FirstDayOfWeek,
  weekdayShortLabels: Record<number, string>,
  t: (key: string) => string
) {
  const normalizedRepeat = typeof notification.repeat === 'string'
    ? notification.repeat.toLowerCase()
    : undefined;
  const repeat =
    normalizedRepeat === 'daily' ||
    normalizedRepeat === 'weekly' ||
    normalizedRepeat === 'monthly' ||
    normalizedRepeat === 'yearly' ||
    normalizedRepeat === 'none'
      ? normalizedRepeat
      : notification.isDaily
        ? 'daily'
        : notification.weekdays && notification.weekdays.length > 0
          ? 'weekly'
          : 'none';

  if (repeat === 'weekly') {
    const order = firstDayOfWeek === 'sunday'
      ? [0, 1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6, 0];
    const sortOrder = new Map(order.map((value, index) => [value, index]));
    const days = (notification.weekdays || [])
      .slice()
      .sort((a, b) => (sortOrder.get(a) ?? 0) - (sortOrder.get(b) ?? 0))
      .map((day) => weekdayShortLabels[day]);

    return days.length > 0 ? `${days.join(', ')}` : t('common.weekly');
  }

  if (repeat === 'daily') {
    return t('common.daily');
  }

  if (repeat === 'monthly') {
    return t('common.monthly');
  }

  if (repeat === 'yearly') {
    return t('common.yearly');
  }

  return null;
}

function getNotificationDateLabel(notification: CityNotification, locale: string) {
  if (notification.day && notification.month && notification.year) {
    const scheduledDate = new Date(notification.year, notification.month - 1, notification.day);
    const currentYear = new Date().getFullYear();
    const includeYear = notification.year !== currentYear;
    const parts = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).formatToParts(scheduledDate);
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
    const baseLabel = `${getPart('weekday')} ${getPart('day')} ${getPart('month')}`;

    if (includeYear) {
      return `${baseLabel}, ${getPart('year')}`;
    }

    return baseLabel;
  }

  return null;
}

function formatDateLabel(date: Date, locale: string) {
  const currentYear = new Date().getFullYear();
  const includeYear = date.getFullYear() !== currentYear;
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const baseLabel = `${getPart('weekday')} ${getPart('day')} ${getPart('month')}`;

  if (includeYear) {
    return `${baseLabel}, ${getPart('year')}`;
  }

  return baseLabel;
}

function getNotificationTriggerDate(cityTz: string, notification: CityNotification) {
  const now = new Date();

  let cityYear: number;
  let cityMonth: number;
  let cityDay: number;
  let triggerDate: Date;

  if (notification.year && notification.month && notification.day && !notification.isDaily) {
    cityYear = notification.year;
    cityMonth = notification.month;
    cityDay = notification.day;
    triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);
  } else {
    const cityNow = getDatePartsInTimezone(now, cityTz);
    cityYear = cityNow.year;
    cityMonth = cityNow.month;
    cityDay = cityNow.day;
    triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);

    if (triggerDate.getTime() <= now.getTime()) {
      const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
      cityYear = next.getFullYear();
      cityMonth = next.getMonth() + 1;
      cityDay = next.getDate();
      triggerDate = getTriggerDateForTimezone(cityTz, cityYear, cityMonth, cityDay, notification.hour, notification.minute);
    }
  }

  return triggerDate;
}

function getNotificationCityTriggerDateParts(cityTz: string, notification: CityNotification) {
  const now = new Date();
  let cityYear: number;
  let cityMonth: number;
  let cityDay: number;

  if (notification.year && notification.month && notification.day && !notification.isDaily) {
    cityYear = notification.year;
    cityMonth = notification.month;
    cityDay = notification.day;
  } else {
    const cityNow = getDatePartsInTimezone(now, cityTz);
    cityYear = cityNow.year;
    cityMonth = cityNow.month;
    cityDay = cityNow.day;

    const sameDayTrigger = getTriggerDateForTimezone(
      cityTz,
      cityYear,
      cityMonth,
      cityDay,
      notification.hour,
      notification.minute
    );

    if (sameDayTrigger.getTime() <= now.getTime()) {
      const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
      cityYear = next.getFullYear();
      cityMonth = next.getMonth() + 1;
      cityDay = next.getDate();
    }
  }

  return {
    year: cityYear,
    month: cityMonth,
    day: cityDay,
  };
}

function getNotificationLocalDayShiftLabel(cityTz: string, notification: CityNotification, t: (key: string) => string) {
  const cityTriggerDateParts = getNotificationCityTriggerDateParts(cityTz, notification);
  const triggerDate = getNotificationTriggerDate(cityTz, notification);
  const localStamp = Date.UTC(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
  const cityStamp = Date.UTC(
    cityTriggerDateParts.year,
    cityTriggerDateParts.month - 1,
    cityTriggerDateParts.day
  );
  const dayDiff = Math.round((localStamp - cityStamp) / 86400000);

  if (dayDiff > 0) {
    return t('common.nextDay');
  }

  if (dayDiff < 0) {
    return t('common.previousDay');
  }

  return null;
}

function getNotificationLocalMonthOrYearShiftLabel(cityTz: string, notification: CityNotification, t: (key: string) => string) {
  const cityTriggerDateParts = getNotificationCityTriggerDateParts(cityTz, notification);
  const triggerDate = getNotificationTriggerDate(cityTz, notification);
  const localYear = triggerDate.getFullYear();
  const localMonth = triggerDate.getMonth() + 1;

  if (localYear > cityTriggerDateParts.year) {
    return t('common.nextYear');
  }

  if (localYear < cityTriggerDateParts.year) {
    return t('common.previousYear');
  }

  if (localMonth > cityTriggerDateParts.month) {
    return t('common.nextMonth');
  }

  if (localMonth < cityTriggerDateParts.month) {
    return t('common.previousMonth');
  }

  return null;
}

function getNotificationLocalTime(
  cityTz: string,
  notification: CityNotification,
  timeFormat: TimeFormat
) {
  const triggerDate = getNotificationTriggerDate(cityTz, notification);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(triggerDate);
}

function getNotificationLocalDate(cityTz: string, notification: CityNotification, locale: string) {
  return formatDateLabel(getNotificationTriggerDate(cityTz, notification), locale);
}

function hasExplicitNotificationDate(notification: CityNotification) {
  return Boolean(notification.year && notification.month && notification.day);
}

function getNotificationLocalSortDate(cityTz: string, notification: CityNotification) {
  if (hasExplicitNotificationDate(notification)) {
    return getTriggerDateForTimezone(
      cityTz,
      notification.year!,
      notification.month!,
      notification.day!,
      notification.hour,
      notification.minute
    );
  }

  const cityNow = getDatePartsInTimezone(new Date(), cityTz);

  return getTriggerDateForTimezone(
    cityTz,
    cityNow.year,
    cityNow.month,
    cityNow.day,
    notification.hour,
    notification.minute
  );
}

function getNotificationCreatedAt(notification: CityNotification) {
  if (typeof notification.createdAt === 'number' && Number.isFinite(notification.createdAt)) {
    return notification.createdAt;
  }

  const fromId = parseInt(notification.id.split('-')[0] || '', 10);

  return Number.isFinite(fromId) ? fromId : 0;
}

function getTimezoneOffsetMinutes(timezone: string) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((part) => part.type === type)?.value || '0', 10);
  const cityAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  return Math.round((cityAsUtc - now.getTime()) / 60000);
}

function getNextDirectionalMode(currentMode: 'none' | 'asc' | 'desc') {
  if (currentMode === 'none') {
    return 'asc';
  }

  if (currentMode === 'asc') {
    return 'desc';
  }

  return 'asc';
}

function getDirectionalLabel(baseLabel: string, mode: 'none' | 'asc' | 'desc') {
  if (mode === 'asc') {
    return `${baseLabel} ↑`;
  }

  if (mode === 'desc') {
    return `${baseLabel} ↓`;
  }

  return baseLabel;
}

function getNotificationOrderDirection(orderMode: NotificationOrderMode) {
  if (orderMode.endsWith('-asc')) {
    return 'asc' as const;
  }

  if (orderMode.endsWith('-desc')) {
    return 'desc' as const;
  }

  return 'none' as const;
}

function getCityOrderDirection(orderMode: CityOrderMode) {
  if (orderMode.endsWith('-asc')) {
    return 'asc' as const;
  }

  if (orderMode.endsWith('-desc')) {
    return 'desc' as const;
  }

  return 'none' as const;
}

type NotificationEntry = {
  city: SelectedCity;
  notification: CityNotification;
};

function compareNotificationEntries(
  a: NotificationEntry,
  b: NotificationEntry,
  orderMode: NotificationOrderMode,
  locale: string
) {
  if (orderMode === 'none') {
    return 0;
  }

  if (orderMode === 'trigger-asc' || orderMode === 'trigger-desc') {
    const direction = orderMode === 'trigger-asc' ? 1 : -1;
    const aHasDate = hasExplicitNotificationDate(a.notification);
    const bHasDate = hasExplicitNotificationDate(b.notification);

    if (aHasDate !== bHasDate) {
      return aHasDate ? 1 : -1;
    }

    const aTime = getNotificationLocalSortDate(a.city.tz, a.notification).getTime();
    const bTime = getNotificationLocalSortDate(b.city.tz, b.notification).getTime();

    if (aTime !== bTime) {
      return (aTime - bTime) * direction;
    }
  }

  if (orderMode === 'created-asc' || orderMode === 'created-desc') {
    const direction = orderMode === 'created-asc' ? 1 : -1;
    const aCreatedAt = getNotificationCreatedAt(a.notification);
    const bCreatedAt = getNotificationCreatedAt(b.notification);

    if (aCreatedAt !== bCreatedAt) {
      return (aCreatedAt - bCreatedAt) * direction;
    }
  }

  const aCityName = a.city.customName || a.city.name;
  const bCityName = b.city.customName || b.city.name;
  const cityCompare = aCityName.localeCompare(bCityName, locale, { sensitivity: 'base' });

  if (cityCompare !== 0) {
    return cityCompare;
  }

  const aLabel = a.notification.label || '';
  const bLabel = b.notification.label || '';
  const labelCompare = aLabel.localeCompare(bLabel, locale, { sensitivity: 'base' });

  if (labelCompare !== 0) {
    return labelCompare;
  }

  return a.notification.id.localeCompare(b.notification.id, locale, { sensitivity: 'base' });
}

function sortNotificationEntries(
  entries: NotificationEntry[],
  orderMode: NotificationOrderMode,
  locale: string
) {
  if (orderMode === 'none') {
    return entries;
  }

  return entries.slice().sort((a, b) => compareNotificationEntries(a, b, orderMode, locale));
}

function getCurrentTimeInTimezone(timezone: string, timeFormat: TimeFormat, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date());
}

function formatScheduledTime(hour: number, minute: number, timeFormat: TimeFormat, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(2027, 0, 1, hour, minute));
}

export default function Notifications() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { t, locale, weekdayShortLabels } = useI18n();
  const { sortState, setSortState, isSortPickerVisible, closeSortPicker } = useNotificationsSort();
  const { selectedCities, reorderCities, removeCity, removeNotification, toggleNotification, updateNotification, addNotification, addCity } = useSelectedCities();
  const { timeFormat, firstDayOfWeek } = useSettings();
  const { isEditMode } = useEditMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));
  const [, setClockTick] = useState(0);
  const [isAddCityModalVisible, setIsAddCityModalVisible] = useState(false);
  const [isAddNotificationModalVisible, setIsAddNotificationModalVisible] = useState(false);
  const [selectedAddNotificationCityId, setSelectedAddNotificationCityId] = useState<number | null>(null);
  const [draftSortState, setDraftSortState] = useState(sortState);
  const citySortSectionAnimation = useState(() => new Animated.Value(sortState.groupByCity ? 1 : 0))[0];

  const [editingTarget, setEditingTarget] = useState<{
    city: SelectedCity;
    notification: CityNotification;
  } | null>(null);
  const [cityPendingDelete, setCityPendingDelete] = useState<SelectedCity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    city: SelectedCity;
    notification: CityNotification;
  } | null>(null);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setClockTick((value) => value + 1);

    const interval = setInterval(() => {
      setClockTick((value) => value + 1);
    }, NOTIFICATIONS_CITY_TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isFocused]);

  useEffect(() => {
    if (isSortPickerVisible) {
      setDraftSortState(sortState);
    }
  }, [isSortPickerVisible, sortState]);

  useEffect(() => {
    Animated.timing(citySortSectionAnimation, {
      toValue: draftSortState.groupByCity ? 1 : 0,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false,
    }).start();
  }, [citySortSectionAnimation, draftSortState.groupByCity]);

  const citiesWithNotifications = selectedCities.filter(
    (city) => city.notifications && city.notifications.length > 0
  );

  const totalNotifications = citiesWithNotifications.reduce(
    (sum, city) => sum + (city.notifications?.length || 0),
    0
  );

  const groupedCityEntries = useMemo(() => {
    const entries = citiesWithNotifications.map((city) => ({
      city,
      notifications: sortNotificationEntries(
        (city.notifications || []).map((notification) => ({ city, notification })),
        sortState.notificationOrder,
        locale
      ).map(({ notification }) => notification),
    }));

    if (!sortState.groupByCity || sortState.cityOrder === 'none') {
      return entries;
    }

    return entries.slice().sort((a, b) => {
      if (sortState.cityOrder === 'name-asc' || sortState.cityOrder === 'name-desc') {
        const direction = sortState.cityOrder === 'name-asc' ? 1 : -1;
        const aName = a.city.customName || a.city.name;
        const bName = b.city.customName || b.city.name;
        const byName = aName.localeCompare(bName, locale, { sensitivity: 'base' });

        if (byName !== 0) {
          return byName * direction;
        }

        return a.city.name.localeCompare(b.city.name, locale, { sensitivity: 'base' }) * direction;
      }

      const direction = sortState.cityOrder === 'timezone-asc' ? 1 : -1;
      const aOffset = getTimezoneOffsetMinutes(a.city.tz);
      const bOffset = getTimezoneOffsetMinutes(b.city.tz);

      if (aOffset !== bOffset) {
        return (aOffset - bOffset) * direction;
      }

      const byTimezone = a.city.tz.localeCompare(b.city.tz, locale, { sensitivity: 'base' });

      if (byTimezone !== 0) {
        return byTimezone * direction;
      }

      const aName = a.city.customName || a.city.name;
      const bName = b.city.customName || b.city.name;

      return aName.localeCompare(bName, locale, { sensitivity: 'base' }) * direction;
    });
  }, [citiesWithNotifications, locale, sortState.cityOrder, sortState.groupByCity, sortState.notificationOrder]);

  const linearNotificationEntries = useMemo(() => {
    const baseEntries = citiesWithNotifications.flatMap((city) =>
      (city.notifications || []).map((notification) => ({
        city,
        notification,
      }))
    );

    return sortNotificationEntries(baseEntries, sortState.notificationOrder, locale);
  }, [citiesWithNotifications, locale, sortState.notificationOrder]);

  const notificationCityOptions = selectedCities.map((city) => ({
    id: city.id,
    label: getCityDisplayName(city, localizedCityNames[city.cityId]),
    hint: city.tz,
    timezone: city.tz,
  }));

  const selectedAddNotificationCity = selectedCities.find(
    (city) => city.id === selectedAddNotificationCityId
  ) || null;

  const citySortSectionStyle = useMemo(() => ({
    opacity: citySortSectionAnimation,
    height: citySortSectionAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, CITY_SORT_SECTION_HEIGHT],
    }),
    transform: [
      {
        translateY: citySortSectionAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  }), [citySortSectionAnimation]);

  const handleToggleNotification = async (cityId: number, notificationId: string, enabled: boolean) => {
    await toggleNotification(cityId, notificationId, !enabled);
  };

  const handleOpenDeleteNotificationModal = (city: SelectedCity, notification: CityNotification) => {
    setDeleteTarget({ city, notification });
  };

  const handleCloseDeleteNotificationModal = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDeleteNotification = async () => {
    if (!deleteTarget) {
      return;
    }

    await removeNotification(deleteTarget.city.id, deleteTarget.notification.id);
    setDeleteTarget(null);
  };

  const handleCityPress = (cityId: number) => {
    if (!isEditMode) {
      router.replace({ pathname: '/edit-city', params: { cityId: cityId.toString() } });
    }
  };

  const handleOpenDeleteCityModal = (city: SelectedCity) => {
    setCityPendingDelete(city);
  };

  const handleCloseDeleteCityModal = () => {
    setCityPendingDelete(null);
  };

  const handleConfirmDeleteCity = () => {
    if (!cityPendingDelete) {
      return;
    }

    removeCity(cityPendingDelete.id);
    setCityPendingDelete(null);
  };

  const handleOpenAddCityModal = () => {
    setIsAddCityModalVisible(true);
  };

  const handleCloseAddCityModal = () => {
    setIsAddCityModalVisible(false);
  };

  const handleSaveCity = (city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  };

  const handleOpenAddNotificationModal = () => {
    setSelectedAddNotificationCityId(selectedCities[0]?.id ?? null);
    setIsAddNotificationModalVisible(true);
  };

  const handleCloseAddNotificationModal = () => {
    setIsAddNotificationModalVisible(false);
  };

  const handleOpenUrl = async (url: string) => {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(withProtocol);

    if (canOpen) {
      await Linking.openURL(withProtocol);
    }
  };

  const handleSaveEditedNotification = async (values: NotificationFormValues) => {
    if (!editingTarget) {
      return false;
    }

    return await updateNotification(
      editingTarget.city.id,
      editingTarget.notification.id,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );
  };

  const handleSaveAddedNotification = async (values: NotificationFormValues) => {
    if (!selectedAddNotificationCityId) {
      return false;
    }

    const didSave = await addNotification(
      selectedAddNotificationCityId,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );

    if (didSave) {
      setIsAddNotificationModalVisible(false);
    }

    return didSave;
  };

  const handleEditNotification = (city: SelectedCity, notification: CityNotification) => {
    setEditingTarget({ city, notification });
  };

  const handleApplySortMode = () => {
    setSortState(draftSortState);
    closeSortPicker();
  };

  const handleToggleDraftGrouping = () => {
    setDraftSortState((currentState) => ({
      ...currentState,
      groupByCity: !currentState.groupByCity,
    }));
  };

  const handleToggleDraftNotificationOrder = (sortFamily: 'trigger' | 'created') => {
    setDraftSortState((currentState) => {
      const currentDirection = sortFamily === 'trigger'
        ? getNotificationOrderDirection(
            currentState.notificationOrder.startsWith('trigger') ? currentState.notificationOrder : 'none'
          )
        : getNotificationOrderDirection(
            currentState.notificationOrder.startsWith('created') ? currentState.notificationOrder : 'none'
          );
      const nextDirection = getNextDirectionalMode(currentDirection);

      return {
        ...currentState,
        notificationOrder:
          nextDirection === 'none'
            ? 'none'
            : `${sortFamily}-${nextDirection}` as NotificationOrderMode,
      };
    });
  };

  const handleToggleDraftCityOrder = (sortFamily: 'name' | 'timezone') => {
    setDraftSortState((currentState) => {
      const currentDirection = sortFamily === 'name'
        ? getCityOrderDirection(
            currentState.cityOrder.startsWith('name') ? currentState.cityOrder : 'none'
          )
        : getCityOrderDirection(
            currentState.cityOrder.startsWith('timezone') ? currentState.cityOrder : 'none'
          );
      const nextDirection = getNextDirectionalMode(currentDirection);

      return {
        ...currentState,
        cityOrder: `${sortFamily}-${nextDirection}` as CityOrderMode,
      };
    });
  };

  const renderNotificationCard = (
    city: SelectedCity,
    notification: CityNotification,
    index: number,
    options?: { showCityName?: boolean }
  ) => {
    const notificationDateLabel = getNotificationDateLabel(notification, locale);
    const notificationRepeatLabel = getNotificationRepeatLabel(notification, firstDayOfWeek, weekdayShortLabels, t);
    const notificationLocalDayShiftLabel = getNotificationLocalDayShiftLabel(city.tz, notification, t);
    const notificationLocalMonthOrYearShiftLabel = getNotificationLocalMonthOrYearShiftLabel(city.tz, notification, t);

    return (
      <View
        key={`${city.id}-${notification.id}`}
        style={[
          styles.notificationItem,
          index % 2 === 1 && styles.notificationItemEven,
        ]}
      >
        <View style={styles.notificationDetails}>
          {options?.showCityName && (
            <Text style={styles.notificationParentCity}>
              {getCityDisplayName(city, localizedCityNames[city.cityId])}
            </Text>
          )}

          {!!notification.label && notification.label.length > 0 ? (
            <Text style={styles.notificationLabel}>{notification.label}</Text>
          ) : (
            <Text style={styles.notificationLabelEmpty}>{t('common.notification')}</Text>
          )}

          {!!notification.notes && (
            <Text style={styles.notificationNotes}>{notification.notes}</Text>
          )}

          {!!notification.url && (
            <Pressable onPress={() => handleOpenUrl(notification.url!)}>
              <Text style={styles.notificationUrl}>{notification.url}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.notificationDateTime}>
          <View style={styles.notificationTime}>
            <View style={styles.notificationCityTime}>
                <ClockIcon
                  style={styles.notificationCityTimeIcon}
                  fill={theme.text.primary}
                />
              <Text style={styles.notificationCityTimeText}>
                {formatScheduledTime(notification.hour, notification.minute, timeFormat, locale)}
              </Text>
            </View>

            <View style={styles.notificationLocalTime}>
              <Text style={styles.notificationLocalTimeLabel}>
                {t('common.yourTime')}
              </Text>
              <Text style={styles.notificationLocalTimeText}>
                {getNotificationLocalTime(city.tz, notification, timeFormat)}
              </Text>

              {!!notificationLocalDayShiftLabel && (
                <Text style={styles.notificationLocalDayShiftText}>
                  {notificationLocalDayShiftLabel}
                </Text>
              )}
            </View>
          </View>

          {notificationDateLabel && (
            <View style={styles.notificationDate}>
              <View style={styles.notificationCityDate}>
                <CalendarIcon
                  style={styles.notificationCityDateIcon}
                  fill={theme.text.primary}
                />
                <Text style={styles.notificationCityDateText}>
                  {notificationDateLabel}
                </Text>
              </View>

              <View style={styles.notificationLocalDate}>
                <Text style={styles.notificationLocalDateLabel}>
                  {t('common.yourDate')}
                </Text>

                <Text style={styles.notificationLocalDateText}>
                  {getNotificationLocalDate(city.tz, notification, locale)}
                </Text>

                {!!notificationLocalMonthOrYearShiftLabel && (
                  <Text
                    style={[
                      styles.notificationLocalDateShiftText,
                      (notificationLocalMonthOrYearShiftLabel === t('common.nextYear') ||
                        notificationLocalMonthOrYearShiftLabel === t('common.previousYear')) &&
                        styles.notificationLocalDateShiftTextYear,
                    ]}
                  >
                    {notificationLocalMonthOrYearShiftLabel}
                  </Text>
                )}
              </View>
            </View>
          )}

          {!!notificationRepeatLabel && (
            <View style={styles.notificationRepeat}>
              <RepeatIcon
                style={styles.notificationRepeatIcon}
                fill={theme.text.primary}
              />
              <Text style={styles.notificationRepeatText}>{notificationRepeatLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.notificationActions}>
          <Pressable
            onPress={() => handleEditNotification(city, notification)}
            style={styles.editNotificationButton}
          >
            <EditIcon
              style={styles.editNotificationIcon}
              fill={theme.text.primary}
            />
          </Pressable>

          <NotificationToggleSwitch
            enabled={notification.enabled}
            onPress={() => handleToggleNotification(city.id, notification.id, notification.enabled)}
            theme={theme}
          />

          <Pressable
            onPress={() => handleOpenDeleteNotificationModal(city, notification)}
            style={styles.deleteNotificationButton}
          >
            <DeleteIcon
              style={styles.deleteNotificationIcon}
              fill={theme.text.warning}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCityGroup = (
    city: SelectedCity,
    notifications: CityNotification[],
    options?: { drag?: () => void; isActive?: boolean; draggable?: boolean }
  ) => {
    return (
      <View style={[styles.cityGroup, options?.isActive && styles.cityGroupDragging]}>
        <Pressable
          onPress={() => handleCityPress(city.id)}
          onLongPress={options?.draggable && isEditMode ? options.drag : undefined}
          style={styles.cityHeader}
        >
          {options?.draggable && isEditMode && (
            <Pressable onPressIn={options.drag} style={styles.dragHandle}>
              <Text style={styles.dragHandleText}>☰</Text>
            </Pressable>
          )}

          <Text style={styles.cityName}>{getCityDisplayName(city, localizedCityNames[city.cityId])}</Text>

          <Text style={styles.cityHeaderTime}>{getCurrentTimeInTimezone(city.tz, timeFormat, locale)}</Text>

          {isEditMode && (
            <Pressable onPress={() => handleOpenDeleteCityModal(city)} style={styles.deleteCityButton}>
              <DeleteIcon fill={theme.text.warning} style={styles.deleteButtonIcon} />
            </Pressable>
          )}
        </Pressable>

        {notifications.map((notification, idx) => renderNotificationCard(city, notification, idx))}
      </View>
    );
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<{ city: SelectedCity; notifications: CityNotification[] }>) => {
    return (
      <ScaleDecorator>
        {renderCityGroup(item.city, item.notifications, { drag, isActive, draggable: true })}
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <View style={styles.container}>
        {(selectedCities.length === 0 || totalNotifications === 0) && (
          <View style={styles.emptyState}>
            {selectedCities.length === 0 && (
              <Pressable
                onPress={handleOpenAddCityModal}
                style={styles.emptyStateButton}
              >
                <IconAddCity style={styles.emptyStateButtonIcon} fill={theme.surface.button.primary} />
                <Text style={styles.emptyStateButtonText}>{t('common.addCity')}</Text>
              </Pressable>
            )}

            {selectedCities.length > 0 && (
              <Pressable
                onPress={handleOpenAddNotificationModal}
                disabled={selectedCities.length === 0}
                style={styles.emptyStateButton}
              >
                <IconAddNotification  style={styles.emptyStateButtonIcon} fill={theme.surface.button.primary} />
                <Text style={styles.emptyStateButtonText}>{t('common.addNotification')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {totalNotifications > 0 && sortState.groupByCity && sortState.cityOrder === 'none' && (
          <DraggableFlatList
            contentContainerStyle={styles.listContent}
            data={groupedCityEntries}
            onDragEnd={({ data }) => {
              const reorderedCities = data.map((entry) => entry.city);
              const citiesWithoutNotifications = selectedCities.filter(
                (city) => !city.notifications || city.notifications.length === 0
              );
              reorderCities([...reorderedCities, ...citiesWithoutNotifications]);
            }}
            keyExtractor={(item) => `notification-city-${item.city.id}`}
            renderItem={renderItem}
          />
        )}

        {totalNotifications > 0 && sortState.groupByCity && sortState.cityOrder !== 'none' && (
          <ScrollView
            style={styles.timeSortedList}
            contentContainerStyle={styles.timeSortedListContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedCityEntries.map(({ city, notifications }) => (
              <View key={`sorted-city-${city.id}`}>
                {renderCityGroup(city, notifications)}
              </View>
            ))}
          </ScrollView>
        )}

        {totalNotifications > 0 && !sortState.groupByCity && (
          <ScrollView
            style={styles.timeSortedList}
            contentContainerStyle={styles.timeSortedListContent}
            showsVerticalScrollIndicator={false}
          >
            {linearNotificationEntries.map(({ city, notification }, index) =>
              renderNotificationCard(city, notification, index, { showCityName: true })
            )}
          </ScrollView>
        )}
      </View>

      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <NotificationModal
        visible={isAddNotificationModalVisible}
        cityName={selectedAddNotificationCity ? getCityDisplayName(selectedAddNotificationCity, localizedCityNames[selectedAddNotificationCity.cityId]) : ''}
        mode="add"
        citySelectionMode="selectable"
        cityOptions={notificationCityOptions}
        selectedCityId={selectedAddNotificationCityId}
        onSelectCityId={setSelectedAddNotificationCityId}
        initialNotification={null}
        onClose={handleCloseAddNotificationModal}
        onSave={handleSaveAddedNotification}
      />

      <NotificationModal
        visible={Boolean(editingTarget)}
        cityName={editingTarget ? getCityDisplayName(editingTarget.city, localizedCityNames[editingTarget.city.cityId]) : ''}
        cityTimezone={editingTarget?.city.tz}
        mode="edit"
        citySelectionMode="locked"
        initialNotification={editingTarget?.notification || null}
        onClose={() => setEditingTarget(null)}
        onSave={handleSaveEditedNotification}
      />

      <DeleteNotificationModal
        visible={Boolean(deleteTarget)}
        notificationTitle={deleteTarget?.notification.label}
        onClose={handleCloseDeleteNotificationModal}
        onConfirm={handleConfirmDeleteNotification}
      />

      <DeleteCityModal
        visible={Boolean(cityPendingDelete)}
        cityName={cityPendingDelete ? getCityDisplayName(cityPendingDelete, localizedCityNames[cityPendingDelete.cityId]) : t('city.fallbackName')}
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />

      <NotificationPickerModal
        visible={isFocused && isSortPickerVisible}
        title={t('notifications.sortTitle')}
        onClose={closeSortPicker}
        onApply={handleApplySortMode}
      >
        <View style={styles.sortPickerContent}>
          <Text style={styles.sortPickerSectionTitle}>
            {t('notifications.grouping')}
          </Text>
          <Pressable
            onPress={handleToggleDraftGrouping}
            style={[
              styles.sortPickerItem,
              draftSortState.groupByCity && styles.sortPickerItemActive,
            ]}
          >
            <Text
              style={[
                styles.sortPickerItemText,
                draftSortState.groupByCity && styles.sortPickerItemTextActive,
              ]}
            >
              {t('notifications.groupByCity')}
            </Text>
          </Pressable>

          <Text style={styles.sortPickerSectionTitle}>
            {t('notifications.notificationOrder')}
          </Text>
          <Pressable
            onPress={() => handleToggleDraftNotificationOrder('trigger')}
            style={[
              styles.sortPickerItem,
              draftSortState.notificationOrder.startsWith('trigger') && styles.sortPickerItemActive,
            ]}
          >
            <Text
              style={[
                styles.sortPickerItemText,
                draftSortState.notificationOrder.startsWith('trigger') && styles.sortPickerItemTextActive,
              ]}
            >
              {getDirectionalLabel(
                t('notifications.sortNotificationsByTime'),
                getNotificationOrderDirection(
                  draftSortState.notificationOrder.startsWith('trigger')
                    ? draftSortState.notificationOrder
                    : 'none'
                )
              )}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleToggleDraftNotificationOrder('created')}
            style={[
              styles.sortPickerItem,
              draftSortState.notificationOrder.startsWith('created') && styles.sortPickerItemActive,
            ]}
          >
            <Text
              style={[
                styles.sortPickerItemText,
                draftSortState.notificationOrder.startsWith('created') && styles.sortPickerItemTextActive,
              ]}
            >
              {getDirectionalLabel(
                t('notifications.sortNotificationsByDateAdded'),
                getNotificationOrderDirection(
                  draftSortState.notificationOrder.startsWith('created')
                    ? draftSortState.notificationOrder
                    : 'none'
                )
              )}
            </Text>
          </Pressable>

          <Animated.View
            pointerEvents={draftSortState.groupByCity ? 'auto' : 'none'}
            style={[styles.sortPickerAnimatedSection, citySortSectionStyle]}
          >
              <Text style={styles.sortPickerSectionTitle}>
                {t('notifications.cityOrder')}
              </Text>

              <Pressable
                onPress={() => setDraftSortState((currentState) => ({ ...currentState, cityOrder: 'none' }))}
                style={[
                  styles.sortPickerItem,
                  draftSortState.cityOrder === 'none' && styles.sortPickerItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortPickerItemText,
                    draftSortState.cityOrder === 'none' && styles.sortPickerItemTextActive,
                  ]}
                >
                  {t('notifications.customCityOrder')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleToggleDraftCityOrder('name')}
                style={[
                  styles.sortPickerItem,
                  draftSortState.cityOrder.startsWith('name') && styles.sortPickerItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortPickerItemText,
                    draftSortState.cityOrder.startsWith('name') && styles.sortPickerItemTextActive,
                  ]}
                >
                  {getDirectionalLabel(
                    t('notifications.sortCitiesByName'),
                    getCityOrderDirection(
                      draftSortState.cityOrder.startsWith('name')
                        ? draftSortState.cityOrder
                        : 'none'
                    )
                  )}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleToggleDraftCityOrder('timezone')}
                style={[
                  styles.sortPickerItem,
                  draftSortState.cityOrder.startsWith('timezone') && styles.sortPickerItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.sortPickerItemText,
                    draftSortState.cityOrder.startsWith('timezone') && styles.sortPickerItemTextActive,
                  ]}
                >
                  {getDirectionalLabel(
                    t('notifications.sortCitiesByTimezone'),
                    getCityOrderDirection(
                      draftSortState.cityOrder.startsWith('timezone')
                        ? draftSortState.cityOrder
                        : 'none'
                    )
                  )}
                </Text>
              </Pressable>
          </Animated.View>
        </View>
      </NotificationPickerModal>
    </GestureHandlerRootView>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {},
  timeSortedList: {
    flex: 1,
  },
  timeSortedListContent: {
    paddingBottom: 12,
  },
  sortPickerContent: {
    paddingHorizontal: theme.spacing.screenX,
    paddingBottom: theme.spacing.modalInnerY,
    gap: 12,
  },
  sortPickerSectionTitle: {
    color: theme.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  sortPickerAnimatedSection: {
    overflow: 'hidden',
    gap: 12,
  },
  sortPickerItem: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    backgroundColor: theme.surface.button.subtleWeak,
    borderWidth: 1,
    borderColor: theme.border.strong,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sortPickerItemActive: {
    backgroundColor: theme.surface.button.subtleStrong,
  },
  sortPickerItemText: {
    color: theme.text.primary,
    fontSize: 15,
  },
  sortPickerItemTextActive: {
    fontWeight: '700',
  },
  helperButtonRow: {
    paddingTop: 6,
    paddingLeft: 16,
  },
  helperButton: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  helperButtonText: {
    color: theme.text.onLight,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateButton: {
    alignItems: 'center',
  },
  emptyStateButtonDisabled: {
    opacity: 0.5,
  },
  emptyStateButtonIcon: {
    width: 20,
    height: 20,
    marginBottom: 20,
  },
  emptyStateButtonText: {
    fontSize: 16,
    color: theme.text.primary,
  },
  cityGroup: {
    borderBottomColor: theme.surface.button.subtleStrong,
    borderBottomWidth: 2,
  },
  cityGroupDragging: {
    backgroundColor: theme.surface.cardStrong,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 17,
    backgroundColor: theme.surface.cardSoft,
    marginBottom: 1,
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  dragHandleText: {
    fontSize: 18,
    color: theme.text.primary,
  },
  cityName: {
    flex: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 'bold',
    color: theme.text.primary,
    paddingHorizontal: 2,
  },
  cityHeaderTime: {
    fontSize: 20,
    lineHeight: 26,
    color: theme.text.primary,
    marginLeft: 12
  },
  deleteCityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.text.warning,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  deleteButtonIcon: {},
  notificationItem: {
    paddingTop: 17,
    paddingBottom: 22,
    paddingHorizontal: 20,
    backgroundColor: theme.surface.cardSoft,
  },
  notificationItemEven: {
    backgroundColor: theme.surface.cardAlt,
  },
  notificationDetails: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  notificationParentCity: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    color: theme.text.secondary,
    marginBottom: 2,
  },
  notificationLabel: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: theme.text.primary,
  },
  notificationLabelEmpty: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '300',
    color: theme.text.primary,
  },
  notificationNotes: {
    fontSize: 15,
    lineHeight: 18,
    color: theme.text.primary,
  },
  notificationUrl: {
    fontSize: 15,
    lineHeight: 18,
    color: theme.text.warning,
    textDecorationLine: 'underline',
  },
  notificationDateTime: {
    flexDirection: 'column',
    gap: 18,
    paddingHorizontal: 2,
  },
  notificationTime: {
    flexDirection: 'column',
    gap: 5,
  },
  notificationCityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationCityTimeIcon: {
    width: 16,
    height: 16,
  },
  notificationCityTimeText: {
    fontSize: 15,
    color: theme.text.primary,
  },
  notificationLocalTime: {
    flexDirection: 'row',
    gap: 3,
  },
  notificationLocalTimeLabel: {
    fontSize: 13,
    color: theme.text.secondary,
  },
  notificationLocalTimeText: {
    fontSize: 13,
    color: theme.text.primary,
  },
  notificationLocalDayShiftText: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: theme.radius.pillSm,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginBottom: -2,
    marginLeft: 7,
  },
  notificationDate: {
    flexDirection: 'column',
    gap: 5,
  },
  notificationCityDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationCityDateIcon: {
    width: 14,
    height: 14,
    margin: 1,
  },
  notificationCityDateText: {
    fontSize: 15,
    color: theme.text.primary,
  },
  notificationLocalDate: {
    flexDirection: 'row',
    gap: 3,
  },
  notificationLocalDateLabel: {
    fontSize: 13,
    color: theme.text.secondary,
  },
  notificationLocalDateText: {
    fontSize: 13,
    color: theme.text.primary,
  },
  notificationLocalDateShiftText: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: theme.radius.pillSm,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginBottom: -2,
    marginLeft: 7,
  },
  notificationLocalDateShiftTextYear: {
    backgroundColor: theme.text.warning,
  },
  notificationRepeat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  notificationRepeatIcon: {
    width: 17,
    height: 15,
  },
  notificationRepeatText: {
    fontSize: 15,
    color: theme.text.primary,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 20,
  },
  editNotificationButton: {
    width: 30,
    height: 24,
    backgroundColor: theme.surface.button.subtle,
    borderRadius: 15,
  },
  editNotificationIcon: {
    width: 12,
    height: 12,
    margin: 'auto',
  },
  toggleNotificationSwitch: {
    width: 33,
    height: 17,
    borderRadius: 9,
    backgroundColor: theme.surface.button.subtle,
    padding: 3,
  },
  toggleNotificationSwitchThumb: {
    width: 11,
    height: 11,
    backgroundColor: theme.surface.button.primary,
    borderRadius: 6,
    position: 'absolute',
    top: 3,
    left: 3,
  },
  deleteNotificationButton: {
    width: 30,
    height: 24,
    backgroundColor: theme.surface.button.subtle,
    borderRadius: 15,
  },
  deleteNotificationIcon: {
    width: 12,
    height: 12,
    margin: 'auto',
  },
  });
}
