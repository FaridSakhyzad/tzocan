import { useState, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSelectedCities, CityNotification } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat, FirstDayOfWeek } from '@/contexts/settings-context';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';
import { DeleteNotificationModal } from '@/components/delete-notification-modal';
import { getCountryName } from '@/constants/country-names';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { getCityBaseName, getCityDisplayName } from '@/utils/city-display';

import ClockIcon from '../../assets/images/icon--clock-2--outlined.svg';
import CalendarIcon from '../../assets/images/icon--calendar-2--outlined.svg';
import EditIcon from '../../assets/images/icon--edit-2.svg';
import DeleteIcon from '../../assets/images/icon--delete-3.svg';
import RepeatIcon from '../../assets/images/icon--repeat-1.svg';

const EDIT_CITY_TIME_REFRESH_INTERVAL_MS = 5000;
const NOTIFICATION_SWITCH_THUMB_TRAVEL = 16;

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
    <Pressable
      onPress={onPress}
      style={styles.toggleNotificationSwitch}
    >
      <Animated.View
        style={[
          styles.toggleNotificationSwitchThumb,
          { transform: [{ translateX: thumbTranslateX }] },
        ]}
      />
    </Pressable>
  );
}

function getNotificationRepeatLabel(
  notification: CityNotification,
  firstDayOfWeek: FirstDayOfWeek,
  weekdayShortLabels: Record<number, string>,
  t: (key: string) => string
) {
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');

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
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');

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

  if (repeat === 'none') {
    return null;
  }

  return null;
}

function formatScheduledTime(hour: number, minute: number, timeFormat: TimeFormat, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(2027, 0, 1, hour, minute));
}

function getInactiveReasonLabel(notification: CityNotification, t: (key: string) => string) {
  if (notification.inactiveReason === 'permission') {
    return t('notification.inactive.permission');
  }

  if (notification.inactiveReason === 'past') {
    return t('notification.inactive.past');
  }

  return null;
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

function getRelativeDayLabel(timezone: string, t: (key: string) => string) {
  const now = new Date();
  const cityNow = getDatePartsInTimezone(now, timezone);
  const localStamp = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const cityStamp = Date.UTC(cityNow.year, cityNow.month - 1, cityNow.day);
  const dayDiff = Math.round((cityStamp - localStamp) / 86400000);

  if (dayDiff > 0) {
    return t('common.tomorrow');
  }

  if (dayDiff < 0) {
    return t('common.yesterday');
  }

  return null;
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

function getCurrentTimeInTimezone(timezone: string, timeFormat: TimeFormat, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date());
}

function getTimezoneOffsetLabel(timezone: string) {
  const now = new Date();

  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const localParts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  const targetMinutes =
    getPart(targetParts, 'day') * 24 * 60 +
    getPart(targetParts, 'hour') * 60 +
    getPart(targetParts, 'minute');

  const localMinutes =
    getPart(localParts, 'day') * 24 * 60 +
    getPart(localParts, 'hour') * 60 +
    getPart(localParts, 'minute');

  let diffMinutes = targetMinutes - localMinutes;

  if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  }

  const prefix = diffMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `${prefix}${hours}h`;
  }

  return `${prefix}${hours}:${minutes.toString().padStart(2, '0')}h`;
}

function getUtcOffsetLabel(timezone: string) {
  const now = new Date();

  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find((part) => part.type === type)?.value || '0', 10);

  const targetMinutes =
    getPart(targetParts, 'day') * 24 * 60 +
    getPart(targetParts, 'hour') * 60 +
    getPart(targetParts, 'minute');

  const utcMinutes =
    getPart(utcParts, 'day') * 24 * 60 +
    getPart(utcParts, 'hour') * 60 +
    getPart(utcParts, 'minute');

  let diffMinutes = targetMinutes - utcMinutes;

  if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  }

  const prefix = diffMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `UTC${prefix}${hours}`;
  }

  return `UTC${prefix}${hours}:${minutes.toString().padStart(2, '0')}`;
}

export default function EditCity() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { t, locale, weekdayShortLabels } = useI18n();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { selectedCities, updateCityName, addNotification, updateNotification, removeNotification, toggleNotification } = useSelectedCities();
  const { timeFormat, firstDayOfWeek } = useSettings();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [, setClockTick] = useState(0);

  const city = selectedCities.find(c => c.id === Number(cityId));
  const localizedCityNames = useLocalizedCityNames(city ? [city.cityId] : []);

  const [editName, setEditName] = useState(city?.customName || '');
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] = useState<CityNotification | null>(null);
  const [notificationPendingDelete, setNotificationPendingDelete] = useState<CityNotification | null>(null);

  useEffect(() => {
    if (city) {
      setEditName(city.customName || '');
    }
  }, [city]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setClockTick((value) => value + 1);

    const interval = setInterval(() => {
      setClockTick((value) => value + 1);
    }, EDIT_CITY_TIME_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isFocused]);

  if (!city) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.errorText}>{t('editCity.notFound')}</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleNameChange = (text: string) => {
    setEditName(text);
    updateCityName(city.id, text.trim());
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (editingNotification) {
      return await updateNotification(
        city.id,
        editingNotification.id,
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
    }

    return await addNotification(
      city.id,
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

  const handleOpenEditNotificationModal = (notification: CityNotification) => {
    setEditingNotification(notification);
    setIsNotificationModalVisible(true);
  };

  const handleOpenDeleteNotificationModal = (notification: CityNotification) => {
    setNotificationPendingDelete(notification);
  };

  const handleCloseDeleteNotificationModal = () => {
    setNotificationPendingDelete(null);
  };

  const handleConfirmDeleteNotification = async () => {
    if (!notificationPendingDelete) {
      return;
    }

    await removeNotification(city.id, notificationPendingDelete.id);
    setNotificationPendingDelete(null);
  };

  const handleToggleNotification = async (notificationId: string, enabled: boolean) => {
    await toggleNotification(city.id, notificationId, !enabled);
  };

  const relativeDayLabel = getRelativeDayLabel(city.tz, t);

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.editCityHeader}>
          <Text style={styles.cityName}>{getCityBaseName(city, localizedCityNames[city.cityId])}</Text>
          <Text style={styles.cityCountry}>{getCountryName(city.country, locale)}</Text>
          <View style={styles.cityTimeInfo}>
            <Text style={styles.cityTimezone}>{getCurrentTimeInTimezone(city.tz, timeFormat, locale)}</Text>
            <Text style={styles.cityTimezone}>{getUtcOffsetLabel(city.tz)}</Text>
            <Text style={styles.cityTimezone}>{getTimezoneOffsetLabel(city.tz)}</Text>
            {!!relativeDayLabel && (
              <Text style={styles.cityRelativeDayLabel}>{relativeDayLabel}</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('editCity.customNamePlaceholder')}
              placeholderTextColor={theme.text.placeholder}
              value={editName}
              onChangeText={handleNameChange}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {editName.length > 0 && (
              <Pressable style={styles.clearButton} onPress={() => handleNameChange('')}>
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.notificationsSection}>
          {city.notifications && city.notifications.length > 0 && (
            <View style={styles.notificationsList}>
              {city.notifications.map((notification, idx) => {
                const notificationDateLabel = getNotificationDateLabel(notification, locale);
                const notificationRepeatLabel = getNotificationRepeatLabel(notification, firstDayOfWeek, weekdayShortLabels, t);
                const notificationLocalDayShiftLabel = getNotificationLocalDayShiftLabel(city.tz, notification, t);
                const notificationLocalMonthOrYearShiftLabel = getNotificationLocalMonthOrYearShiftLabel(city.tz, notification, t);
                const notificationInactiveReasonLabel = getInactiveReasonLabel(notification, t);

                return (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      (1 + idx) % 2 === 0 && styles.notificationItemEven,
                      !notification.enabled && styles.notificationItemDisabled
                    ]}
                  >
                    <View style={styles.notificationDetails}>
                      {!!notification.label && notification.label.length > 0 ? (
                        <Text style={styles.notificationLabel}>{notification.label}</Text>
                      ) : (
                        <Text style={styles.notificationLabelEmpty}>{t('common.notification')}</Text>
                      )}
                      {!!notification.notes && (
                        <Text style={styles.notificationNotes}>{notification.notes}</Text>
                      )}
                      {!!notification.url && (
                        <Text style={styles.notificationUrl}>{notification.url}</Text>
                      )}
                      {!!notificationInactiveReasonLabel && (
                        <Text style={styles.notificationInactiveReason}>{notificationInactiveReasonLabel}</Text>
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
                              <Text style={[
                                styles.notificationLocalDateShiftText,
                                (notificationLocalMonthOrYearShiftLabel === t('common.nextYear') || notificationLocalMonthOrYearShiftLabel === t('common.previousYear')) && styles.notificationLocalDateShiftTextYear
                              ]}>
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
                        onPress={() => handleOpenEditNotificationModal(notification)}
                        style={styles.editNotificationButton}
                      >
                        <EditIcon
                          style={styles.editNotificationIcon}
                          fill={theme.text.primary}
                        />
                      </Pressable>

                      <NotificationToggleSwitch
                        enabled={notification.enabled}
                        onPress={() => handleToggleNotification(notification.id, notification.enabled)}
                        theme={theme}
                      />

                      <Pressable
                        onPress={() => handleOpenDeleteNotificationModal(notification)}
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
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <NotificationModal
        visible={isNotificationModalVisible}
        cityName={getCityDisplayName(city, localizedCityNames[city.cityId])}
        cityTimezone={city.tz}
        mode={editingNotification ? 'edit' : 'add'}
        citySelectionMode="locked"
        initialNotification={editingNotification}
        onClose={() => {
          setIsNotificationModalVisible(false);
          setEditingNotification(null);
        }}
        onSave={handleSaveNotification}
      />

      <DeleteNotificationModal
        visible={Boolean(notificationPendingDelete)}
        notificationTitle={notificationPendingDelete?.label}
        onClose={handleCloseDeleteNotificationModal}
        onConfirm={handleConfirmDeleteNotification}
      />
    </>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    fontSize: 18,
    color: theme.text.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.surface.button.subtleStrong,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.text.primary,
    fontSize: theme.typography.control.fontSize,
    fontWeight: '600',
  },
  editCityHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: theme.spacing.screenX,
  },
  cityName: {
    fontSize: 20,
    lineHeight: 30,
    fontWeight: 'bold',
    color: theme.text.primary,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  cityCountry: {
    fontSize: 13,
    color: theme.text.primary,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  cityTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  cityTimezone: {
    fontSize: 15,
    color: theme.text.primary,
    fontWeight: 'bold',
  },
  cityRelativeDayLabel: {
    backgroundColor: theme.surface.button.primary,
    borderRadius: theme.radius.pillMd,
    height: 18,
    lineHeight: 18,
    fontSize: 11,
    color: theme.text.onLight,
    paddingHorizontal: 9,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 40,
    fontSize: 15,
    color: theme.text.primary,
    borderWidth: 1,
    borderColor: theme.border.field,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface.fieldStrong,
    position: 'relative',
    zIndex: 1,
  },
  clearButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.surface.elevated,
    position: 'absolute',
    zIndex: 10,
    top: 8,
    right: 8,
  },
  clearButtonText: {
    color: theme.text.primary,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: theme.text.helper,
    marginTop: 8,
    marginBottom: 24,
  },
  notificationsSection: {},
  notificationsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text.primary,
    marginBottom: 4,
  },
  notificationsList: {},
  notificationItem: {
    paddingTop: 17,
    paddingBottom: 22,
    paddingHorizontal: theme.spacing.screenX,
    backgroundColor: theme.surface.cardSoft,
  },
  notificationItemEven: {
    backgroundColor: theme.surface.cardAlt,
  },
  notificationItemDisabled: {
    opacity: 0.5,
  },
  notificationDetails: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 18,
    paddingHorizontal: 2,
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
  },
  notificationInactiveReason: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 16,
    color: theme.text.helper,
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
