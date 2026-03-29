import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet, Switch, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';

import IconRepeat from '@/assets/images/icon--repeat-1.svg';
import IconLink from '@/assets/images/icon--link-1.svg';
import IconEdit from '@/assets/images/icon--edit-2.svg';

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

function formatTime(hour: number, minute: number, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date(2027, 0, 1, hour, minute));
}

function getTimezoneOffsetLabel(timezone: string): string {
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
    return `${prefix}${hours}`;
  }

  return `${prefix}${hours}:${minutes.toString().padStart(2, '0')}`;
}

function getLocalPreviewForNotification(
  cityTz: string,
  notification: NonNullable<SelectedCity['notifications']>[number],
  timeFormat: TimeFormat
) {
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

  const localText = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(triggerDate);

  const localStamp = Date.UTC(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
  const cityStamp = Date.UTC(cityYear, cityMonth - 1, cityDay);
  const dayDiff = Math.round((localStamp - cityStamp) / 86400000);
  const dayShiftText = dayDiff < 0 ? 'предыдущий день' : dayDiff > 0 ? 'следующий день' : '';

  return { localText, dayShiftText };
}

function getNotificationScheduleLabel(notification: NonNullable<SelectedCity['notifications']>[number]): string | null {
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');

  const weekdayLabel = (d: number) => {
    if (d === 0) return 'Sun';
    if (d === 1) return 'Mon';
    if (d === 2) return 'Tue';
    if (d === 3) return 'Wed';
    if (d === 4) return 'Thu';
    if (d === 5) return 'Fri';

    return 'Sat';
  };

  if (repeat === 'daily') return 'Daily';

  if (repeat === 'weekly') {
    const days = (notification.weekdays || []).slice().sort((a, b) => a - b).map(weekdayLabel);
    return days.length > 0 ? `Weekly: ${days.join(', ')}` : 'Weekly';
  }

  if (repeat === 'monthly') return 'Monthly';

  if (repeat === 'yearly') return 'Yearly';

  if (notification.day && notification.month && notification.year) {
    const scheduledDate = new Date(notification.year, notification.month - 1, notification.day);
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).formatToParts(scheduledDate);
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
    return `${getPart('weekday')} ${getPart('day')} ${getPart('month')}, ${getPart('year')}`;
  }

  return null;
}

export default function Notifications() {
  const router = useRouter();
  const { selectedCities, reorderCities, removeCity, toggleNotification, addNotification, updateNotification } = useSelectedCities();
  const { timeFormat } = useSettings();
  const { isEditMode } = useEditMode();

  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{
    city: SelectedCity;
    notification: NonNullable<SelectedCity['notifications']>[number];
  } | null>(null);

  useEffect(() => {
    if (selectedCities.length === 0) {
      setSelectedCityId(null);
      return;
    }

    if (!selectedCities.some((city) => city.id === selectedCityId)) {
      setSelectedCityId(selectedCities[0].id);
    }
  }, [selectedCities, selectedCityId]);

  const selectedCity = useMemo(() => selectedCities.find((city) => city.id === selectedCityId) || null, [selectedCities, selectedCityId]);
  const cityOptions = useMemo(
    () => selectedCities.map((city) => ({ id: city.id, label: city.customName || city.name, hint: city.tz, timezone: city.tz })),
    [selectedCities]
  );

  const citiesWithNotifications = selectedCities.filter(
    city => city.notifications && city.notifications.length > 0
  );

  const totalNotifications = citiesWithNotifications.reduce(
    (sum, city) => sum + (city.notifications?.length || 0),
    0
  );

  const handleToggleNotification = async (cityId: number, notificationId: string, enabled: boolean) => {
    await toggleNotification(cityId, notificationId, enabled);
  };

  const handleCityPress = (cityId: number) => {
    if (!isEditMode) {
      router.push({ pathname: '/edit-city', params: { cityId: cityId.toString() } });
    }
  };

  const handleDelete = (cityId: number) => {
    removeCity(cityId);
  };

  const handleOpenUrl = async (url: string) => {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(withProtocol);
    if (canOpen) {
      await Linking.openURL(withProtocol);
    }
  };

  const handleAddButtonPress = () => {
    if (selectedCities.length === 0) {
      return;
    }
    setIsNotificationModalVisible(true);
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (!selectedCityId) return;

      await addNotification(
        selectedCityId,
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
  const handleSaveEditedNotification = async (values: NotificationFormValues) => {
    if (!editingTarget) return;

    await updateNotification(
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
  const handleEditNotification = (city: SelectedCity, notification: NonNullable<SelectedCity['notifications']>[number]) => {
    setEditingTarget({ city, notification });
  };

  const renderItem = useCallback(({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
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

            <Text style={styles.cityName}>{`${city.customName || city.name}, ${getTimezoneOffsetLabel(city.tz)}`}</Text>

            {isEditMode && (
              <Pressable onPress={() => handleDelete(city.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>

          {city.notifications?.map((notification, idx) => (
            (() => {
              const preview = getLocalPreviewForNotification(city.tz, notification, timeFormat);

              const notificationScheduleLabel = getNotificationScheduleLabel(notification);

              return (
                <View key={notification.id} style={[
                  styles.notificationItem,
                  idx + 1 === city.notifications?.length && styles.notificationItemLast
                ]}>
                  <View style={styles.notificationItemHeader}>
                    <View style={styles.notificationItemHeaderText}>
                      {(notification.label && notification.label.length > 0) ? (
                        <Text style={styles.notificationLabel}>{notification.label}</Text>
                      ) : (
                        <Text style={styles.notificationLabelEmpty}>Notification</Text>
                      )}
                    </View>

                    <Pressable style={styles.editButton} onPress={() => handleEditNotification(city, notification)}>
                      <IconEdit fill='rgba(255, 255, 255, 1)' style={styles.editButtonIcon} />
                    </Pressable>
                  </View>

                  <View style={styles.notificationItemTime}>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.hour, notification.minute, timeFormat)}
                    </Text>

                    <Text style={styles.notificationLocalTime}>Your Time: {preview.localText}</Text>
                  </View>

                  {(notificationScheduleLabel || !!preview.dayShiftText) && (
                    <View style={styles.notificationScheduleInfo}>
                      {notificationScheduleLabel && (
                        <View style={styles.notificationSchedule}>
                          <IconRepeat fill='rgba(255, 255, 255, 1)' style={styles.notificationScheduleIcon} />
                          <Text style={styles.notificationScheduleText}>{notificationScheduleLabel}</Text>
                        </View>
                      )}

                      {!!preview.dayShiftText && (
                        <Text style={styles.notificationDayShift}>{preview.dayShiftText}</Text>
                      )}
                    </View>
                  )}

                  {!!notification.notes && (
                    <Text style={styles.notificationNotes}>{notification.notes}</Text>
                  )}

                  {!!notification.url && (
                    <Pressable onPress={() => handleOpenUrl(notification.url!)}>
                      <View style={styles.notificationUrl}>
                        <View style={styles.notificationUrlIcon}>
                          <IconLink fill='rgba(62, 63, 86, 1)' style={styles.notificationUrlIconImg} />
                        </View>
                        <Text style={styles.notificationUrlText} numberOfLines={1}>{notification.url}</Text>
                      </View>
                    </Pressable>
                  )}

                  <Switch
                    style={{ display: 'none' }}
                    value={notification.enabled}
                    onValueChange={(value) => handleToggleNotification(city.id, notification.id, value)}
                    trackColor={{ false: '#3e3f56', true: '#4CAF50' }}
                    thumbColor={notification.enabled ? '#fff' : '#9a9bb2'}
                  />
                </View>
              );
            })()
          ))}
        </View>
      </ScaleDecorator>
    );
  }, [isEditMode, timeFormat]);

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
                city => !city.notifications || city.notifications.length === 0
              );
              reorderCities([...data, ...citiesWithoutNotifications]);
            }}
            keyExtractor={(item) => `notification-city-${item.id}`}
            renderItem={renderItem}
          />
        )}
      </View>

      <View style={styles.bottomButtonsBar}>
        <Pressable
          style={[styles.addButton, selectedCities.length === 0 && styles.addButtonDisabled]}
          onPress={handleAddButtonPress}
          disabled={selectedCities.length === 0}
        >
          <Text style={styles.addButtonText}>Add Notification</Text>
        </Pressable>
      </View>

      <NotificationModal
        visible={isNotificationModalVisible}
        cityName={selectedCity ? (selectedCity.customName || selectedCity.name) : ''}
        mode="add"
        cityOptions={cityOptions}
        selectedCityId={selectedCityId}
        onSelectCityId={setSelectedCityId}
        initialNotification={null}
        onClose={() => setIsNotificationModalVisible(false)}
        onSave={handleSaveNotification}
      />

      <NotificationModal
        visible={Boolean(editingTarget)}
        cityName={editingTarget ? (editingTarget.city.customName || editingTarget.city.name) : ''}
        cityTimezone={editingTarget?.city.tz}
        mode="edit"
        initialNotification={editingTarget?.notification || null}
        onClose={() => setEditingTarget(null)}
        onSave={handleSaveEditedNotification}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  bottomButtonsBar: {
    marginTop: 'auto',
    height: 60,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16
  },
  helperText: {
    color: '#9a9bb2',
    fontSize: 12,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#7a7b92',
    marginTop: 8,
  },
  cityGroup: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    borderBottomRightRadius: 26,
  },
  cityGroupDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0.5)',
    borderRadius: 8,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 11
  },
  dragHandle: {
    padding: 4,
    marginRight: 8,
  },
  dragHandleText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  cityName: {
    flex: 1,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
  },
  notificationItem: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationItemLast: {
    borderBottomWidth: 0,
  },
  notificationItemHeader: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 12,
  },
  notificationItemHeaderText: {
    flex: 1,
    flexShrink: 1,
    flexBasis: 1,
    marginRight: 8,
    marginTop: 2,
  },
  notificationLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  notificationLabelEmpty: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '200',
  },
  editButton: {
    borderRadius: 12,
    flexBasis: 24,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(62, 63, 86, 0.4)',
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonIcon: {
    width: 12,
    height: 12,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationItemTime: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 13,
  },
  notificationTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  notificationLocalTime: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 'auto',
  },
  notificationScheduleInfo: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  notificationSchedule: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5
  },
  notificationScheduleIcon: {
    width: 17,
    height: 15,
    marginLeft: 0,
  },
  notificationScheduleText: {
    fontSize: 14,
    color: '#fff',
  },
  notificationDayShift: {
    fontSize: 11,
    lineHeight: 17,
    color: 'rgba(62, 63, 86, 0.9)',
    borderRadius: 9,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    paddingHorizontal: 10,
    marginLeft: 'auto',
  },
  notificationNotes: {
    fontSize: 13,
    lineHeight: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  notificationUrl: {
    display: 'flex',
    flexDirection: 'row',
    gap: 7,
    marginBottom: 8,
  },
  notificationUrlIcon: {
    width: 26,
    height: 18,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationUrlIconImg: {
    width: 12,
    height: 12,
    opacity: 0.7
  },
  notificationUrlText: {
    fontSize: 13,
    lineHeight: 16,
    color: '#ffffff',
    textDecorationLine: 'underline',
  }
});
