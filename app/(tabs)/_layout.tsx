import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Pressable } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import IconPlusOutlined from '@/assets/images/icon--plus-1--outlined.svg';
import IconPlusFilled from '@/assets/images/icon--plus-1--filled.svg';

import IconSettingsOutlined from '@/assets/images/icon--settings-1--outlined.svg';
import IconSettingsFilled from '@/assets/images/icon--settings-1--filled.svg';

import IconClockOutlined from '@/assets/images/icon--clock-1--outlined.svg';
import IconClockFilled from '@/assets/images/icon--clock-1--filled.svg';

import IconTimelineOutlined from '@/assets/images/icon--calendar-1--outlined.svg';
import IconTimelineFilled from '@/assets/images/icon--calendar-1--filled.svg';

import IconNotificationOutlined from '@/assets/images/icon--notification-1--outlined.svg';
import IconNotificationFilled from '@/assets/images/icon--notification-1--filled.svg';

import IconEditOutlined from '@/assets/images/icon--edit-1--outlined.svg';
import IconEditFilled from '@/assets/images/icon--edit-1--filled.svg';
import IconCheckmarkFilled from '@/assets/images/icon--checkmark-1--filled.svg';

import { useEditMode } from '@/contexts/edit-mode-context';

function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isEditMode, toggleEditMode } = useEditMode();

  const isOnEditablePage = pathname === '/' || pathname === '/index' || pathname === '/notifications' || pathname === '/timeline';

  return (
    <View style={{
      ...styles.headerButtonsContainer,
      paddingTop: insets.top + 15,
    }}>
      <Pressable
        onPress={isOnEditablePage ? toggleEditMode : undefined}
        style={[styles.headerButton, !isOnEditablePage && styles.headerButtonDisabled]}
      >
        {isEditMode ? (
          <IconCheckmarkFilled
            style={styles.headerButtonIcon}
            fill="white"
          />
        ) : (
          <IconEditOutlined
            style={styles.headerButtonIcon}
            fill="white"
          />
        )}
      </Pressable>
      <Pressable
        onPress={!isEditMode ? () => router.push('/add-city') : undefined}
        disabled={isEditMode}
        style={[styles.headerButton, isEditMode && styles.headerButtonDisabled]}
      >
        {pathname === '/add-city' ? (
          <IconPlusFilled
            style={styles.headerButtonIcon}
            fill="white"
          />
        ) : (
          <IconPlusOutlined
            style={styles.headerButtonIcon}
            fill="white"
          />
        )}
      </Pressable>
      <Pressable
        onPress={!isEditMode ? () => router.push('/settings') : undefined}
        disabled={isEditMode}
        style={[styles.headerButton, isEditMode && styles.headerButtonDisabled]}
      >
        {pathname === '/settings' ? (
          <IconSettingsFilled
            style={styles.headerButtonIcon}
            fill="white"
          />
        ) : (
          <IconSettingsOutlined
            style={styles.headerButtonIcon}
            fill="white"
          />
        )}
      </Pressable>
    </View>
  );
}

function CustomTabBar(props: BottomTabBarProps) {
  const pathname = usePathname();

  const { isEditMode } = useEditMode();

  const isCitiesListScreen = pathname === '/' || pathname === '/index';

  return (
    <View style={[styles.bottomBarContainer, isCitiesListScreen && styles.bottomBarContainerCitiesList]}>
      <View
        style={isEditMode ? styles.tabBarDisabled : undefined}
        pointerEvents={isEditMode ? 'none' : 'auto'}
      >
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: true,
        header: () => <HeaderButtons />,
        headerStyle: {
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTransparent: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBarStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {focused ? (
                <IconClockFilled
                  style={styles.icon}
                  fill="white"
                />
              ) : (
                <IconClockOutlined
                  style={styles.icon}
                  fill="white"
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add-city"
        options={{
          title: '',
          href: null,
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {focused ? (
                <IconTimelineFilled style={styles.icon} fill="white" />
              ) : (
                <IconTimelineOutlined style={styles.icon} fill="white" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {focused ? (
                <IconNotificationFilled style={styles.icon} fill="white" />
              ) : (
                <IconNotificationOutlined style={styles.icon} fill="white" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '',
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-city"
        options={{
          title: '',
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bottomBarContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    paddingTop: 40,
  },
  bottomBarContainerCitiesList: {
    paddingTop: 18,
    borderTopWidth: 0,
  },
  tabBarStyle: {
    backgroundColor: 'rgba(62, 63, 86, 0)',
    borderTopColor: 'rgba(255, 255, 255, 0)',
    paddingHorizontal: 16,
  },
  tabBarDisabled: {
    opacity: 0.5,
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(62, 63, 86, 0)',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 32
  },
  headerButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonIcon: {
    width: 30,
    height: 30,
  },
  headerButtonActive: {
    borderColor: 'white',
  },
  iconBox: {
    width: 40,
    height: 40,
  },
  icon: {
    width: 40,
    height: 40
  }
});
