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
import { AppThemeProvider, useAppTheme } from '@/contexts/app-theme-context';
import { EditModeProvider } from '@/contexts/edit-mode-context';
import { NotificationsSortProvider } from '@/contexts/notifications-sort-context';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

const setDefaultFont = () => {
  if ((globalThis as { __tzcDefaultFontPatched?: boolean }).__tzcDefaultFontPatched) {
    return;
  }

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

  (globalThis as { __tzcDefaultFontPatched?: boolean }).__tzcDefaultFontPatched = true;
};

function AppShell() {
  const { theme, navigationTheme, statusBarStyle } = useAppTheme();

  return (
    <ImageBackground
      source={theme.image.modalBackgroundSource}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false }}
          />
        </Stack>
        <StatusBar style={statusBarStyle} />
      </ThemeProvider>
    </ImageBackground>
  );
}

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
    <DatabaseProvider>
      <SettingsProvider>
        <AppThemeProvider>
          <SelectedCitiesProvider>
            <EditModeProvider>
              <NotificationsSortProvider>
                <AppShell />
              </NotificationsSortProvider>
            </EditModeProvider>
          </SelectedCitiesProvider>
        </AppThemeProvider>
      </SettingsProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1
  },
});
