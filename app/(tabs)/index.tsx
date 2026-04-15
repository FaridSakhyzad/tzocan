import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { TimeRuler } from '@/components/time-ruler';

import IconDelete1 from '@/assets/images/icon--delete-1.svg';
import IconNotification2 from '@/assets/images/icon--notification-2.svg';
import IconNotificationsMultiple from '@/assets/images/icon--notifications-multiple-1.svg';

const INDEX_CLOCK_REFRESH_INTERVAL_MS = 5000;

function getLocalTime(timezone: string, timeFormat: TimeFormat, offsetMinutes: number = 0): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return shiftedTime.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

function getTimezoneOffset(timezone: string): string {
  const now = new Date();

  // Get time components in target timezone
  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  // Get time components in local timezone
  const localParts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find(p => p.type === type)?.value || '0', 10);

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

  if (diffMinutes === 0) {
    return 'same';
  }

  const sign = diffMinutes > 0 ? '+' : '';
  const hours = diffMinutes / 60;

  if (Number.isInteger(hours)) {
    return `${sign}${hours}hrs`;
  }

  const wholeHours = Math.floor(Math.abs(hours));
  const mins = Math.abs(diffMinutes) % 60;
  const prefix = diffMinutes < 0 ? '-' : '+';

  return `${prefix}${wholeHours}:${mins.toString().padStart(2, '0')}`;
}

export default function Index() {
  const router = useRouter();
  const { selectedCities, reorderCities, removeCity } = useSelectedCities();
  const { timeFormat, timeOffsetMinutes, setTimeOffsetMinutes } = useSettings();
  const { isEditMode } = useEditMode();
  const isFocused = useIsFocused();
  const [, setTick] = useState(1);
  const deleteButtonsOpacity = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;
  const dragHandleReveal = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;
  const dragHandleTranslateX = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  const dragHandleWidth = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 32],
  });
  const dragHandleOpacity = dragHandleReveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  useEffect(() => {
    if (!isFocused || selectedCities.length === 0) {
      return;
    }

    setTick((t) => t * -1);

    const interval = setInterval(() => {
      setTick((t) => t * -1);
    }, INDEX_CLOCK_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isFocused, selectedCities.length]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(deleteButtonsOpacity, {
        toValue: isEditMode ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(dragHandleReveal, {
        toValue: isEditMode ? 1 : 0,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start();
  }, [deleteButtonsOpacity, dragHandleReveal, isEditMode]);

  const handleEditCity = (city: SelectedCity) => {
    if (!isEditMode) {
      router.replace({ pathname: '/edit-city', params: { cityId: city.id.toString() } });
    }
  };

  const handleDelete = (cityId: number) => {
    removeCity(cityId);
  };

  const renderItem = useCallback(({ item: city, drag, isActive, getIndex }: RenderItemParams<SelectedCity>) => {
    const index = getIndex() || 0;

    return (
      <ScaleDecorator>
        <Pressable
          onPress={() => handleEditCity(city)}
          onLongPress={isEditMode ? drag : undefined}
          disabled={isActive}
          style={[
            styles.cityItem,
            ((1 + index) === selectedCities.length) && styles.cityItemLast,
            isActive && styles.cityItemDragging
          ]}
        >
          <View style={styles.cityRow}>
            <Animated.View
              pointerEvents={isEditMode ? 'auto' : 'none'}
              style={[
                styles.dragHandleReveal,
                {
                  width: dragHandleWidth,
                  opacity: dragHandleOpacity,
                  transform: [{ translateX: dragHandleTranslateX }],
                },
              ]}
            >
              <Pressable
                onPressIn={isEditMode ? drag : undefined}
                disabled={!isEditMode}
                style={styles.dragHandle}
              >
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            </Animated.View>

            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>
                {city.customName || city.name}
              </Text>

              {city.customName && (
                <Text style={styles.cityOriginalName}>{city.name}</Text>
              )}

              <View style={styles.cityMeta}>
                <Text style={styles.cityTimezone}>
                  {getTimezoneOffset(city.tz)}
                </Text>
                {city.notifications && city.notifications.length > 0 && (
                  <View style={styles.cityNotifications}>
                    {city.notifications.length === 1 && (
                      <IconNotification2 style={styles.cityNotificationIcon} fill='rgba(255, 255, 255, 1)' />
                    )}
                    {city.notifications.length === 2 && (
                      <>
                        <IconNotification2 style={styles.cityNotificationIcon} fill='rgba(255, 255, 255, 1)' />
                        <IconNotification2 style={styles.cityNotificationIcon} fill='rgba(255, 255, 255, 1)' />
                      </>
                    )}
                    {city.notifications.length > 2 && (
                      <>
                        <IconNotificationsMultiple style={styles.cityMultipleNotificationsIcon} fill='rgba(255, 255, 255, 1)' /><Text style={styles.cityNotificationCount}>({city.notifications.length})</Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.cityTime}>
              {getLocalTime(city.tz, timeFormat, timeOffsetMinutes)}
            </Text>
            <Animated.View
              pointerEvents={isEditMode ? 'auto' : 'none'}
              style={[styles.deleteButtonBox, { opacity: deleteButtonsOpacity }]}
            >
              <Pressable
                onPress={isEditMode ? () => handleDelete(city.id) : undefined}
                disabled={!isEditMode}
                style={styles.deleteButton}
              >
                <IconDelete1
                  style={styles.deleteButtonIcon}
                  fill='rgba(62, 63, 86, 0.7)'
                />
              </Pressable>
            </Animated.View>
          </View>
        </Pressable>
      </ScaleDecorator>
    );
  }, [timeFormat, timeOffsetMinutes, selectedCities.length, isEditMode]);

  return (
    <GestureHandlerRootView style={{flex: 1 }}>
      <View style={styles.mainView}>
        {selectedCities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No cities added yet.</Text>
            <Text style={styles.emptyStateHint}>Tap the + button to add a city.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <DraggableFlatList
              style={styles.citiesList}
              data={selectedCities}
              onDragEnd={({data}) => reorderCities(data)}
              keyExtractor={(item) => `city-${item.id}`}
              renderItem={renderItem}
              bounces={false}
              overScrollMode="never"
              alwaysBounceVertical={false}
            />
          </View>
        )}
        <View
          pointerEvents={isEditMode ? 'none' : 'auto'}
          style={isEditMode ? styles.timeRulerDisabled : undefined}
        >
          <TimeRuler
            offsetMinutes={timeOffsetMinutes}
            onOffsetChange={setTimeOffsetMinutes}
            timeFormat={timeFormat}
            isActive={isFocused}
          />
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainView: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  listContainer: {
    flex: 1,
  },
  citiesList: {
    paddingHorizontal: 20,
    paddingVertical: 0,
  },
  timeRulerDisabled: {
    opacity: 0.6,
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
  cityItem: {
    paddingVertical: 16,
    paddingHorizontal: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(62, 63, 86, 0)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cityItemLast: {
    borderBottomColor: 'transparent',
  },
  cityItemDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0.1)',
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 1,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  deleteButtonBox: {
    position: 'absolute',
    top: 'auto',
    bottom: 'auto',
    right: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(62, 63, 86, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonIcon: {
    width: 14,
    height: 14,
    color: 'rgba(62, 63, 86, 0.6)'
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff'
  },
  cityOriginalName: {
    fontSize: 16,
    color: '#fff',
    marginTop: 2,
  },
  cityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  cityTimezone: {
    fontSize: 14,
    color: '#fff',
  },
  cityNotifications: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
  },
  cityNotificationIcon: {
    width: 13,
    height: 13,
  },
  cityMultipleNotificationsIcon: {
    width: 19,
    height: 13,
  },
  cityNotificationCount: {
    fontSize: 14,
    color: '#fff',
    paddingLeft: 3,
  },
  cityTime: {
    fontSize: 43,
    fontWeight: '300',
    marginLeft: 12,
    color: '#fff',
  },
  dragHandle: {
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 8,
  },
  dragHandleReveal: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleText: {
    fontSize: 20,
    color: '#fff',
  },
});
