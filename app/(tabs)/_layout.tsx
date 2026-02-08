import { Tabs } from 'expo-router';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AddCityModal } from '@/components/add-city-modal';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { TimeRuler } from '@/components/time-ruler';

function CustomTabBar(props: BottomTabBarProps) {
  const { timeOffsetMinutes, setTimeOffsetMinutes } = useSettings();

  return (
    <View>
      <TimeRuler
        offsetMinutes={timeOffsetMinutes}
        onOffsetChange={setTimeOffsetMinutes}
      />
      <BottomTabBar {...props} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const { addCity } = useSelectedCities();

  const handleAddCity = (city: Parameters<typeof addCity>[0]) => {
    addCity(city);
    setIsAddModalVisible(false);
  };

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: '',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="globe" color={color} />,
          }}
        />
        <Tabs.Screen
          name="add-city"
          options={{
            title: '',
            tabBarButton: () => (
              <Pressable
                style={styles.addButton}
                onPress={() => setIsAddModalVisible(true)}
              >
                <IconSymbol size={32} name="plus.circle.fill" color={Colors[colorScheme ?? 'light'].tint} />
              </Pressable>
            ),
          }}
        />
        {/*
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
            }}
          />
        */}
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>
      <AddCityModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onSelectCity={handleAddCity}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
});
