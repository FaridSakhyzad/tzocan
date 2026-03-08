import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { TimeRuler } from '@/components/time-ruler';

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
  const [, setTick] = useState(1);

  useEffect(() => {
    if (selectedCities.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setTick((t) => t * -1);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedCities.length]);

  const handleEditCity = (city: SelectedCity) => {
    if (!isEditMode) {
      router.push({ pathname: '/edit-city', params: { cityId: city.id.toString() } });
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
            {isEditMode && (
              <Pressable
                onPressIn={drag}
                style={styles.dragHandle}
              >
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}
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
                  <Text style={styles.cityNotificationCount}>
                    {city.notifications.length} {city.notifications.length === 1 ? 'notification' : 'notifications'}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.cityTime}>
              {getLocalTime(city.tz, timeFormat, timeOffsetMinutes)}
            </Text>
            {isEditMode && (
              <Pressable
                onPress={() => handleDelete(city.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
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
            />
          </View>
        )}
        <TimeRuler
          offsetMinutes={timeOffsetMinutes}
          onOffsetChange={setTimeOffsetMinutes}
          timeFormat={timeFormat}
        />
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
    paddingHorizontal: 16,
    paddingVertical: 0,
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
    paddingHorizontal: 12,
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
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 22,
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
  cityNotificationCount: {
    fontSize: 14,
    color: '#fff',
  },
  cityTime: {
    fontSize: 43,
    fontWeight: '300',
    marginLeft: 12,
    color: '#fff',
  },
  dragHandle: {
    padding: 8,
    marginRight: 8,
  },
  dragHandleText: {
    fontSize: 20,
    color: '#9a9bb2',
  },
});
