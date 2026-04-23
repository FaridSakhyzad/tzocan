import { useRef, useState, useEffect, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { CitySortPickerModal } from '@/components/city-sort-picker-modal';
import { TimeRuler } from '@/components/time-ruler';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { CityOrderMode, useNotificationsSort } from '@/contexts/notifications-sort-context';
import { sortCitiesByOrder } from '@/utils/city-sorting';

import IconDelete1 from '@/assets/images/icon--delete-1.svg';
import IconNotification2 from '@/assets/images/icon--notification-2.svg';
import IconNotificationsMultiple from '@/assets/images/icon--notifications-multiple-1.svg';

import IconAddCity from '@/assets/images/icon--cities--outlined.svg';

const INDEX_CLOCK_REFRESH_INTERVAL_MS = 5000;

function getLocalTime(timezone: string, locale: string, timeFormat: TimeFormat, offsetMinutes: number = 0): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return shiftedTime.toLocaleTimeString(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

function getTimezoneOffset(timezone: string, sameLabel: string): string {
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
    return sameLabel;
  }

  const sign = diffMinutes > 0 ? '+' : '';
  const hours = diffMinutes / 60;

  if (Number.isInteger(hours)) {
    return `${sign}${hours}h`;
  }

  const wholeHours = Math.floor(Math.abs(hours));
  const mins = Math.abs(diffMinutes) % 60;
  const prefix = diffMinutes < 0 ? '-' : '+';

  return `${prefix}${wholeHours}:${mins.toString().padStart(2, '0')}`;
}

export default function Index() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t, locale } = useI18n();
  const { selectedCities, reorderCities, removeCity, addCity } = useSelectedCities();
  const { timeFormat, timeOffsetMinutes, setTimeOffsetMinutes } = useSettings();
  const { isEditMode } = useEditMode();
  const { sortState, setSortState, isSortPickerVisible, closeSortPicker } = useNotificationsSort();
  const isFocused = useIsFocused();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [, setTick] = useState(1);
  const [cityPendingDelete, setCityPendingDelete] = useState<SelectedCity | null>(null);
  const [isAddCityModalVisible, setIsAddCityModalVisible] = useState(false);
  const [draftCityOrder, setDraftCityOrder] = useState<CityOrderMode>(sortState.cityOrder);
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

  useEffect(() => {
    if (isSortPickerVisible && isFocused) {
      setDraftCityOrder(sortState.cityOrder);
    }
  }, [isFocused, isSortPickerVisible, sortState.cityOrder]);

  const displayedCities = useMemo(
    () => sortCitiesByOrder(selectedCities, sortState.cityOrder, locale),
    [locale, selectedCities, sortState.cityOrder]
  );

  const handleEditCity = (city: SelectedCity) => {
    if (!isEditMode) {
      router.replace({ pathname: '/edit-city', params: { cityId: city.id.toString() } });
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

  const renderCityItem = (
    city: SelectedCity,
    index: number,
    options?: { drag?: () => void; isActive?: boolean; draggable?: boolean }
  ) => {
    const isActive = options?.isActive;
    const canDrag = Boolean(options?.draggable && sortState.cityOrder === 'none');

    return (
      <Pressable
        onPress={() => handleEditCity(city)}
        onLongPress={canDrag ? options?.drag : undefined}
        disabled={isActive}
        style={[
          styles.cityItem,
          ((1 + index) === displayedCities.length) && styles.cityItemLast,
          isActive && styles.cityItemDragging
        ]}
      >
        <View style={styles.cityRow}>
          <Animated.View
            pointerEvents={isEditMode && canDrag ? 'auto' : 'none'}
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
              onPressIn={isEditMode && canDrag ? options?.drag : undefined}
              disabled={!isEditMode || !canDrag}
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
                {getTimezoneOffset(city.tz, t('common.same'))}
              </Text>
              {city.notifications && city.notifications.length > 0 && (
                <View style={styles.cityNotifications}>
                  {city.notifications.length === 1 && (
                    <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                  )}
                  {city.notifications.length === 2 && (
                    <>
                      <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                      <IconNotification2 style={styles.cityNotificationIcon} fill={theme.text.primary} />
                    </>
                  )}
                  {city.notifications.length > 2 && (
                    <>
                      <IconNotificationsMultiple style={styles.cityMultipleNotificationsIcon} fill={theme.text.primary} /><Text style={styles.cityNotificationCount}>({city.notifications.length})</Text>
                    </>
                  )}
                </View>
              )}
            </View>
          </View>
          <Text style={styles.cityTime}>
            {getLocalTime(city.tz, locale, timeFormat, timeOffsetMinutes)}
          </Text>
          <Animated.View
            pointerEvents={isEditMode ? 'auto' : 'none'}
            style={[styles.deleteButtonBox, { opacity: deleteButtonsOpacity }]}
          >
            <Pressable
              onPress={isEditMode ? () => handleOpenDeleteCityModal(city) : undefined}
              disabled={!isEditMode}
              style={styles.deleteButton}
            >
              <IconDelete1
                style={styles.deleteButtonIcon}
                fill={theme.surface.card}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Pressable>
    );
  };

  const renderItem = ({ item: city, drag, isActive, getIndex }: RenderItemParams<SelectedCity>) => {
    const index = getIndex() || 0;

    return (
      <ScaleDecorator>
        {renderCityItem(city, index, { drag, isActive, draggable: true })}
      </ScaleDecorator>
    );
  };

  const handleApplyCitySort = () => {
    setSortState({
      ...sortState,
      cityOrder: draftCityOrder,
    });
    closeSortPicker();
  };

  return (
    <GestureHandlerRootView style={{flex: 1 }}>
      <View style={styles.mainView}>
        {selectedCities.length === 0 ? (
          <View style={styles.emptyState}>
            <Pressable
              onPress={handleOpenAddCityModal}
              style={styles.emptyStateButton}
            >
              <IconAddCity style={styles.emptyStateButtonIcon} fill={theme.surface.button.primary} />
              <Text style={styles.emptyStateButtonText}>{t('common.addCity')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {sortState.cityOrder === 'none' ? (
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
            ) : (
              <ScrollView
                style={styles.citiesList}
                bounces={false}
                overScrollMode="never"
                alwaysBounceVertical={false}
              >
                {displayedCities.map((city, index) => (
                  <View key={`sorted-city-${city.id}`}>
                    {renderCityItem(city, index)}
                  </View>
                ))}
              </ScrollView>
            )}
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

        <DeleteCityModal
          visible={Boolean(cityPendingDelete)}
          cityName={cityPendingDelete?.customName || cityPendingDelete?.name || t('city.fallbackName')}
          onClose={handleCloseDeleteCityModal}
          onConfirm={handleConfirmDeleteCity}
        />

        <AddCityModal
          visible={isAddCityModalVisible}
          onClose={handleCloseAddCityModal}
          onSave={handleSaveCity}
        />

        <CitySortPickerModal
          visible={isFocused && isSortPickerVisible}
          cityOrder={draftCityOrder}
          onChangeCityOrder={setDraftCityOrder}
          onClose={closeSortPicker}
          onApply={handleApplyCitySort}
        />
      </View>
    </GestureHandlerRootView>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    mainView: {
      flex: 1,
      flexDirection: 'column',
      backgroundColor: theme.surface.transparent,
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
    emptyStateButton: {
      alignItems: 'center',
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
    cityItem: {
      paddingVertical: 16,
      paddingHorizontal: 2,
      borderRadius: 5,
      backgroundColor: theme.surface.transparent,
      borderBottomWidth: 1,
      borderBottomColor: theme.surface.fieldStrong,
    },
    cityItemLast: {
      borderBottomColor: theme.border.transparent,
    },
    cityItemDragging: {
      backgroundColor: theme.surface.elevatedMuted,
      borderBottomColor: theme.border.transparent,
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
      backgroundColor: theme.overlay.medium,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.surface.button.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteButtonIcon: {
      width: 14,
      height: 14,
      color: theme.text.onLight,
    },
    cityInfo: {
      flex: 1,
    },
    cityName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text.primary,
    },
    cityOriginalName: {
      fontSize: 16,
      color: theme.text.primary,
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
      color: theme.text.primary,
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
      color: theme.text.primary,
      paddingLeft: 3,
    },
    cityTime: {
      fontSize: 43,
      fontWeight: '300',
      marginLeft: 12,
      color: theme.text.primary,
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
      color: theme.text.primary,
    },
  });
}
