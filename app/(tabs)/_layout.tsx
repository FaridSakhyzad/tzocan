import React from 'react';
import { Tabs, usePathname, useGlobalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Pressable } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import IconAddLocationOutlined from '@/assets/images/icon--add-location-1--outlined.svg';
import IconAddLocationFilled from '@/assets/images/icon--add-location-1--filled.svg';

import IconSettingsOutlined from '@/assets/images/icon--settings-1--outlined.svg';
import IconSettingsFilled from '@/assets/images/icon--settings-1--filled.svg';

import IconClockOutlined from '@/assets/images/icon--clock-1--outlined.svg';
import IconClockFilled from '@/assets/images/icon--clock-1--filled.svg';

import IconTimelineOutlined from '@/assets/images/icon--timeline-1--outlined.svg';
import IconTimelineFilled from '@/assets/images/icon--timeline-1--filled.svg';

import IconNotificationOutlined from '@/assets/images/icon--notification-1--outlined.svg';
import IconNotificationFilled from '@/assets/images/icon--notification-1--filled.svg';

import IconAddNotificationFilled from '@/assets/images/icon--add-notification-1--filled.svg';
import IconAddNotificationOutlined from '@/assets/images/icon--add-notification-1--outlined.svg';

import IconEditOutlined from '@/assets/images/icon--edit-1--outlined.svg';
import IconCheckmarkFilled from '@/assets/images/icon--checkmark-1--filled.svg';

import IconBack from '@/assets/images/icon--arrow-2--outlined.svg';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { NotificationModal, type NotificationFormValues } from '@/components/notification-modal';
import { SettingsModal } from '@/components/settings-modal';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import IconDelete1 from '@/assets/images/icon--delete-2--outlined.svg';

function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const insets = useSafeAreaInsets();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { selectedCities, addCity, addNotification, removeCity } = useSelectedCities();
  const [isAddCityModalVisible, setIsAddCityModalVisible] = React.useState(false);
  const [isAddNotificationModalVisible, setIsAddNotificationModalVisible] = React.useState(false);
  const [selectedNotificationCityId, setSelectedNotificationCityId] = React.useState<number | null>(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = React.useState(false);
  const [isDeleteCityModalVisible, setIsDeleteCityModalVisible] = React.useState(false);
  const lastActiveTabPathRef = React.useRef<'/' | '/index' | '/timeline' | '/notifications'>('/index');

  const currentEditCityId = pathname === '/edit-city' && globalParams.cityId ? Number(globalParams.cityId) : null;
  const currentEditCity = React.useMemo(
    () => currentEditCityId ? selectedCities.find((city) => city.id === currentEditCityId) || null : null,
    [currentEditCityId, selectedCities]
  );
  const notificationCityOptions = React.useMemo(
    () => selectedCities.map((city) => ({
      id: city.id,
      label: city.customName || city.name,
      hint: city.tz,
      timezone: city.tz,
    })),
    [selectedCities]
  );
  const selectedNotificationCity = React.useMemo(
    () => selectedCities.find((city) => city.id === selectedNotificationCityId) || null,
    [selectedCities, selectedNotificationCityId]
  );

  React.useEffect(() => {
    if (pathname === '/' || pathname === '/index' || pathname === '/timeline' || pathname === '/notifications') {
      lastActiveTabPathRef.current = pathname;
    }
  }, [pathname]);

  const handleOpenAddCityModal = () => {
    if (isEditMode) {
      return;
    }

    setIsAddCityModalVisible(true);
  };

  const handleCloseAddCityModal = () => {
    setIsAddCityModalVisible(false);
  };

  const handleSaveCity = (city: CityRow) => {
    addCity(city);
    setIsAddCityModalVisible(false);
  };

  const handleOpenSettingsModal = () => {
    if (isEditMode) {
      return;
    }

    setIsSettingsModalVisible(true);
  };

  const handleCloseSettingsModal = () => {
    setIsSettingsModalVisible(false);
  };

  const handleOpenDeleteCityModal = () => {
    if (pathname !== '/edit-city' || !currentEditCity) {
      return;
    }

    setIsDeleteCityModalVisible(true);
  };

  const handleCloseDeleteCityModal = () => {
    setIsDeleteCityModalVisible(false);
  };

  const handleConfirmDeleteCity = () => {
    if (!currentEditCity) {
      return;
    }

    removeCity(currentEditCity.id);
    setIsDeleteCityModalVisible(false);
    router.navigate('/');
  };

  const handleBackFromEditCity = () => {
    router.navigate(lastActiveTabPathRef.current);
  };

  const handleOpenAddNotificationModal = () => {
    if (isEditMode || selectedCities.length === 0) {
      return;
    }

    const currentCityId = pathname === '/edit-city' && globalParams.cityId
      ? Number(globalParams.cityId)
      : null;
    const defaultCityId =
      currentCityId && selectedCities.some((city) => city.id === currentCityId)
        ? currentCityId
        : null;

    setSelectedNotificationCityId(defaultCityId);
    setIsAddNotificationModalVisible(true);
  };

  const handleCloseAddNotificationModal = () => {
    setIsAddNotificationModalVisible(false);
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (!selectedNotificationCityId) {
      return false;
    }

    const didSave = await addNotification(
      selectedNotificationCityId,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.label,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );

    if (didSave) {
      setIsAddNotificationModalVisible(false);
    }

    return didSave;
  };

  return (
    <>
      <View style={{
        ...styles.headerButtonsContainer,
        paddingTop: insets.top + 15,
      }}>
        {pathname === '/edit-city' && (
          <>
            <Pressable
              onPress={handleBackFromEditCity}
              disabled={isEditMode || selectedCities.length === 0}
              style={[
                styles.headerButton,
                styles.headerButtonBack,
              ]}
            >
              <IconBack
                style={styles.headerButtonIcon}
                fill="#fff"
              />
            </Pressable>

            <Pressable
              onPress={handleOpenAddNotificationModal}
              disabled={isEditMode || selectedCities.length === 0}
              style={[styles.headerButton, (isEditMode || selectedCities.length === 0) && styles.headerButtonDisabled]}
            >
              {isAddNotificationModalVisible ? (
                <IconAddNotificationOutlined
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenDeleteCityModal}
              style={[
                styles.headerButton,
                styles.headerButtonDelete,
              ]}
            >
              <IconDelete1
                style={styles.headerButtonIcon}
                fill="rgba(255, 255, 204, 1)"
              />
            </Pressable>
          </>
        )}

        {pathname !== '/edit-city' && (
          <>
            <Pressable
              onPress={toggleEditMode}
              style={[
                styles.headerButton,
                styles.headerButtonEditCitiesList,
              ]}
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
              onPress={handleOpenAddCityModal}
              disabled={isEditMode}
              style={[styles.headerButton, isEditMode && styles.headerButtonDisabled]}
            >
              {isAddCityModalVisible ? (
                <IconAddLocationFilled
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              ) : (
                <IconAddLocationOutlined
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenAddNotificationModal}
              disabled={isEditMode || selectedCities.length === 0}
              style={[styles.headerButton, (isEditMode || selectedCities.length === 0) && styles.headerButtonDisabled]}
            >
              {isAddNotificationModalVisible ? (
                <IconAddNotificationOutlined
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill="white"
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenSettingsModal}
              disabled={isEditMode}
              style={[
                styles.headerButton,
                isEditMode && styles.headerButtonDisabled,
                styles.headerButtonSettings,
              ]}
            >
              {isSettingsModalVisible ? (
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
          </>
        )}
      </View>

      <AddCityModal
        visible={isAddCityModalVisible}
        onClose={handleCloseAddCityModal}
        onSave={handleSaveCity}
      />

      <NotificationModal
        visible={isAddNotificationModalVisible}
        cityName={selectedNotificationCity ? (selectedNotificationCity.customName || selectedNotificationCity.name) : ''}
        mode="add"
        citySelectionMode={pathname === '/edit-city' ? 'locked' : 'selectable'}
        cityOptions={notificationCityOptions}
        selectedCityId={selectedNotificationCityId}
        onSelectCityId={setSelectedNotificationCityId}
        initialNotification={null}
        onClose={handleCloseAddNotificationModal}
        onSave={handleSaveNotification}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={handleCloseSettingsModal}
      />

      <DeleteCityModal
        visible={isDeleteCityModalVisible}
        cityName={currentEditCity?.customName || currentEditCity?.name || 'this city'}
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />
    </>
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
  const pathname = usePathname();

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
          freezeOnBlur: true,
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.iconBox}>
              {(focused || pathname === '/edit-city') ? (
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
        name="timeline"
        options={{
          title: '',
          freezeOnBlur: true,
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
          freezeOnBlur: true,
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
    paddingHorizontal: 20
  },
  headerButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  headerButtonEditCitiesList: {
    marginLeft: 0,
    marginRight: 'auto'
  },
  headerButtonSettings: {
    marginLeft: 'auto',
    marginRight: 0
  },
  headerButtonDelete: {
    marginLeft: 'auto',
    marginRight: 0
  },
  headerButtonBack: {
    marginLeft: 0,
    marginRight: 'auto'
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
