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

import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useEditMode } from '@/contexts/edit-mode-context';

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
const HOURS = 49;
const TIMELINE_W = HOURS * CELL_W;

interface ITimeLineProps {
  x: SharedValue<number>;
  maxX: number;
  enabled: boolean;
  currentHour: number;
  timeFormat: string;
  width: number;
}

function Timeline({ x, maxX, enabled, currentHour, timeFormat, width }: ITimeLineProps) {
  const startX = useSharedValue(0);

  const snapToCellCenter = (xNow: number) => {
    "worklet";
    const i = Math.round((xNow + width / 2 - CELL_W / 2) / CELL_W);
    const clampedI = Math.max(0, Math.min(HOURS - 1, i));

    const target = (clampedI + 0.5) * CELL_W - width / 2;
    return clamp(target, 0, maxX);
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
        x.value = clamp(next, 0, maxX);
      })
      .onEnd((e) => {
        x.value = withDecay(
          { velocity: -e.velocityX, clamp: [0, maxX] },
          (finished) => {
            if (finished) {
              const target = snapToCellCenter(x.value);
              x.value = withSpring(target, { duration: 180 });
            }
          }
        );
      });
  }, [enabled, maxX]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -x.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ overflow: "hidden" }}>
        <Animated.View style={[{ width: TIMELINE_W, flexDirection: "row" }, style]}>
          {Array.from({ length: HOURS }).map((_, i) => {
            const hour = timeFormat === '12h' ? (currentHour + i) % 12 : (currentHour + i) % 24;
            const ampm = ((currentHour + i) % 24 <= 12) ? 'am' : 'pm';

            return (
              <View
                key={i}
                style={styles.hourBox}
              >
                <View style={styles.hourBlock}>
                  {timeFormat === '12h' ? (
                    <>
                      <Text style={styles.hourBlockHour}>{(hour === 0 ? 12 : hour)}</Text>
                      <Text style={styles.hourBlockAmPM}>{ampm}</Text>
                    </>
                  ) : (
                    <Text style={styles.hourBlockHour}>{hour}</Text>
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

export default function Calendar() {
  const { selectedCities, reorderCities, removeCity } = useSelectedCities();
  const { timeFormat } = useSettings();
  const { isEditMode } = useEditMode();

  const { width } = useWindowDimensions();
  const maxX = Math.max(0, TIMELINE_W - width);

  const [cities, setCities] = useState(selectedCities);
  const [dragging, setDragging] = useState(false);

  const initialScrollValue = TIMELINE_W / 2 - width / 2;

  const x = useSharedValue(initialScrollValue);
  x.value = clamp(x.value, 0, maxX);

  const renderItem = ({ item: city, drag, isActive }: RenderItemParams<SelectedCity>) => {
    const timezoneOffset = getTimezoneOffsetHours(city.tz);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: city.tz,
      hour: 'numeric',
      hour12: false,
    });

    const now = new Date();
    const shiftedTime = new Date(now.getTime());

    const currentHour = parseInt(formatter.format(shiftedTime), 10);

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
          maxX={maxX}
          enabled={!dragging}
          currentHour={currentHour}
          timeFormat={timeFormat}
          width={width}
        />
      </View>
    )
  };

  return (
    <GestureHandlerRootView>
      <View style={{
        ...styles.middleMarker,
        left: width / 2 - CELL_W / 2
      }} />
      <DraggableFlatList
        data={cities}
        keyExtractor={(c) => `${c.id}`}
        renderItem={renderItem}
        onDragBegin={() => setDragging(true)}
        onDragEnd={({ data }) => {
          setCities(data);
          setDragging(false);
        }}
        activationDistance={12}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  middleMarker: {
    position: 'absolute',
    top: 0,
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
  hourBlockAmPM: {
    fontSize: 14,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 1)',
    top: -3
  },
})

/*
export function Calendar2() {
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
          keyExtractor={(item) => `calendar-city-${item.id}`}
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
