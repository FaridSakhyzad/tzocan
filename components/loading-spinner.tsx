import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import LoadingIcon from '@/assets/images/loading.svg';
import { useAppTheme } from '@/contexts/app-theme-context';

const LOADING_SPINNER_DURATION_MS = 2000;

type LoadingSpinnerProps = {
  size?: number;
};

export function LoadingSpinner({ size = 60 }: LoadingSpinnerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: LOADING_SPINNER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={animatedStyle}>
        <LoadingIcon
          width={size}
          height={size}
          fill={theme.text.primary}
        />
      </Animated.View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
