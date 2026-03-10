import { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable } from 'react-native';

import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

import Animated, {
  clamp,
  runOnJS,
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
import type { CityNotification } from '@/contexts/selected-cities-context';

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


const CELL_W = 74;
const DAY_HOURS = 24;
const DAY_SELECTOR_HEIGHT = 52;
const EDGE_EXTRA_HOURS = 2;
const EDGE_RUBBER_MAX_PX = 110;
const EDGE_SWITCH_THRESHOLD_PX = 45;

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
  sidePad: number;
  selectedDay: Date;
  onEdgeDayShift: (direction: -1 | 1) => void;
  rowOffsetHours: number;
  totalHours: number;
  dayStartIndex: number;
  timelineWidth: number;
  hourlyCounts: Record<number, number>;
  timeFormat: string;
  width: number;
}

function Timeline({ x, minX, maxX, enabled, sidePad, selectedDay, onEdgeDayShift, rowOffsetHours, totalHours, dayStartIndex, timelineWidth, hourlyCounts, timeFormat, width }: ITimeLineProps) {
  const startX = useSharedValue(0);

  const snapToCellCenter = (xNow: number) => {
    "worklet";
    const i = Math.round((xNow + width / 2 - sidePad - CELL_W / 2) / CELL_W);
    const clampedI = Math.max(0, Math.min(totalHours - 1, i));

    const target = sidePad + (clampedI + 0.5) * CELL_W - width / 2;
    return clamp(target, minX, maxX);
  };

  const applyRubber = (distance: number) => {
    "worklet";
    return (distance * EDGE_RUBBER_MAX_PX) / (distance + EDGE_RUBBER_MAX_PX);
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
        if (next < minX) {
          const over = minX - next;
          x.value = minX - applyRubber(over);
          return;
        }

        if (next > maxX) {
          const over = next - maxX;
          x.value = maxX + applyRubber(over);
          return;
        }

        x.value = next;
      })
      .onEnd((e) => {
        if (x.value < minX - EDGE_SWITCH_THRESHOLD_PX) {
          x.value = withSpring(minX, { duration: 220 });
          runOnJS(onEdgeDayShift)(-1);
          return;
        }

        if (x.value > maxX + EDGE_SWITCH_THRESHOLD_PX) {
          x.value = withSpring(maxX, { duration: 220 });
          runOnJS(onEdgeDayShift)(1);
          return;
        }

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
  }, [enabled, maxX, minX, onEdgeDayShift, sidePad, totalHours, width]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value - rowOffsetHours * CELL_W }],
  }));

  // Per-row centerable hour range, accounting for timezone row shift.
  const centerBase = sidePad + CELL_W / 2 - width / 2;
  const minCenterHourIndex = Math.ceil(rowOffsetHours + (minX - centerBase) / CELL_W - 1e-6);
  const maxCenterHourIndex = Math.floor(rowOffsetHours + (maxX - centerBase) / CELL_W + 1e-6);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.timelineViewport}>
          <Animated.View style={[{ width: timelineWidth, flexDirection: "row" }, style]}>
          <View style={{ width: sidePad }} />
          {Array.from({ length: totalHours }).map((_, i) => {
            const absoluteHour = i - dayStartIndex;
            const isMainDayHour = absoluteHour >= 0 && absoluteHour < DAY_HOURS;
            const normalizedHour = ((absoluteHour % DAY_HOURS) + DAY_HOURS) % DAY_HOURS;
            const hour = timeFormat === '12h' ? normalizedHour % 12 : normalizedHour;
            const ampm = normalizedHour < 12 ? 'am' : 'pm';
            const isYesterdayHour = absoluteHour < 0;
            const isTomorrowHour = absoluteHour >= DAY_HOURS;
            const isLeftOutsideScrollLimit = i < minCenterHourIndex;
            const isRightOutsideScrollLimit = i > maxCenterHourIndex;
            const isOutsideScrollLimits = isLeftOutsideScrollLimit || isRightOutsideScrollLimit;
            const isFirstLeftOutside = i === minCenterHourIndex - 1;
            const isFirstRightOutside = i === maxCenterHourIndex + 1;
            const shouldFillOutsideBackground =
              (isLeftOutsideScrollLimit && !isFirstLeftOutside) ||
              (isRightOutsideScrollLimit && !isFirstRightOutside);
            const shouldUseOutsideTextColor = shouldFillOutsideBackground;
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
                    isOutsideScrollLimits && styles.hourBlockAfterLimit,
                    shouldFillOutsideBackground && styles.hourBlockOutsideFilled,
                  ]}
                >
                  {isMidnight ? (
                    <Text style={[styles.hourBlockDate, shouldUseOutsideTextColor && styles.hourBlockTextOutsideFilled]}>{dayDateLabel}</Text>
                  ) : timeFormat === '12h' ? (
                    <>
                      <Text style={[styles.hourBlockHour, shouldUseOutsideTextColor && styles.hourBlockTextOutsideFilled]}>{(hour === 0 ? 12 : hour)}</Text>
                      <Text style={[styles.hourBlockAmPM, shouldUseOutsideTextColor && styles.hourBlockTextOutsideFilled]}>{ampm}</Text>
                    </>
                  ) : (
                    <Text style={[styles.hourBlockHour, shouldUseOutsideTextColor && styles.hourBlockTextOutsideFilled]}>{hour}</Text>
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
          <View style={{ width: sidePad }} />
          </Animated.View>
        </View>
    </GestureDetector>
  );
}

export default function TimelineScreen() {
  const { selectedCities, reorderCities } = useSelectedCities();
  const { timeFormat } = useSettings();

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

  const leftPadHours = Math.ceil(Math.max(0, -minOffset)) + EDGE_EXTRA_HOURS;
  const rightPadHours = Math.ceil(Math.max(0, maxOffset)) + EDGE_EXTRA_HOURS;
  const totalHours = DAY_HOURS + leftPadHours + rightPadHours;
  const sidePad = Math.max(0, width / 2 - CELL_W / 2);
  const timelineWidth = totalHours * CELL_W + sidePad * 2;
  const maxX = Math.max(0, timelineWidth - width);

  // Safety bounds: prevent empty gaps for any timezone-shifted row.
  const safeMinScrollX = Math.max(0, -minOffset * CELL_W);
  const safeMaxScrollX = Math.min(maxX, timelineWidth - width - maxOffset * CELL_W);

  // UX bounds: allow centering only local-day hours [00..23].
  const firstLocalHourIndex = leftPadHours;
  const lastLocalHourIndex = leftPadHours + (DAY_HOURS - 1);
  const dayMinScrollX = sidePad + (firstLocalHourIndex + 0.5) * CELL_W - width / 2;
  const dayMaxScrollX = sidePad + (lastLocalHourIndex + 0.5) * CELL_W - width / 2;

  const rawMinScrollX = Math.max(safeMinScrollX, dayMinScrollX);
  const rawMaxScrollX = Math.min(safeMaxScrollX, dayMaxScrollX);
  const minScrollX = rawMinScrollX <= rawMaxScrollX ? rawMinScrollX : safeMinScrollX;
  const maxScrollX = rawMinScrollX <= rawMaxScrollX ? rawMaxScrollX : safeMaxScrollX;

  const [dragging, setDragging] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  });
  const dayTransitionOpacity = useSharedValue(1);

  const initialScrollValue = sidePad + (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;

  const x = useSharedValue(initialScrollValue);
  x.value = clamp(x.value, minScrollX, maxScrollX);

  useFocusEffect(
    useCallback(() => {
      const target = sidePad + (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;
      x.value = withTiming(clamp(target, minScrollX, maxScrollX), { duration: 220 });
    }, [leftPadHours, maxScrollX, minScrollX, sidePad, width])
  );

  const resetToLocalHour = useCallback(() => {
    const target = sidePad + (leftPadHours + new Date().getHours() + 0.5) * CELL_W - width / 2;
    x.value = withSpring(clamp(target, minScrollX, maxScrollX), { duration: 220 });
  }, [leftPadHours, maxScrollX, minScrollX, sidePad, width]);

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

  const handleEdgeDayShift = useCallback((direction: -1 | 1) => {
    shiftSelectedDay(direction);
  }, [shiftSelectedDay]);

  const resetSelectedDayToToday = useCallback(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    setSelectedDay(now);
  }, []);

  useEffect(() => {
    dayTransitionOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        dayTransitionOpacity.value = withTiming(1, { duration: 200 });
      }
    });
  }, [selectedDay]);

  const dayTransitionStyle = useAnimatedStyle(() => ({
    opacity: dayTransitionOpacity.value,
  }));

  const renderItem = ({ item: city }: RenderItemParams<SelectedCity>) => {
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
          sidePad={sidePad}
          selectedDay={selectedDay}
          onEdgeDayShift={handleEdgeDayShift}
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
      <Animated.View style={[styles.listFadeContainer, dayTransitionStyle]}>
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
      </Animated.View>
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
  listFadeContainer: {
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
  hourBlockAfterLimit: {
    borderColor: 'black',
  },
  hourBlockOutsideFilled: {
    backgroundColor: '#ffffff',
  },
  hourBlockTextOutsideFilled: {
    color: '#000000',
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
