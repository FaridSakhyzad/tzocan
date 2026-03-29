import { useRef, useMemo, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Pressable, Animated } from 'react-native';

import IconReset from '@/assets/images/icon--reset-1.svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TICK_WIDTH = 15;
const MINUTES_PER_TICK = 15;
const HOURS_RANGE = 24;
const TOTAL_MINUTES = HOURS_RANGE * 2 * 60;

const TOTAL_TICKS = TOTAL_MINUTES / MINUTES_PER_TICK;
const NUMBER_OF_DUMMIES = Math.ceil(SCREEN_WIDTH / TICK_WIDTH);
const RULER_WIDTH = TOTAL_TICKS * TICK_WIDTH + NUMBER_OF_DUMMIES * TICK_WIDTH;
const SNAP_TO_ZERO_THRESHOLD = 3;

type TimeFormat = '12h' | '24h';

type TimeRulerProps = {
  offsetMinutes: number;
  onOffsetChange: (minutes: number) => void;
  timeFormat: TimeFormat;
};

function getLocalTime(timeFormat: TimeFormat, offsetMinutes: number = 0): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const hours24 = shiftedTime.getHours();
  const minutes = shiftedTime.getMinutes();

  if (timeFormat === '24h') {
    return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatOffset(minutes: number): string {
  if (minutes === 0) return '00:00';

  const sign = minutes > 0 ? '+' : '-';
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  if (mins === 0) {
    return `${sign}${hours}h`;
  }

  return `${sign}${hours}:${mins.toString().padStart(2, '0')}`;
}

export type TimeRulerRef = {
  reset: () => void;
};

const getScrollXForOffset = (minutes: number) => {
  return RULER_WIDTH / 2 - SCREEN_WIDTH / 2 + TICK_WIDTH / 2 + minutes;
};

export const TimeRuler = forwardRef<TimeRulerRef, TimeRulerProps>(function TimeRuler({ offsetMinutes, onOffsetChange, timeFormat }, ref) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrolling = useRef(false);
  const isProgrammaticScroll = useRef(false);
  const displayOffsetRef = useRef(offsetMinutes);
  const initialScrollXRef = useRef(getScrollXForOffset(offsetMinutes));

  const [displayOffset, setDisplayOffset] = useState(offsetMinutes);
  const [, setTick] = useState(0);

  const leftSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : -30)).current;
  const rightSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : 30)).current;
  const topSlideAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 0 : -20)).current;
  const opacityAnim = useRef(new Animated.Value(offsetMinutes !== 0 ? 1 : 0)).current;

  useEffect(() => {
    const isVisible = displayOffset !== 0;

    Animated.parallel([
      Animated.timing(leftSlideAnim, {
        toValue: isVisible ? 0 : -30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rightSlideAnim, {
        toValue: isVisible ? 0 : 30,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(topSlideAnim, {
        toValue: isVisible ? 0 : -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: isVisible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [displayOffset !== 0]);

  useEffect(() => {
    if (isScrolling.current || isProgrammaticScroll.current) {
      return;
    }

    if (displayOffsetRef.current !== offsetMinutes) {
      displayOffsetRef.current = offsetMinutes;
      setDisplayOffset(offsetMinutes);
      scrollViewRef.current?.scrollTo({ x: getScrollXForOffset(offsetMinutes), animated: false });
    }
  }, [offsetMinutes]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => {
      handleResetPress();
    },
  }));

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

    if (displayOffsetRef.current !== newOffset) {
      displayOffsetRef.current = newOffset;
      setDisplayOffset(newOffset);
      onOffsetChange(newOffset);
    }
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

    if (Math.abs(newOffset) <= SNAP_TO_ZERO_THRESHOLD) {
      isProgrammaticScroll.current = true;
      displayOffsetRef.current = 0;
      setDisplayOffset(0);
      onOffsetChange(0);
      scrollViewRef.current?.scrollTo({ x: getScrollXForOffset(0), animated: true });
      return;
    }

    if (displayOffsetRef.current !== newOffset) {
      displayOffsetRef.current = newOffset;
      setDisplayOffset(newOffset);
    }
    onOffsetChange(newOffset);
  };

  const handleResetPress = () => {
    isProgrammaticScroll.current = true;

    displayOffsetRef.current = 0;
    setDisplayOffset(0);
    onOffsetChange(0);

    const scrollX = getScrollXForOffset(0);
    scrollViewRef.current?.scrollTo({ x: scrollX, animated: false });
  }

  const ticks = useMemo(() => {
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
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.resetButton,
          {
            opacity: opacityAnim,
            transform: [{ translateY: topSlideAnim }],
          },
        ]}
      >
        <Pressable onPress={handleResetPress} style={styles.resetButtonPressable}>
          <IconReset
            style={styles.resetButtonIcon}
            fill='rgba(62, 63, 86, 0.6)'
          />
        </Pressable>
      </Animated.View>
      <View style={styles.timeContainer}>
        <Animated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: leftSlideAnim }],
            },
          ]}
        >
          {getLocalTime(timeFormat, 0)}
        </Animated.Text>
        <Pressable onPress={handleResetPress}>
          <Text style={styles.localTimeText}>
            {getLocalTime(timeFormat, displayOffset)}
          </Text>
        </Pressable>
        <Animated.Text
          style={[
            styles.sideText,
            {
              opacity: opacityAnim,
              transform: [{ translateX: rightSlideAnim }],
            },
          ]}
        >
          {formatOffset(displayOffset)}
        </Animated.Text>
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
          scrollEventThrottle={4}
          contentContainerStyle={styles.scrollContent}
          contentOffset={{ x: initialScrollXRef.current, y: 0 }}
          decelerationRate={0}
          disableIntervalMomentum
          alwaysBounceHorizontal={false}
          alwaysBounceVertical={false}
          bounces={false}
          overScrollMode="never"
        >
          {ticks}
        </ScrollView>
        <View style={styles.centerIndicator} pointerEvents="none" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  resetButtonContainer: {
    alignSelf: 'flex-start',
    minWidth: 70,
    alignItems: 'center',
  },
  resetButton: {
    borderRadius: 10,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    position: 'absolute',
    top: -10,
    left: SCREEN_WIDTH / 2 - 10,
  },
  resetButtonPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonIcon: {
    width: 12,
    height: 12,
  },
  resetButtonText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 5,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(62, 63, 86, 0)',
  },
  localTimeContainer: {
    alignItems: 'center',
  },
  sideText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 70,
    textAlign: 'center',
    fontWeight: '300'
  },
  localTimeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    borderColor: 'red'
  },
  rulerContainer: {
    height: 45,
    position: 'relative',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
    backgroundColor: 'transparent',
  },
  tickDummy: {
    width: TICK_WIDTH,
    height: 45,
  },
  tickContainer: {
    width: TICK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    height: 45,
  },
  tick: {
    width: 3,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 3,
  },
  hourTick: {
    height: 5,
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 5,
  },
  zeroTick: {
    height: 13,
    backgroundColor: '#fff',
    width: 5,
    borderRadius: 5,
  },
  centerIndicator: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 3,
    top: 7,
    width: 1,
    height: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});
