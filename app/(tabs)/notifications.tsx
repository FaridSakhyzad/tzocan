import { useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';
import { DeleteNotificationModal } from '@/components/delete-notification-modal';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { CityNotification, useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat, FirstDayOfWeek } from '@/contexts/settings-context';
import type { UiTheme } from '@/constants/ui-theme.types';

import ClockIcon from '../../assets/images/icon--clock-2--outlined.svg';
import CalendarIcon from '../../assets/images/icon--calendar-2--outlined.svg';
import EditIcon from '../../assets/images/icon--edit-2.svg';
import DeleteIcon from '../../assets/images/icon--delete-3.svg';
import RepeatIcon from '../../assets/images/icon--repeat-1.svg';

const NOTIFICATIONS_CITY_TIME_REFRESH_INTERVAL_MS = 5000;
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

function getNotificationRepeatLabel(notification: CityNotification, firstDayOfWeek: FirstDayOfWeek) {
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

  const weekdayLabel = (d: number) => {
    if (d === 0) return 'Sun';
    if (d === 1) return 'Mon';
    if (d === 2) return 'Tue';
    if (d === 3) return 'Wed';
    if (d === 4) return 'Thu';
    if (d === 5) return 'Fri';

    return 'Sat';
  };

  if (repeat === 'weekly') {
    const order = firstDayOfWeek === 'sunday'
      ? [0, 1, 2, 3, 4, 5, 6]
      : [1, 2, 3, 4, 5, 6, 0];
    const sortOrder = new Map(order.map((value, index) => [value, index]));
    const days = (notification.weekdays || [])
      .slice()
      .sort((a, b) => (sortOrder.get(a) ?? 0) - (sortOrder.get(b) ?? 0))
      .map(weekdayLabel);

    return days.length > 0 ? `${days.join(', ')}` : 'Weekly';
  }

  if (repeat === 'daily') {
    return 'Daily';
  }

  if (repeat === 'monthly') {
    return 'Monthly';
  }

  if (repeat === 'yearly') {
    return 'Yearly';
  }

  return null;
}

function getNotificationDateLabel(notification: CityNotification) {
  if (notification.day && notification.month && notification.year) {
    const scheduledDate = new Date(notification.year, notification.month - 1, notification.day);
    const currentYear = new Date().getFullYear();
    const includeYear = notification.year !== currentYear;
    const parts = new Intl.DateTimeFormat('en-GB', {
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

function formatDateLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';

  return `${getPart('weekday')} ${getPart('day')} ${getPart('month')}, ${getPart('year')}`;
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

function getNotificationLocalDayShiftLabel(cityTz: string, notification: CityNotification) {
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
    return 'Next day';
  }

  if (dayDiff < 0) {
    return 'Previous day';
  }

  return null;
}

function getNotificationLocalMonthOrYearShiftLabel(cityTz: string, notification: CityNotification) {
  const cityTriggerDateParts = getNotificationCityTriggerDateParts(cityTz, notification);
  const triggerDate = getNotificationTriggerDate(cityTz, notification);
  const localYear = triggerDate.getFullYear();
  const localMonth = triggerDate.getMonth() + 1;

  if (localYear > cityTriggerDateParts.year) {
    return 'Next year';
  }

  if (localYear < cityTriggerDateParts.year) {
    return 'Previous year';
  }

  if (localMonth > cityTriggerDateParts.month) {
    return 'Next month';
  }

  if (localMonth < cityTriggerDateParts.month) {
    return 'Previous month';
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

function getNotificationLocalDate(cityTz: string, notification: CityNotification) {
  return formatDateLabel(getNotificationTriggerDate(cityTz, notification));
}

function getCurrentTimeInTimezone(timezone: string, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date());
}

function formatScheduledTime(hour: number, minute: number, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(2027, 0, 1, hour, minute));
}

export default function Notifications() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const { theme } = useAppTheme();
  const { selectedCities, reorderCities, removeCity, removeNotification, toggleNotification, updateNotification } = useSelectedCities();
  const { timeFormat, firstDayOfWeek } = useSettings();
  const { isEditMode } = useEditMode();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [, setClockTick] = useState(0);

  const [editingTarget, setEditingTarget] = useState<{
    city: SelectedCity;
    notification: CityNotification;
  } | null>(null);
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

  const citiesWithNotifications = selectedCities.filter(
    (city) => city.notifications && city.notifications.length > 0
  );

  const totalNotifications = citiesWithNotifications.reduce(
    (sum, city) => sum + (city.notifications?.length || 0),
    0
  );

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

  const handleDeleteCity = (cityId: number) => {
    removeCity(cityId);
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

  const handleEditNotification = (city: SelectedCity, notification: CityNotification) => {
    setEditingTarget({ city, notification });
  };

  const renderItem = ({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    return (
      <ScaleDecorator>
        <View style={[styles.cityGroup, isActive && styles.cityGroupDragging]}>
          <Pressable
            onPress={() => handleCityPress(city.id)}
            onLongPress={isEditMode ? drag : undefined}
            style={styles.cityHeader}
          >
            {isEditMode && (
              <Pressable onPressIn={drag} style={styles.dragHandle}>
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}

            <Text style={styles.cityName}>{city.customName || city.name}</Text>

            <Text style={styles.cityHeaderTime}>{getCurrentTimeInTimezone(city.tz, timeFormat)}</Text>

            {isEditMode && (
              <Pressable onPress={() => handleDeleteCity(city.id)} style={styles.deleteCityButton}>
                <Text style={styles.deleteCityButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>

          {city.notifications?.map((notification, idx) => {
            const notificationDateLabel = getNotificationDateLabel(notification);
            const notificationRepeatLabel = getNotificationRepeatLabel(notification, firstDayOfWeek);
            const notificationLocalDayShiftLabel = getNotificationLocalDayShiftLabel(city.tz, notification);
            const notificationLocalMonthOrYearShiftLabel = getNotificationLocalMonthOrYearShiftLabel(city.tz, notification);

            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationItem,
                  idx % 2 === 1 && styles.notificationItemEven,
                ]}
              >
                <View style={styles.notificationDetails}>
                  {!!notification.label && notification.label.length > 0 ? (
                    <Text style={styles.notificationLabel}>{notification.label}</Text>
                  ) : (
                    <Text style={styles.notificationLabelEmpty}>Notification</Text>
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
                        {formatScheduledTime(notification.hour, notification.minute, timeFormat)}
                      </Text>
                    </View>

                    <View style={styles.notificationLocalTime}>
                      <Text style={styles.notificationLocalTimeLabel}>
                        Your Time:
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
                          Your Date:
                        </Text>

                        <Text style={styles.notificationLocalDateText}>
                          {getNotificationLocalDate(city.tz, notification)}
                        </Text>

                        {!!notificationLocalMonthOrYearShiftLabel && (
                          <Text
                            style={[
                              styles.notificationLocalDateShiftText,
                              (notificationLocalMonthOrYearShiftLabel === 'Next year' ||
                                notificationLocalMonthOrYearShiftLabel === 'Previous year') &&
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
          })}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.rootContainer}>
      <View style={styles.container}>
        {selectedCities.length === 0 && (
          <Text style={styles.helperText}>Add at least one city first</Text>
        )}

        {totalNotifications === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No notifications yet</Text>
            <Text style={styles.emptyStateHint}>Use the button above to add notifications</Text>
          </View>
        ) : (
          <DraggableFlatList
            contentContainerStyle={styles.listContent}
            data={citiesWithNotifications}
            onDragEnd={({ data }) => {
              const citiesWithoutNotifications = selectedCities.filter(
                (city) => !city.notifications || city.notifications.length === 0
              );
              reorderCities([...data, ...citiesWithoutNotifications]);
            }}
            keyExtractor={(item) => `notification-city-${item.id}`}
            renderItem={renderItem}
          />
        )}
      </View>

      <NotificationModal
        visible={Boolean(editingTarget)}
        cityName={editingTarget ? (editingTarget.city.customName || editingTarget.city.name) : ''}
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
  helperText: {
    color: theme.text.muted,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: theme.text.muted,
  },
  emptyStateHint: {
    fontSize: 14,
    color: theme.text.helper,
    marginTop: 8,
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
    color: theme.text.muted,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.surface.button.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteCityButtonText: {
    color: theme.text.primary,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
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
