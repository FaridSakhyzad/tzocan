import { useRef, useCallback, useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TICK_WIDTH = 15;
const MINUTES_PER_TICK = 15;
const HOURS_RANGE = 24;
const TOTAL_MINUTES = HOURS_RANGE * 2 * 60;

const TOTAL_TICKS = TOTAL_MINUTES / MINUTES_PER_TICK;
const NUMBER_OF_DUMMIES = Math.ceil(SCREEN_WIDTH / TICK_WIDTH);
const RULER_WIDTH = TOTAL_TICKS * TICK_WIDTH + NUMBER_OF_DUMMIES * TICK_WIDTH;

type TimeRulerProps = {
  offsetMinutes: number;
  onOffsetChange: (minutes: number) => void;
};

const getScrollXForOffset = (minutes: number) => {
  return RULER_WIDTH / 2 - SCREEN_WIDTH / 2 + TICK_WIDTH / 2;
};

export function TimeRuler({ offsetMinutes, onOffsetChange }: TimeRulerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const isProgrammaticScroll = useRef(false);

  const [displayOffset, setDisplayOffset] = useState(offsetMinutes);
  const initialScrollX = getScrollXForOffset(offsetMinutes);

  const calculateOffsetFromScroll = (scrollX: number) => {
    return Math.round(scrollX + SCREEN_WIDTH / 2 - RULER_WIDTH / 2 - TICK_WIDTH / 2);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!isScrolling.current) {
       return;
    }

    const scrollX = event.nativeEvent.contentOffset.x;

    const newOffset = calculateOffsetFromScroll(scrollX);

    const leftThreshold = RULER_WIDTH / 2 - (NUMBER_OF_DUMMIES * TICK_WIDTH / 2);

    if (newOffset < 0 && Math.abs(newOffset) > leftThreshold) {
      return;
    }

    if (newOffset > TOTAL_MINUTES / 2) {
      return;
    }

    setDisplayOffset(newOffset);
  };

  const handleScrollBeginDrag = () => {
    isScrolling.current = true;
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;

      return;
    }

    const scrollX = event.nativeEvent.contentOffset.x;

    const newOffset = calculateOffsetFromScroll(scrollX);

    isScrolling.current = false;

    if (scrollX > (TOTAL_MINUTES)) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current?.scrollTo({ x: TOTAL_MINUTES + TICK_WIDTH / 2, animated: true });
      return;
    }

    if (scrollX < (TICK_WIDTH / 2)) {
      isProgrammaticScroll.current = true;
      scrollViewRef.current?.scrollTo({ x: TICK_WIDTH / 2, animated: true });
      return;
    }

    setDisplayOffset(newOffset);
    onOffsetChange(newOffset);
  };

  const handleResetPress = () => {
    isProgrammaticScroll.current = true;

    setDisplayOffset(0);
    onOffsetChange(0);

    const scrollX = getScrollXForOffset(0);
    scrollViewRef.current?.scrollTo({ x: scrollX, animated: true });
  }

  const getResetButtonStyle = ({ pressed }: { pressed: boolean }) => [
    styles.resetButton,
    pressed && styles.resetButtonPressed,
  ];

  const formatOffset = (minutes: number) => {
    if (minutes === 0) {
      return 'Now';
    }

    const sign = minutes > 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;

    if (mins === 0) {
      return `${sign}${hours}h`;
    }

    return `${sign}${hours}h ${mins}m`;
  };

  const renderTicks = () => {
    const ticks = [];

    const numberOfDummies = Math.ceil(SCREEN_WIDTH / 2 / TICK_WIDTH);

    for (let i = 0; i < numberOfDummies; i++) {
      ticks.push(<View key={`dummy1_${i}`} style={styles.tickDummy} />)
    }

    for (let i = 0; i <= TOTAL_TICKS; i++) {
      const minutesFromStart = i * MINUTES_PER_TICK;
      const minutesFromCenter = minutesFromStart - HOURS_RANGE * 60;
      const isHourMark = minutesFromCenter % 60 === 0;
      const isZeroMark = minutesFromCenter === 0;

      ticks.push(
        <View key={i} style={styles.tickContainer}>
          <View
            style={[
              styles.tick,
              isHourMark && styles.hourTick,
              isZeroMark && styles.zeroTick,
            ]}
          />
        </View>
      );
    }

    for (let i = 0; i < numberOfDummies; i++) {
      ticks.push(<View key={`dummy2_${i}`} style={styles.tickDummy} />)
    }

    return ticks;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={handleResetPress}
          style={getResetButtonStyle}
        >
          <Text style={styles.resetButtonText}>
            Reset
          </Text>
        </Pressable>
        <Text style={styles.value}>
          {formatOffset(displayOffset)}
        </Text>
      </View>

      <View style={styles.rulerContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
          contentOffset={{ x: initialScrollX, y: 0 }}
          decelerationRate="fast"
          disableIntervalMomentum
          alwaysBounceHorizontal={false}
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
        >
          {renderTicks()}
        </ScrollView>
        <View style={styles.centerIndicator} pointerEvents="none" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  resetButtonPressed: {
    backgroundColor: '#d0d0d0',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  rulerContainer: {
    height: 50,
    position: 'relative',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  tickDummy: {
    width: TICK_WIDTH,
    height: 50,
    backgroundColor: '#e0e0e0',
  },
  tickContainer: {
    width: TICK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: '#666',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000'
  },
  tick: {
    width: 3,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  hourTick: {
    height: 5,
    width: 5,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  zeroTick: {
    height: 32,
    backgroundColor: '#fff',
    width: 3,
    borderRadius: 5,
  },
  centerIndicator: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#fff',
  },
});
