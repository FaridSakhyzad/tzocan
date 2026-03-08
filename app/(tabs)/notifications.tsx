import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View, StyleSheet, Switch, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';

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

function getLocalPreviewForNotification(cityTz: string, notification: NonNullable<SelectedCity['notifications']>[number]) {
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
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(triggerDate);

  const localStamp = Date.UTC(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate());
  const cityStamp = Date.UTC(cityYear, cityMonth - 1, cityDay);
  const dayDiff = Math.round((localStamp - cityStamp) / 86400000);
  const dayShiftText = dayDiff < 0 ? 'предыдущий день' : dayDiff > 0 ? 'следующий день' : '';

  return { localText, dayShiftText };
}

function getNotificationScheduleLabel(notification: NonNullable<SelectedCity['notifications']>[number]) {
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
    return `${notification.day.toString().padStart(2, '0')}/${notification.month.toString().padStart(2, '0')}/${notification.year}`;
  }

  return 'Today';
}

export default function Notifications() {
  const router = useRouter();
  const { selectedCities, reorderCities, removeCity, toggleNotification, addNotification, updateNotification } = useSelectedCities();
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
            <Text style={styles.cityName}>{city.customName || city.name}</Text>
            {isEditMode && (
              <Pressable onPress={() => handleDelete(city.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>

          {city.notifications?.map(notification => (
            (() => {
              const preview = getLocalPreviewForNotification(city.tz, notification);
              return (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTime}>
                      {notification.hour.toString().padStart(2, '0')}:{notification.minute.toString().padStart(2, '0')}
                    </Text>
                    <Text style={styles.notificationDate}>
                      {getNotificationScheduleLabel(notification)}
                    </Text>
                    <Text style={styles.notificationLocalTime}>Local: {preview.localText}</Text>
                    {!!preview.dayShiftText && (
                      <Text style={styles.notificationDayShift}>{preview.dayShiftText}</Text>
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
                  <View style={styles.notificationActions}>
                    <Pressable style={styles.editButton} onPress={() => handleEditNotification(city, notification)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Switch
                      value={notification.enabled}
                      onValueChange={(value) => handleToggleNotification(city.id, notification.id, value)}
                      trackColor={{ false: '#3e3f56', true: '#4CAF50' }}
                      thumbColor={notification.enabled ? '#fff' : '#9a9bb2'}
                    />
                  </View>
                </View>
              );
            })()
          ))}
        </View>
      </ScaleDecorator>
    );
  }, [isEditMode]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <View style={styles.container}>
          <Pressable
            style={[styles.addButton, selectedCities.length === 0 && styles.addButtonDisabled]}
            onPress={handleAddButtonPress}
            disabled={selectedCities.length === 0}
          >
            <Text style={styles.addButtonText}>+ Add Notification</Text>
          </Pressable>

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
              data={citiesWithNotifications}
              onDragEnd={({ data }) => {
                const citiesWithoutNotifications = selectedCities.filter(
                  city => !city.notifications || city.notifications.length === 0
                );
                reorderCities([...data, ...citiesWithoutNotifications]);
              }}
              keyExtractor={(item) => `notification-city-${item.id}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>

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
  container: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingTop: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 24,
  },
  cityGroupDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0.5)',
    borderRadius: 8,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
    fontSize: 18,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationActions: {
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationTime: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
  },
  notificationDate: {
    fontSize: 14,
    color: '#9a9bb2',
    marginTop: 2,
  },
  notificationLocalTime: {
    fontSize: 13,
    color: '#cfd6e7',
    marginTop: 4,
  },
  notificationDayShift: {
    fontSize: 12,
    color: '#ffcf99',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  notificationNotes: {
    fontSize: 13,
    color: '#d8d9f0',
    marginTop: 4,
  },
  notificationUrl: {
    fontSize: 13,
    color: '#8fc7ff',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
});
