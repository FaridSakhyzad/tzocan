import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, StyleSheet, Text, TextInput } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { DatabaseProvider } from '@/hooks/use-database';
import { SelectedCitiesProvider } from '@/contexts/selected-cities-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { EditModeProvider } from '@/contexts/edit-mode-context';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const AppTheme = {
  dark: true,
  colors: {
    primary: Colors.light.tint,
    background: 'transparent',
    card: 'transparent',
    text: Colors.light.text,
    border: '#4a4b63',
    notification: Colors.light.tint,
  },
  fonts: {
    light: { fontFamily: 'Roboto', fontWeight: '300' as const },
    regular: { fontFamily: 'Roboto', fontWeight: '400' as const },
    medium: { fontFamily: 'Roboto', fontWeight: '500' as const },
    bold: { fontFamily: 'Roboto', fontWeight: '700' as const },
    heavy: { fontFamily: 'Roboto', fontWeight: '800' as const },
  },
};

const setDefaultFont = () => {
  const oldTextRender = (Text as any).render;

  (Text as any).render = function (...args: any[]) {
    const origin = oldTextRender.call(this, ...args);
    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily: 'Roboto' }, origin.props.style],
      },
    };
  };

  const oldTextInputRender = (TextInput as any).render;

  (TextInput as any).render = function (...args: any[]) {
    const origin = oldTextInputRender.call(this, ...args);

    return {
      ...origin,
      props: {
        ...origin.props,
        style: [{ fontFamily: 'Roboto' }, origin.props.style],
      },
    };
  };
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Roboto': require('@/assets/fonts/Roboto/Roboto-VariableFont_wdth,wght.ttf'),
    'Roboto-Italic': require('@/assets/fonts/Roboto/Roboto-Italic-VariableFont_wdth,wght.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      setDefaultFont();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ImageBackground
      source={require('@/assets/images/bg--main-1.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <DatabaseProvider>
        <SettingsProvider>
          <SelectedCitiesProvider>
            <EditModeProvider>
              <ThemeProvider value={AppTheme}>
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                </Stack>
                <StatusBar style="light" />
              </ThemeProvider>
            </EditModeProvider>
          </SelectedCitiesProvider>
        </SettingsProvider>
      </DatabaseProvider>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1
  },
});
