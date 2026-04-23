import React from 'react';
import { Tabs, usePathname, useGlobalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, View, Pressable } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import type { UiTheme } from '@/constants/ui-theme.types';

import IconAddLocationOutlined from '@/assets/images/icon--add-location-1--outlined.svg';
import IconAddLocationFilled from '@/assets/images/icon--add-location-1--filled.svg';

import IconMainMenuOutlined from '@/assets/images/icon--menu-1--outlined.svg';
import IconMainMenuFilled from '@/assets/images/icon--menu-1--filled.svg';

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

import IconMiscMenuOutlined from '@/assets/images/icon--menu-2--outlined.svg';
import IconMiscMenuFilled from '@/assets/images/icon--menu-2--filled.svg';

import { AddCityModal, type CityRow } from '@/components/add-city-modal';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { NotificationModal, type NotificationFormValues } from '@/components/notification-modal';
import { MainMenuModal } from '@/components/main-menu-modal';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useNotificationsSort } from '@/contexts/notifications-sort-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import IconDelete1 from '@/assets/images/icon--delete-2--outlined.svg';

function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { openSortPicker, isSortPickerVisible } = useNotificationsSort();
  const { selectedCities, addCity, addNotification, removeCity } = useSelectedCities();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [isAddCityModalVisible, setIsAddCityModalVisible] = React.useState(false);
  const [isAddNotificationModalVisible, setIsAddNotificationModalVisible] = React.useState(false);
  const [selectedNotificationCityId, setSelectedNotificationCityId] = React.useState<number | null>(null);
  const [isMainMenuModalVisible, setIsMainMenuModalVisible] = React.useState(false);
  const [isDeleteCityModalVisible, setIsDeleteCityModalVisible] = React.useState(false);
  const lastActiveTabPathRef = React.useRef<'/' | '/timeline' | '/notifications'>('/');
  const isEditCityScreen = pathname === '/edit-city';
  const isContactScreen = pathname === '/contact';
  const isSettingsScreen = pathname === '/settings';
  const isAboutScreen = pathname === '/about';
  const isNotificationsScreen = pathname === '/notifications';
  const isIndexScreen = pathname === '/' || pathname === '/index';
  const isTimelineScreen = pathname === '/timeline';
  const isSortScreen = isIndexScreen || isTimelineScreen || isNotificationsScreen;
  const isDetailScreen = isEditCityScreen || isContactScreen || isSettingsScreen || isAboutScreen;

  const currentEditCityId = isEditCityScreen && globalParams.cityId ? Number(globalParams.cityId) : null;
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
      lastActiveTabPathRef.current = pathname === '/index' ? '/' : pathname;
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

  const handleOpenMainMenuModal = () => {
    if (isEditMode) {
      return;
    }

    setIsMainMenuModalVisible(true);
  };

  const handleCloseMainMenuModal = () => {
    setIsMainMenuModalVisible(false);
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

  const handleOpenContactScreen = () => {
    if (isEditMode) {
      return;
    }

    router.replace('/contact');
  };

  const handleOpenSettingsScreen = () => {
    if (isEditMode) {
      return;
    }

    router.replace('/settings');
  };

  const handleOpenAboutScreen = () => {
    if (isEditMode) {
      return;
    }

    router.replace('/about');
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
        {isEditCityScreen && (
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
                fill={theme.text.primary}
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
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
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
                fill={theme.text.warning}
              />
            </Pressable>
          </>
        )}

        {(isContactScreen || isSettingsScreen || isAboutScreen) && (
          <>
            <Pressable
              onPress={handleBackFromEditCity}
              style={[
                styles.headerButton,
                styles.headerButtonBack,
              ]}
            >
              <IconBack
                style={styles.headerButtonIcon}
                fill={theme.text.primary}
              />
            </Pressable>

            {(isContactScreen || isSettingsScreen || isAboutScreen) && (
              <Pressable
                onPress={handleOpenMainMenuModal}
                disabled={isEditMode}
                style={[
                  styles.headerButton,
                  isEditMode && styles.headerButtonDisabled,
                  styles.headerButtonSettings,
                ]}
              >
                {isMainMenuModalVisible ? (
                  <IconMainMenuFilled
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                ) : (
                  <IconMainMenuOutlined
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                )}
              </Pressable>
            )}
          </>
        )}

        {!isDetailScreen && (
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
                  fill={theme.text.primary}
                />
              ) : (
                <IconEditOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            {isSortScreen && (
              <Pressable
                onPress={openSortPicker}
                disabled={isEditMode}
                style={[
                  styles.headerButton,
                  styles.headerButtonSort,
                  isEditMode && styles.headerButtonDisabled,
                ]}
              >
                {isSortPickerVisible ? (
                  <IconMiscMenuFilled
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                ) : (
                  <IconMiscMenuOutlined
                    style={styles.headerButtonIcon}
                    fill={theme.text.primary}
                  />
                )}
              </Pressable>
            )}

            <Pressable
              onPress={handleOpenAddCityModal}
              disabled={isEditMode}
              style={[styles.headerButton, isEditMode && styles.headerButtonDisabled]}
            >
              {isAddCityModalVisible ? (
                <IconAddLocationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddLocationOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
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
                  fill={theme.text.primary}
                />
              ) : (
                <IconAddNotificationFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              )}
            </Pressable>

            <Pressable
              onPress={handleOpenMainMenuModal}
              disabled={isEditMode}
              style={[
                styles.headerButton,
                isEditMode && styles.headerButtonDisabled,
                styles.headerButtonSettings,
              ]}
            >
              {isMainMenuModalVisible ? (
                <IconMainMenuFilled
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
                />
              ) : (
                <IconMainMenuOutlined
                  style={styles.headerButtonIcon}
                  fill={theme.text.primary}
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

      <MainMenuModal
        visible={isMainMenuModalVisible}
        onClose={handleCloseMainMenuModal}
        onAddNotification={handleOpenAddNotificationModal}
        onAddCity={handleOpenAddCityModal}
        onContact={handleOpenContactScreen}
        onSettings={handleOpenSettingsScreen}
        onAbout={handleOpenAboutScreen}
        canAddNotification={selectedCities.length > 0}
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
  const { theme } = useAppTheme();
  const { isEditMode } = useEditMode();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: theme.navigation.colors.primary,
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
                  fill={theme.text.primary}
                />
              ) : (
                <IconClockOutlined
                  style={styles.icon}
                  fill={theme.text.primary}
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
                <IconTimelineFilled style={styles.icon} fill={theme.text.primary} />
              ) : (
                <IconTimelineOutlined style={styles.icon} fill={theme.text.primary} />
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
                <IconNotificationFilled style={styles.icon} fill={theme.text.primary} />
              ) : (
                <IconNotificationOutlined style={styles.icon} fill={theme.text.primary} />
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
      <Tabs.Screen
        name="contact"
        options={{
          title: '',
          href: null,
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
        name="about"
        options={{
          title: '',
          href: null,
        }}
      />
    </Tabs>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    bottomBarContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.border.faint,
      paddingTop: 40,
    },
    bottomBarContainerCitiesList: {
      paddingTop: 18,
      borderTopWidth: 0,
    },
    tabBarStyle: {
      backgroundColor: theme.surface.transparent,
      borderTopColor: theme.border.transparent,
      paddingHorizontal: 16,
    },
    tabBarDisabled: {
      opacity: 0.5,
    },
    headerButtonsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: theme.surface.transparent,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.faint,
      paddingHorizontal: theme.spacing.screenX,
    },
    headerButton: {
      width: 30,
      height: 30,
      borderWidth: 1,
      borderColor: theme.border.transparent,
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
    headerButtonSort: {
      width: 'auto',
      minWidth: 44,
      paddingHorizontal: 8,
      marginHorizontal: 8,
    },
    headerButtonSortText: {
      color: theme.text.primary,
      fontSize: 15,
      fontWeight: '600',
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
      borderColor: theme.border.field,
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
}
