import { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';

import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';

import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import type { CityNotification } from '@/contexts/selected-cities-context';

const HOUR_BLOCK_SIZE = 64;
const HOURS_RANGE = 24;

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

function formatHourLabel(hour: number, timeFormat: '12h' | '24h'): { label: string; period?: string } {
  if (timeFormat === '24h') {
    return { label: hour.toString().padStart(2, '0') };
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return { label: hour12.toString(), period };
}

function getHoursForCity(timezone: string, offsetMinutes: number, timeFormat: '12h' | '24h'): { hour: number; label: string; period?: string }[] {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
  });

  const currentHour = parseInt(formatter.format(shiftedTime), 10);
  const hours: { hour: number; label: string; period?: string }[] = [];

  for (let i = -HOURS_RANGE; i < HOURS_RANGE; i++) {
    let hour = (currentHour + i) % 24;
    if (hour < 0) hour += 24;
    const formatted = formatHourLabel(hour, timeFormat);
    hours.push({
      hour,
      label: formatted.label,
      period: formatted.period,
    });
  }

  return hours;
}

const CELL_W = 74;
const DAY_HOURS = 24;
const DAY_SELECTOR_HEIGHT = 52;

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

function shouldTriggerOnSelectedDay(
  notification: CityNotification,
  cityTz: string,
  selectedYmd: { year: number; month: number; day: number },
  selectedWeekday: number
) {
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');

  if (repeat === 'daily') {
    return true;
  }

  if (repeat === 'weekly') {
    const weekdays = notification.weekdays && notification.weekdays.length > 0
      ? notification.weekdays
      : [new Date().getDay()];
    return weekdays.includes(selectedWeekday);
  }

  if (repeat === 'monthly') {
    const dayOfMonth = notification.day ?? getDatePartsInTimezone(new Date(), cityTz).day;
    return selectedYmd.day === dayOfMonth;
  }

  if (repeat === 'yearly') {
    const todayInCity = getDatePartsInTimezone(new Date(), cityTz);
    const month = notification.month ?? todayInCity.month;
    const day = notification.day ?? todayInCity.day;
    return selectedYmd.month === month && selectedYmd.day === day;
  }

  if (notification.year && notification.month && notification.day) {
    return isSameYmd(selectedYmd, {
      year: notification.year,
      month: notification.month,
      day: notification.day,
    });
  }

  const nowInCity = getDatePartsInTimezone(new Date(), cityTz);
  const isTimePassed =
    nowInCity.hour > notification.hour ||
    (nowInCity.hour === notification.hour && nowInCity.minute >= notification.minute);

  const triggerYmd = isTimePassed
    ? addDays(nowInCity.year, nowInCity.month, nowInCity.day, 1)
    : { year: nowInCity.year, month: nowInCity.month, day: nowInCity.day };

  return isSameYmd(selectedYmd, triggerYmd);
}

function getHourlyNotificationCounts(
  city: SelectedCity,
  selectedYmd: { year: number; month: number; day: number },
  selectedWeekday: number
): Record<number, number> {
  const result: Record<number, number> = {};
  const notifications = city.notifications || [];

  notifications.forEach((n) => {
    if (!n.enabled) return;
    if (n.hour < 0 || n.hour > 23) return;

    if (shouldTriggerOnSelectedDay(n, city.tz, selectedYmd, selectedWeekday)) {
      result[n.hour] = (result[n.hour] || 0) + 1;
    }
  });

  return result;
}

interface ITimeLineProps {
  x: SharedValue<number>;
  minX: number;
  maxX: number;
  enabled: boolean;
  selectedDay: Date;
  rowOffsetHours: number;
  totalHours: number;
  dayStartIndex: number;
  timelineWidth: number;
  hourlyCounts: Record<number, number>;
  timeFormat: string;
  width: number;
}

function Timeline({ x, minX, maxX, enabled, selectedDay, rowOffsetHours, totalHours, dayStartIndex, timelineWidth, hourlyCounts, timeFormat, width }: ITimeLineProps) {
  const startX = useSharedValue(0);

  const snapToCellCenter = (xNow: number) => {
    "worklet";
    const i = Math.round((xNow + width / 2 - CELL_W / 2) / CELL_W);
    const clampedI = Math.max(0, Math.min(totalHours - 1, i));

    const target = (clampedI + 0.5) * CELL_W - width / 2;
    return clamp(target, minX, maxX);
  };

  const pan = useMemo(() => {
    return Gesture.Pan()
      .enabled(enabled)
      // активируемся только при заметном горизонтальном движении
      .activeOffsetX([-12, 12])
      // если пользователь уходит по Y — отдаём жест вертикальному скроллу списка
      .failOffsetY([-12, 12])
      .onBegin(() => {
        startX.value = x.value;
      })
      .onUpdate((e) => {
        // x растёт при свайпе влево
        const next = startX.value - e.translationX;
        x.value = clamp(next, minX, maxX);
      })
      .onEnd((e) => {
        x.value = withDecay(
          { velocity: -e.velocityX, clamp: [minX, maxX] },
          (finished) => {
            if (finished) {
              const target = snapToCellCenter(x.value);
              x.value = withSpring(target, { duration: 180 });
            }
          }
        );
      });
  }, [enabled, maxX, minX]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value - rowOffsetHours * CELL_W }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
          <Animated.View style={[{ width: timelineWidth, flexDirection: "row" }, style]}>
          {Array.from({ length: totalHours }).map((_, i) => {
            const absoluteHour = i - dayStartIndex;
            const isMainDayHour = absoluteHour >= 0 && absoluteHour < DAY_HOURS;
            const normalizedHour = ((absoluteHour % DAY_HOURS) + DAY_HOURS) % DAY_HOURS;
            const hour = timeFormat === '12h' ? normalizedHour % 12 : normalizedHour;
            const ampm = normalizedHour < 12 ? 'am' : 'pm';
            const isYesterdayHour = absoluteHour < 0;
            const isTomorrowHour = absoluteHour >= DAY_HOURS;
            const isMidnight = normalizedHour === 0;
            const dayOffset = Math.floor(absoluteHour / DAY_HOURS);
            const count = isMainDayHour ? (hourlyCounts[normalizedHour] || 0) : 0;
            const dayDate = new Date(selectedDay);
            dayDate.setDate(selectedDay.getDate() + dayOffset);
            const dayDateLabel = dayDate.toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
            });

            return (
              <View
                key={i}
                style={styles.hourBox}
              >
                <View
                  style={[
                    styles.hourBlock,
                    isYesterdayHour && styles.hourBlockYesterday,
                    isTomorrowHour && styles.hourBlockTomorrow,
                  ]}
                >
                  {isMidnight ? (
                    <Text style={styles.hourBlockDate}>{dayDateLabel}</Text>
                  ) : timeFormat === '12h' ? (
                    <>
                      <Text style={styles.hourBlockHour}>{(hour === 0 ? 12 : hour)}</Text>
                      <Text style={styles.hourBlockAmPM}>{ampm}</Text>
                    </>
                  ) : (
                    <Text style={styles.hourBlockHour}>{hour}</Text>
                  )}
                  {count > 0 && (
                    <View style={styles.notificationCountBadge}>
                      <Text style={styles.notificationCountText}>{count}</Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
          </Animated.View>
        </View>
    </GestureDetector>
  );
}

export default function TimelineScreen() {
  const { selectedCities, reorderCities, removeCity } = useSelectedCities();
  const { timeFormat } = useSettings();
  const { isEditMode } = useEditMode();

  const { width } = useWindowDimensions();
  const { offsetsMap, minOffset, maxOffset } = useMemo(() => {
    const map = new Map<number, number>();
    let min = 0;
    let max = 0;

    selectedCities.forEach((city) => {
      const offset = getTimezoneOffsetHours(city.tz);
      map.set(city.id, offset);
      if (offset < min) min = offset;
      if (offset > max) max = offset;
    });

    return { offsetsMap: map, minOffset: min, maxOffset: max };
  }, [selectedCities]);

  const leftPadHours = Math.ceil(Math.max(0, -minOffset));
  const rightPadHours = Math.ceil(Math.max(0, maxOffset));
  const totalHours = DAY_HOURS + leftPadHours + rightPadHours;
  const timelineWidth = totalHours * CELL_W;
  const maxX = Math.max(0, timelineWidth - width);
  const rawMinScrollX = Math.max(0, -minOffset * CELL_W);
  const rawMaxScrollX = Math.min(maxX, maxX - maxOffset * CELL_W);
  const minScrollX = rawMinScrollX <= rawMaxScrollX ? rawMinScrollX : 0;
  const maxScrollX = rawMinScrollX <= rawMaxScrollX ? rawMaxScrollX : maxX;

  const [dragging, setDragging] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  });

  const initialScrollValue = (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;

  const x = useSharedValue(initialScrollValue);
  x.value = clamp(x.value, minScrollX, maxScrollX);

  useFocusEffect(
    useCallback(() => {
      const target = (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;
      x.value = withTiming(clamp(target, minScrollX, maxScrollX), { duration: 220 });
    }, [leftPadHours, maxScrollX, minScrollX, width])
  );

  const resetToLocalHour = useCallback(() => {
    const target = (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;
    x.value = withSpring(clamp(target, minScrollX, maxScrollX), { duration: 220 });
  }, [leftPadHours, maxScrollX, minScrollX, width]);

  const selectedYmd = useMemo(() => ({
    year: selectedDay.getFullYear(),
    month: selectedDay.getMonth() + 1,
    day: selectedDay.getDate(),
  }), [selectedDay]);
  const selectedWeekday = selectedDay.getDay();

  const shiftSelectedDay = useCallback((days: number) => {
    setSelectedDay((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  }, []);

  const resetSelectedDayToToday = useCallback(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    setSelectedDay(now);
  }, []);

  const renderItem = ({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    const timezoneOffset = offsetsMap.get(city.id) || 0;
    const hourlyCounts = getHourlyNotificationCounts(city, selectedYmd, selectedWeekday);

    return (
      <View
        style={styles.listItem}
      >
        <View style={styles.listItemHeader}>
          <Text style={styles.listItemTitle} numberOfLines={1}>
            {city.customName || city.name} {city.customName && <>({city.name})</>}
          </Text>

          <Text style={styles.listItemTimeZone} numberOfLines={1}>
            {timezoneOffset}hrs
          </Text>
        </View>

        <Timeline
          x={x}
          minX={minScrollX}
          maxX={maxScrollX}
          enabled={!dragging}
          selectedDay={selectedDay}
          rowOffsetHours={timezoneOffset}
          totalHours={totalHours}
          dayStartIndex={leftPadHours}
          timelineWidth={timelineWidth}
          hourlyCounts={hourlyCounts}
          timeFormat={timeFormat}
          width={width}
        />
      </View>
    )
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={{
        ...styles.middleMarker,
        left: width / 2 - CELL_W / 2
      }} />
      <View style={styles.daySelectorBar}>
        <View style={styles.daySelector}>
          <Pressable style={styles.daySelectorButton} onPress={() => shiftSelectedDay(-1)}>
            <Text style={styles.daySelectorButtonText}>◀</Text>
          </Pressable>
          <Pressable style={styles.daySelectorCenter} onPress={resetSelectedDayToToday}>
            <Text style={styles.daySelectorDateText}>
              {selectedDay.toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </Text>
          </Pressable>
          <Pressable style={styles.daySelectorButton} onPress={() => shiftSelectedDay(1)}>
            <Text style={styles.daySelectorButtonText}>▶</Text>
          </Pressable>
        </View>
      </View>
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
      />
      <View style={styles.resetBar} pointerEvents="box-none">
        <Pressable style={styles.resetButtonPressable} onPress={resetToLocalHour}>
          <View style={styles.resetButton} />
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: DAY_SELECTOR_HEIGHT,
    paddingBottom: 84,
  },
  middleMarker: {
    position: 'absolute',
    top: DAY_SELECTOR_HEIGHT,
    left: 0,
    width: CELL_W,
    height: 3000,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listItem: {
    paddingTop: 11,
    paddingBottom: 11,
  },
  listItemHeader: {
    paddingHorizontal: 10,
    paddingBottom: 8,
    flexDirection: 'row'
  },
  listItemTitle: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: 'bold',
    flex: 1,
    color: 'rgba(255, 255, 255, 1)',
  },
  listItemTimeZone: {
    fontSize: 16,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 1)',
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
    paddingTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  hourBlockHour: {
    fontSize: 36,
    lineHeight: 36,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 1)',
  },
  hourBlockDate: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 1)',
    marginTop: 16,
  },
  hourBlockAmPM: {
    fontSize: 14,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 1)',
    top: -3
  },
  hourBlockYesterday: {
    opacity: 0.3,
  },
  hourBlockTomorrow: {
    opacity: 0.65,
  },
  timelineViewport: {
    overflow: 'hidden',
  },
  resetBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -8,
    alignItems: 'center',
  },
  resetButtonPressable: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    borderRadius: 10,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  daySelector: {
    height: DAY_SELECTOR_HEIGHT,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  daySelectorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  daySelectorButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  daySelectorButtonText: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 16,
    fontWeight: '600',
  },
  daySelectorCenter: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  daySelectorDateText: {
    color: 'rgba(255, 255, 255, 1)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notificationCountBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  notificationCountText: {
    fontSize: 11,
    lineHeight: 11,
    color: 'rgba(62, 63, 86, 1)',
    fontWeight: '700',
  },
})

/*
export function Timeline2() {
  const { selectedCities, reorderCities, removeCity } = useSelectedCities();
  const { timeFormat, timeOffsetMinutes } = useSettings();
  const { isEditMode } = useEditMode();
  const scrollViewRefs = useRef<Map<number, ScrollView>>(new Map());
  const isScrolling = useRef<number | null>(null);

  const { offsetsMap, maxOffset } = useMemo(() => {
    if (selectedCities.length === 0) {
      return { offsetsMap: new Map<number, number>(), maxOffset: 0 };
    }
    const offsets = selectedCities.map(city => ({
      id: city.id,
      offset: getTimezoneOffsetHours(city.tz)
    }));
    const minOffset = Math.min(0, ...offsets.map(o => o.offset));
    const map = new Map<number, number>();
    offsets.forEach(o => map.set(o.id, o.offset - minOffset));
    const max = Math.max(0, ...Array.from(map.values()));
    return { offsetsMap: map, maxOffset: max };
  }, [selectedCities]);

  const initialScrollX = HOURS_RANGE * HOUR_BLOCK_SIZE;

  const handleScroll = useCallback((cityId: number) => (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrolling.current !== null && isScrolling.current !== cityId) {
      return;
    }

    isScrolling.current = cityId;
    const scrollX = event.nativeEvent.contentOffset.x;

    scrollViewRefs.current.forEach((ref, id) => {
      if (id !== cityId && ref) {
        ref.scrollTo({ x: scrollX, animated: false });
      }
    });
  }, []);

  const handleScrollEnd = useCallback(() => {
    isScrolling.current = null;
  }, []);

  const setScrollViewRef = useCallback((cityId: number) => (ref: ScrollView | null) => {
    if (ref) {
      scrollViewRefs.current.set(cityId, ref);
    } else {
      scrollViewRefs.current.delete(cityId);
    }
  }, []);

  const renderItem = useCallback(({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    const timezoneOffsetHours = offsetsMap.get(city.id) || 0;
    const hours = getHoursForCity(city.tz, timeOffsetMinutes, timeFormat);
    const leadingPadding = timezoneOffsetHours * HOUR_BLOCK_SIZE;
    const trailingPadding = (maxOffset - timezoneOffsetHours) * HOUR_BLOCK_SIZE;

    return (
      <ScaleDecorator>
        <View style={[styles.cityRow, isActive && styles.cityRowDragging]}>
          <Pressable
            onLongPress={isEditMode ? drag : undefined}
            style={styles.cityHeader}
          >
            {isEditMode && (
              <Pressable onPressIn={drag} style={styles.dragHandle}>
                <Text style={styles.dragHandleText}>☰</Text>
              </Pressable>
            )}
            <Text style={styles.cityName} numberOfLines={1}>
              {city.customName || city.name}
            </Text>
            {isEditMode && (
              <Pressable onPress={() => removeCity(city.id)} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>-</Text>
              </Pressable>
            )}
          </Pressable>
          <View style={styles.hoursContainer}>
            <View style={{ width: leadingPadding }} />

            {hours.map((hourData, idx) => (
              <View key={idx} style={styles.hourBlock}>
                <Text style={styles.hourText}>
                  {hourData.label}
                  {hourData.period && <Text style={styles.periodText}>{hourData.period}</Text>}
                </Text>
              </View>
            ))}

            <View style={{ width: trailingPadding }} />
          </View>
        </View>
      </ScaleDecorator>
    );
  }, [isEditMode, timeFormat, timeOffsetMinutes, offsetsMap, maxOffset, handleScroll, handleScrollEnd, setScrollViewRef, removeCity, initialScrollX]);

  if (selectedCities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No cities added yet.</Text>
        <Text style={styles.emptyHint}>Add cities to see their time comparison.</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <DraggableFlatList
          data={selectedCities}
          onDragEnd={({ data }) => reorderCities(data)}
          keyExtractor={(item) => `timeline-city-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(62, 63, 86, 0.3)',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 18,
    color: '#9a9bb2',
  },
  emptyHint: {
    fontSize: 14,
    color: '#7a7b92',
    marginTop: 8,
  },
  cityRow: {},
  cityRowDragging: {
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(62, 63, 86, 0)',
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
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  hoursContainer: {
    flexDirection: 'row',
  },
  hourBlock: {
    width: HOUR_BLOCK_SIZE,
    height: HOUR_BLOCK_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  hourText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#fff',
  },
  periodText: {
    fontSize: 12,
    fontWeight: '400',
  },
});
*/
