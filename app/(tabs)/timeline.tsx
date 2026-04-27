import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, ScrollView } from 'react-native';

import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

import Animated, {
  clamp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { CitySortPickerModal } from '@/components/city-sort-picker-modal';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import type { CityNotification } from '@/contexts/selected-cities-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { CityOrderMode, useNotificationsSort } from '@/contexts/notifications-sort-context';
import { useI18n } from '@/hooks/use-i18n';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { getCityBaseName, getCityDisplayName } from '@/utils/city-display';
import { sortCitiesByOrder } from '@/utils/city-sorting';

import IconNotification from '@/assets/images/icon--notification-2.svg';
import IconReset from '@/assets/images/icon--reset-1.svg';
import Arrow1 from '@/assets/images/icon--arrow-1.svg';
import IconAddCity from '@/assets/images/icon--cities--outlined.svg';

import IconDelete from '@/assets/images/icon--delete-3.svg';

const TIMELINE_CLOCK_REFRESH_INTERVAL_MS = 5000;

function getTimezoneOffsetHours(timezone: string): number {
  const now = new Date();

  const localParts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const localMinutes = getPart(localParts, 'hour') * 60 + getPart(localParts, 'minute');
  const targetMinutes = getPart(targetParts, 'hour') * 60 + getPart(targetParts, 'minute');

  let diffMinutes = targetMinutes - localMinutes;

  if (diffMinutes > 12 * 60) {
    diffMinutes -= 24 * 60;
  }

  if (diffMinutes < -12 * 60) {
    diffMinutes += 24 * 60;
  }

  return diffMinutes / 60;
}

function getCurrentTimeInTimezone(timezone: string, locale: string, timeFormat: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  }).format(new Date());
}


const CELL_W = 74;
const DAY_HOURS = 24;
const WINDOW_HOURS = DAY_HOURS * 3;
const FOCUSED_DAY_START_INDEX = DAY_HOURS;
const FOCUSED_DAY_END_INDEX = DAY_HOURS * 2 - 1;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getDatePartsInTimezone(date: Date, timezone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
  };
}

function addDays(year: number, month: number, day: number, offsetDays: number) {
  const d = new Date(year, month - 1, day + offsetDays);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

function isSameYmd(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number }
) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function normalizeTimelineDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized;
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function shiftDay(date: Date, days: number) {
  const next = normalizeTimelineDay(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getTimelineWindowStart(day: Date) {
  const start = normalizeTimelineDay(day);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  return start;
}

function getHourDisplay(hour: number, timeFormat: string) {
  if (timeFormat === '12h') {
    return {
      hour: hour % 12 === 0 ? 12 : hour % 12,
      suffix: hour < 12 ? 'am' : 'pm',
    };
  }

  return {
    hour,
    suffix: null,
  };
}

function getDayOffsetForCellIndex(index: number) {
  return Math.floor(index / DAY_HOURS) - 1;
}

function shouldTriggerOnCityDate(
  notification: CityNotification,
  cityTz: string,
  slotParts: DateParts,
  currentCityParts: DateParts
) {
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');

  if (repeat === 'daily') {
    return true;
  }

  if (repeat === 'weekly') {
    const weekdays = notification.weekdays && notification.weekdays.length > 0
      ? notification.weekdays
      : [new Date().getDay()];
    return weekdays.includes(new Date(slotParts.year, slotParts.month - 1, slotParts.day).getDay());
  }

  if (repeat === 'monthly') {
    const dayOfMonth = notification.day ?? currentCityParts.day;
    return slotParts.day === dayOfMonth;
  }

  if (repeat === 'yearly') {
    const month = notification.month ?? currentCityParts.month;
    const day = notification.day ?? currentCityParts.day;
    return slotParts.month === month && slotParts.day === day;
  }

  if (notification.year && notification.month && notification.day) {
    return isSameYmd(slotParts, {
      year: notification.year,
      month: notification.month,
      day: notification.day,
    });
  }

  const isTimePassed =
    currentCityParts.hour > notification.hour ||
    (currentCityParts.hour === notification.hour && currentCityParts.minute >= notification.minute);

  const triggerYmd = isTimePassed
    ? addDays(currentCityParts.year, currentCityParts.month, currentCityParts.day, 1)
    : { year: currentCityParts.year, month: currentCityParts.month, day: currentCityParts.day };

  return isSameYmd(slotParts, triggerYmd);
}

interface ITimeLineProps {
  x: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  sidePad: number;
  city: SelectedCity;
  windowStartDate: Date;
  timelineWidth: number;
  timeFormat: string;
  width: number;
  onUserInteraction?: () => void;
}

function TimelineComponent({ x, minX, maxX, enabled, sidePad, city, windowStartDate, timelineWidth, timeFormat, width, onUserInteraction }: ITimeLineProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const startX = useSharedValue(0);
  const cells = useMemo(() => {
    const notifications = city.notifications || [];
    const notificationsByHour = new Map<number, CityNotification[]>();
    const currentCityParts = getDatePartsInTimezone(new Date(), city.tz);

    notifications.forEach((notification) => {
      if (!notification.enabled) {
        return;
      }

      if (!notificationsByHour.has(notification.hour)) {
        notificationsByHour.set(notification.hour, []);
      }

      notificationsByHour.get(notification.hour)?.push(notification);
    });

    return Array.from({ length: WINDOW_HOURS }, (_, index) => {
      const slotDate = addHours(windowStartDate, index);
      const slotParts = getDatePartsInTimezone(slotDate, city.tz);
      const display = getHourDisplay(slotParts.hour, timeFormat);
      const slotNotifications = notificationsByHour.get(slotParts.hour) || [];
      let notificationCount = 0;

      slotNotifications.forEach((notification) => {
        if (shouldTriggerOnCityDate(notification, city.tz, slotParts, currentCityParts)) {
          notificationCount += 1;
        }
      });

      return {
        key: `${city.id}-${slotDate.getTime()}`,
        dayOffset: Math.floor(index / DAY_HOURS) - 1,
        hour: display.hour,
        suffix: display.suffix,
        notificationCount,
      };
    });
  }, [city, timeFormat, windowStartDate]);

  const pan = useMemo(() => {
    const snapToCellCenter = (xNow: number) => {
      "worklet";
      const i = Math.round((xNow + width / 2 - sidePad - CELL_W / 2) / CELL_W);
      const clampedI = Math.max(0, Math.min(WINDOW_HOURS - 1, i));

      const target = sidePad + (clampedI + 0.5) * CELL_W - width / 2;
      return clamp(target, minX, maxX);
    };

    return Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX([-12, 12])
      .failOffsetY([-12, 12])
      .onBegin(() => {
        if (onUserInteraction) {
          runOnJS(onUserInteraction)();
        }
        startX.value = x.value;
      })
      .onUpdate((e) => {
        x.value = clamp(startX.value - e.translationX, minX, maxX);
      })
      .onEnd((e) => {
        const projected = clamp(x.value - e.velocityX * 0.12, minX, maxX);
        const target = snapToCellCenter(projected);
        x.value = withSpring(target, { duration: 220 });
      });
  }, [enabled, maxX, minX, onUserInteraction, sidePad, startX, width, x]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
        <Animated.View style={[{ width: timelineWidth, flexDirection: "row" }, style]}>
          <View style={{ width: sidePad }} />

          {cells.map((cell, index) => {
            const isFocusedDay = cell.dayOffset === 0;
            const isDayStart = index === DAY_HOURS || index === DAY_HOURS * 2;

            return (
              <View
                key={cell.key}
                style={styles.hourBox}
              >
                <View
                  style={[
                    styles.hourBlock,
                    timeFormat === '12h' && styles.hourBlock12hFormat,
                    !isFocusedDay && styles.hourBlockNeighborDay,
                    isDayStart && styles.hourBlockDayStart,
                  ]}
                >
                  {timeFormat === '12h' ? (
                    <>
                      <Text style={[styles.hourBlockHour]}>{cell.hour}</Text>
                      <Text style={[styles.hourBlockAmPM]}>{cell.suffix}</Text>
                    </>
                  ) : (
                    <Text style={[styles.hourBlockHour]}>{cell.hour}</Text>
                  )}

                  {cell.notificationCount > 0 && (
                    <View style={styles.notificationCountBadge}>
                      <IconNotification
                        style={styles.notificationCountIcon}
                        fill={theme.surface.button.subtleWeak}
                      />
                      {cell.notificationCount > 1 && (
                        <Text style={styles.notificationCountText}>{cell.notificationCount}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )
          })}

          <View style={{ width: sidePad }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const Timeline = React.memo(
  TimelineComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.x === nextProps.x &&
      prevProps.minX === nextProps.minX &&
      prevProps.maxX === nextProps.maxX &&
      prevProps.enabled === nextProps.enabled &&
      prevProps.sidePad === nextProps.sidePad &&
      prevProps.city === nextProps.city &&
      prevProps.windowStartDate.getTime() === nextProps.windowStartDate.getTime() &&
      prevProps.timelineWidth === nextProps.timelineWidth &&
      prevProps.timeFormat === nextProps.timeFormat &&
      prevProps.width === nextProps.width &&
      prevProps.onUserInteraction === nextProps.onUserInteraction
    );
  }
);

export default function TimelineScreen() {
  const { theme } = useAppTheme();
  const { locale, t } = useI18n();
  const { selectedCities, reorderCities, addCity, removeCity } = useSelectedCities();
  const { timeFormat } = useSettings();
  const { isEditMode } = useEditMode();
  const { sortState, setSortState, isSortPickerVisible, closeSortPicker } = useNotificationsSort();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [clockTick, setClockTick] = useState(0);
  const isFocused = useIsFocused();
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));
  const [isAddCityModalVisible, setIsAddCityModalVisible] = useState(false);
  const [cityPendingDelete, setCityPendingDelete] = useState<SelectedCity | null>(null);
  const [draftCityOrder, setDraftCityOrder] = useState<CityOrderMode>(sortState.cityOrder);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    // Refresh immediately on focus so the user never sees stale time after returning.
    setClockTick((t) => t + 1);

    const timer = setInterval(() => {
      setClockTick((t) => t + 1);
    }, TIMELINE_CLOCK_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isFocused]);

  useEffect(() => {
    if (isSortPickerVisible && isFocused) {
      setDraftCityOrder(sortState.cityOrder);
    }
  }, [isFocused, isSortPickerVisible, sortState.cityOrder]);

  const { width } = useWindowDimensions();
  const displayedCities = useMemo(
    () =>
      sortCitiesByOrder(
        selectedCities,
        sortState.cityOrder,
        locale,
        (city) => getCityDisplayName(city, localizedCityNames[city.cityId])
      ),
    [locale, localizedCityNames, selectedCities, sortState.cityOrder]
  );
  const offsetsMap = useMemo(() => {
    const map = new Map<number, number>();

    displayedCities.forEach((city) => {
      const offset = getTimezoneOffsetHours(city.tz);
      map.set(city.id, offset);
    });

    return map;
  }, [displayedCities]);
  const sidePad = Math.max(0, width / 2 - CELL_W / 2);
  const timelineWidth = WINDOW_HOURS * CELL_W + sidePad * 2;
  const maxScrollX = Math.max(0, timelineWidth - width);
  const minScrollX = 0;

  const [dragging, setDragging] = useState(false);
  const initialCenterHourIndex = FOCUSED_DAY_START_INDEX + new Date().getHours();
  const [windowDay, setWindowDay] = useState(() => normalizeTimelineDay(new Date()));
  const [focusedDayOffset, setFocusedDayOffset] = useState<-1 | 0 | 1>(0);
  const [pendingShiftDirection, setPendingShiftDirection] = useState<-1 | 0 | 1>(0);
  const windowStartDate = useMemo(() => getTimelineWindowStart(windowDay), [windowDay]);
  const hasUserAdjustedTimelineRef = useRef(false);

  const getCenterXForHourIndex = useCallback((hourIndex: number) => {
    return sidePad + (hourIndex + 0.5) * CELL_W - width / 2;
  }, [sidePad, width]);

  const initialScrollValue = getCenterXForHourIndex(initialCenterHourIndex);

  const x = useSharedValue(initialScrollValue);
  const isDayShiftInFlight = useSharedValue(false);

  useEffect(() => {
    x.value = clamp(x.value, minScrollX, maxScrollX);
  }, [maxScrollX, minScrollX, x]);

  useEffect(() => {
    if (!isFocused || hasUserAdjustedTimelineRef.current) {
      return;
    }

    const today = normalizeTimelineDay(new Date());
    const currentHourIndex = FOCUSED_DAY_START_INDEX + new Date().getHours();

    if (focusedDayOffset !== 0) {
      return;
    }

    if (today.getTime() !== windowDay.getTime()) {
      setWindowDay(today);
      setFocusedDayOffset(0);
    }

    x.value = withSpring(
      clamp(getCenterXForHourIndex(currentHourIndex), minScrollX, maxScrollX),
      { duration: 220 }
    );
  }, [
    clockTick,
    focusedDayOffset,
    getCenterXForHourIndex,
    isFocused,
    maxScrollX,
    minScrollX,
    windowDay,
    x,
  ]);

  const resetToLocalHour = useCallback(() => {
    const today = normalizeTimelineDay(new Date());
    const nextCenterHourIndex = FOCUSED_DAY_START_INDEX + new Date().getHours();
    const target = getCenterXForHourIndex(nextCenterHourIndex);
    hasUserAdjustedTimelineRef.current = false;
    setWindowDay(today);
    setFocusedDayOffset(0);
    x.value = withSpring(clamp(target, minScrollX, maxScrollX), { duration: 220 });
  }, [getCenterXForHourIndex, maxScrollX, minScrollX, x]);

  const handleOpenAddCityModal = useCallback(() => {
    setIsAddCityModalVisible(true);
  }, []);

  const handleCloseAddCityModal = useCallback(() => {
    setIsAddCityModalVisible(false);
  }, []);

  const handleSaveCity = useCallback((city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  }, [addCity]);

  const handleOpenDeleteCityModal = useCallback((city: SelectedCity) => {
    setCityPendingDelete(city);
  }, []);

  const handleCloseDeleteCityModal = useCallback(() => {
    setCityPendingDelete(null);
  }, []);

  const handleConfirmDeleteCity = useCallback(() => {
    if (!cityPendingDelete) {
      return;
    }

    removeCity(cityPendingDelete.id);
    setCityPendingDelete(null);
  }, [cityPendingDelete, removeCity]);

  const shiftFocusedTimelineDay = useCallback((days: number) => {
    hasUserAdjustedTimelineRef.current = true;
    setWindowDay((prev) => shiftDay(prev, days));
    setFocusedDayOffset(0);
  }, []);

  const resetSelectedDayToToday = useCallback(() => {
    resetToLocalHour();
  }, [resetToLocalHour]);

  const shiftTimelineWindow = useCallback((direction: -1 | 1) => {
    setWindowDay((prev) => shiftDay(prev, direction));
  }, []);

  const beginWindowShift = useCallback((direction: -1 | 1) => {
    setPendingShiftDirection(direction);
  }, []);

  const handleTimelineInteraction = useCallback(() => {
    hasUserAdjustedTimelineRef.current = true;
  }, []);

  const updateFocusedDayOffset = useCallback((nextFocusedDayOffset: -1 | 0 | 1) => {
    setFocusedDayOffset((prev) => (prev === nextFocusedDayOffset ? prev : nextFocusedDayOffset));
  }, []);

  const noopAfterRebase = useCallback(() => {
    setFocusedDayOffset(0);
  }, []);

  useEffect(() => {
    isDayShiftInFlight.value = false;
  }, [isDayShiftInFlight, windowDay]);

  useEffect(() => {
    if (pendingShiftDirection === 0) {
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;

    frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        setPendingShiftDirection(0);
      });
    });

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
    };
  }, [pendingShiftDirection, windowDay]);

  useAnimatedReaction(
    () => {
      const nextCenterHourIndex = Math.round((x.value + width / 2 - sidePad - CELL_W / 2) / CELL_W);
      const nextFocusedDayOffset: -1 | 0 | 1 =
        nextCenterHourIndex < FOCUSED_DAY_START_INDEX
          ? -1
          : nextCenterHourIndex > FOCUSED_DAY_END_INDEX
            ? 1
            : 0;

      return {
        centerHourIndex: nextCenterHourIndex,
        focusedDayOffset: nextFocusedDayOffset,
        shiftLocked: isDayShiftInFlight.value,
      };
    },
    ({ centerHourIndex, focusedDayOffset: nextFocusedDayOffset, shiftLocked }) => {
      if (shiftLocked) {
        return;
      }

      if (centerHourIndex < FOCUSED_DAY_START_INDEX) {
        isDayShiftInFlight.value = true;
        x.value += DAY_HOURS * CELL_W;
        runOnJS(beginWindowShift)(-1);
        runOnJS(noopAfterRebase)();
        runOnJS(shiftTimelineWindow)(-1);
        return;
      }

      if (centerHourIndex > FOCUSED_DAY_END_INDEX) {
        isDayShiftInFlight.value = true;
        x.value -= DAY_HOURS * CELL_W;
        runOnJS(beginWindowShift)(1);
        runOnJS(noopAfterRebase)();
        runOnJS(shiftTimelineWindow)(1);
        return;
      }

      runOnJS(updateFocusedDayOffset)(nextFocusedDayOffset);
    },
    [isDayShiftInFlight, noopAfterRebase, shiftTimelineWindow, sidePad, updateFocusedDayOffset, width, x]
  );

  const focusedDay = useMemo(
    () => shiftDay(windowDay, focusedDayOffset),
    [focusedDayOffset, windowDay]
  );

  const skeletonDayOffset = pendingShiftDirection === 1
    ? 1
    : pendingShiftDirection === -1
      ? -1
      : null;

  const selectedDayMonthDay = useMemo(() => {
    const parts = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
    }).formatToParts(focusedDay);

    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';

    return `${month}, ${day}`;
  }, [focusedDay, locale]);

  const renderCityRow = (
    city: SelectedCity,
    options?: { drag?: () => void; isActive?: boolean; draggable?: boolean }
  ) => {
    const timezoneOffset = offsetsMap.get(city.id) || 0;
    const canDrag = Boolean(options?.draggable && sortState.cityOrder === 'none');

    let timeZoneLabel;

    if (timezoneOffset === 0) {
      timeZoneLabel = `, ${t('common.same')}`;
    } else if (timezoneOffset > 0) {
      timeZoneLabel = `, +${timezoneOffset}`
    } else {
      timeZoneLabel = `, ${timezoneOffset}`
    }

    return (
      <Pressable
        onLongPress={canDrag ? options?.drag : undefined}
        delayLongPress={150}
        style={[styles.listItem, options?.isActive && styles.listItemDragging]}
      >
        <View style={styles.listItemHeader}>
          {isEditMode && canDrag && (
            <Pressable
              onPress={options?.drag}
              style={styles.dragHandle}
            >
              <Text style={styles.dragHandleText}>☰</Text>
            </Pressable>
          )}

          <Text style={styles.listItemTitle} numberOfLines={1}>
            <Text style={styles.listItemTitleCity}>
              {getCityDisplayName(city, localizedCityNames[city.cityId])}
              {city.customName && <> ({getCityBaseName(city, localizedCityNames[city.cityId])})</>}
            </Text>
            <Text style={styles.listItemTitleTimeOffset}>{timeZoneLabel}</Text>
          </Text>

          <Text style={styles.listItemCurrentTime} numberOfLines={1}>
            {getCurrentTimeInTimezone(city.tz, locale, timeFormat)}
          </Text>

          {isEditMode && (
            <Pressable
              onPress={() => handleOpenDeleteCityModal(city)}
              style={styles.deleteButton}
            >
              <IconDelete fill={theme.text.warning} style={styles.deleteButtonIcon} />
            </Pressable>
          )}
        </View>

        <View style={styles.timelineRowContainer}>
          <Timeline
            x={x}
            minX={minScrollX}
            maxX={maxScrollX}
            enabled={!dragging && !isEditMode}
            sidePad={sidePad}
          city={city}
          windowStartDate={windowStartDate}
          timelineWidth={timelineWidth}
          timeFormat={timeFormat}
          width={width}
          onUserInteraction={handleTimelineInteraction}
        />
          {skeletonDayOffset !== null && (
            <View pointerEvents="none" style={styles.timelineSkeletonOverlay}>
              <View style={{ width: sidePad }} />
              {Array.from({ length: WINDOW_HOURS }, (_, index) => {
                const dayOffset = getDayOffsetForCellIndex(index);
                const shouldShowSkeleton = dayOffset === skeletonDayOffset;

                return (
                  <View key={`timeline-skeleton-${city.id}-${index}`} style={styles.hourBox}>
                    <View
                      style={[
                        styles.hourBlock,
                        timeFormat === '12h' && styles.hourBlock12hFormat,
                        styles.hourBlockSkeletonBase,
                        !shouldShowSkeleton && styles.hourBlockSkeletonHidden,
                      ]}
                    />
                  </View>
                );
              })}
              <View style={{ width: sidePad }} />
            </View>
          )}
        </View>
      </Pressable>
    )
  };

  const renderItem = ({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    return (
      <ScaleDecorator>
        {renderCityRow(city, { drag, isActive, draggable: true })}
      </ScaleDecorator>
    );
  };

  const handleApplyCitySort = useCallback(() => {
    setSortState({
      ...sortState,
      cityOrder: draftCityOrder,
    });
    closeSortPicker();
  }, [closeSortPicker, draftCityOrder, setSortState, sortState]);

  if (selectedCities.length < 1) {
    return (
      <>
        <View style={styles.emptyStateContainer}>
          <Pressable
            onPress={handleOpenAddCityModal}
            style={styles.emptyStateButton}
          >
            <IconAddCity style={styles.emptyStateButtonIcon} fill={theme.surface.button.primary} />
            <Text style={styles.emptyStateButtonText}>{t('common.addCity')}</Text>
          </Pressable>
        </View>

        <AddCityModal
          visible={isAddCityModalVisible}
          onClose={handleCloseAddCityModal}
          onSave={handleSaveCity}
        />

        <DeleteCityModal
          visible={Boolean(cityPendingDelete)}
          cityName={cityPendingDelete ? getCityDisplayName(cityPendingDelete, localizedCityNames[cityPendingDelete.cityId]) : t('city.fallbackName')}
          onClose={handleCloseDeleteCityModal}
          onConfirm={handleConfirmDeleteCity}
        />
      </>
    )
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.listContentContainer}>
        <View style={{
          ...styles.middleMarker,
          left: width / 2 - CELL_W / 2
        }} />
        {sortState.cityOrder === 'none' ? (
          <DraggableFlatList
            contentContainerStyle={styles.listContent}
            data={selectedCities}
            keyExtractor={(c) => `${c.id}`}
            renderItem={renderItem}
            onDragBegin={() => setDragging(true)}
            onDragEnd={({ data }) => {
              reorderCities(data);
              setDragging(false);
            }}
            activationDistance={12}
            scrollEnabled={!isEditMode || !dragging}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {displayedCities.map((city) => (
              <View key={`sorted-city-${city.id}`}>
                {renderCityRow(city)}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.resetBar} pointerEvents="box-none">
        <Pressable style={styles.resetButtonPressable} onPress={resetToLocalHour}>
          <View style={styles.resetButton}>
            <IconReset
              style={styles.resetButtonIcon}
              fill={theme.surface.button.subtleStrong}
            />
          </View>
        </Pressable>
      </View>
      <View style={styles.daySelectorBar}>
        <View style={styles.daySelector}>
          <Pressable style={styles.daySelectorButton} onPress={() => shiftFocusedTimelineDay(-1)}>
            <Arrow1
              style={[styles.daySelectorButtonIcon, styles.daySelectorButtonIconRight]}
              fill={theme.text.primary}
            />
          </Pressable>
          <Pressable style={styles.daySelectorCenter} onPress={resetSelectedDayToToday}>
            <Text style={styles.daySelectorWeekdayText}>
              {focusedDay.toLocaleDateString(locale, {
                weekday: 'long',
              })}
            </Text>
            <Text style={styles.daySelectorDateText}>
              {selectedDayMonthDay}
            </Text>
          </Pressable>
          <Pressable style={styles.daySelectorButton} onPress={() => shiftFocusedTimelineDay(1)}>
            <Arrow1
              style={[styles.daySelectorButtonIcon]}
              fill={theme.text.primary}
            />
          </Pressable>
        </View>
      </View>

      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <DeleteCityModal
        visible={Boolean(cityPendingDelete)}
        cityName={cityPendingDelete ? getCityDisplayName(cityPendingDelete, localizedCityNames[cityPendingDelete.cityId]) : t('city.fallbackName')}
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />

      <CitySortPickerModal
        visible={isFocused && isSortPickerVisible}
        cityOrder={draftCityOrder}
        onChangeCityOrder={setDraftCityOrder}
        onClose={closeSortPicker}
        onApply={handleApplyCitySort}
      />
    </GestureHandlerRootView>
  );
}

const DAY_SELECTOR_HEIGHT = 60;

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
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
    container: {
      flex: 1,
    },
    listContentContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    listContent: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    middleMarker: {
      position: 'absolute',
      top: 0,
      bottom: DAY_SELECTOR_HEIGHT,
      left: 0,
      width: CELL_W,
      height: 3000,
      backgroundColor: theme.surface.elevatedSoft,
    },
    timelineViewport: {
      overflow: 'hidden',
      paddingBottom: 11
    },
    timelineRowContainer: {
      position: 'relative',
    },
    timelineSkeletonOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 11,
      flexDirection: 'row',
      alignItems: 'center',
    },
    listItem: {
      paddingTop: 11,
    },
    listItemDragging: {
      backgroundColor: theme.surface.elevatedSoft,
    },
    listItemHeader: {
      paddingHorizontal: 22,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    dragHandle: {
      marginRight: 10,
    },
    dragHandleText: {
      fontSize: 20,
      lineHeight: 20,
      color: theme.text.secondary,
    },
    deleteButton: {
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
    listItemTitle: {
      flex: 1,
    },
    listItemTitleCity: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: 'bold',
      color: theme.text.primary,
    },
    listItemTitleTimeOffset: {
      fontSize: 16,
      lineHeight: 20,
      flex: 1,
      color: theme.text.primary,
    },
    listItemCurrentTime: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text.primary,
      textAlign: 'right',
    },
    hourBox: {
      width: CELL_W,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourBlock: {
      width: 64,
      height: 64,
      paddingTop: 4,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.surface.fieldStrong,
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.text.helper,
    },
    hourBlock12hFormat: {
      paddingTop: 8,
      justifyContent: 'flex-start',
    },
    hourBlockNeighborDay: {
      opacity: 0.58,
    },
    hourBlockDayStart: {
      borderWidth: 1,
      borderColor: theme.border.subtle,
    },
    hourBlockSkeletonBase: {
      backgroundColor: theme.surface.elevatedSoft,
      opacity: 0.85,
    },
    hourBlockSkeletonHidden: {
      opacity: 0,
    },
    hourBlockHour: {
      fontSize: 36,
      lineHeight: 36,
      fontWeight: '300',
      color: theme.text.primary,
    },
    hourBlockAmPM: {
      fontSize: 14,
      lineHeight: 14,
      color: theme.text.primary,
      top: -3,
    },
    notificationCountBadge: {
      position: 'absolute',
      bottom: -8,
      minWidth: 18,
      height: 15,
      borderRadius: 8,
      paddingHorizontal: 5,
      flexDirection: 'row',
      gap: 2,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.primary,
    },
    notificationCountIcon: {
      width: 9,
      height: 9,
    },
    notificationCountText: {
      fontSize: 12,
      lineHeight: 13,
      color: theme.text.onLight,
    },
    resetBar: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    resetButtonPressable: {
      position: 'absolute',
      bottom: -10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButton: {
      borderRadius: theme.radius.lg,
      width: 20,
      height: 20,
      backgroundColor: theme.surface.button.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetButtonIcon: {
      width: 12,
      height: 12,
    },
    daySelectorBar: {
      height: 60,
      borderTopWidth: 1,
      borderColor: theme.border.muted,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    daySelector: {
      width: 256,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    daySelectorButton: {
      width: 36,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface.button.subtle,
    },
    daySelectorButtonIcon: {
      width: 7,
      height: 12,
    },
    daySelectorButtonIconRight: {
      transform: [{ rotate: '180deg'}],
    },
    daySelectorCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
    },
    daySelectorWeekdayText: {
      color: theme.text.primary,
      fontSize: 14,
    },
    daySelectorDateText: {
      color: theme.text.primary,
      fontSize: 18,
    },
  });
}
