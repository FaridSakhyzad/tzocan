import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useNotificationsSort } from '@/contexts/notifications-sort-context';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import { useLocalizedCityNames } from '@/hooks/use-localized-city-names';
import React, { useEffect } from 'react';
import { createStyles } from '@/features/MainLayout/HeaderButtons.styles';
import { RouteNamePaths } from '@/types/router';
import { getCityDisplayName } from '@/utils/city-display';
import { Pressable, View } from 'react-native';
import IconBack from '@/assets/images/icon--arrow-2--outlined.svg';
import IconAddNotificationOutlined from '@/assets/images/icon--add-notification-1--outlined.svg';
import IconAddNotificationFilled from '@/assets/images/icon--add-notification-1--filled.svg';
import IconDelete1 from '@/assets/images/icon--delete-2--outlined.svg';
import IconCheckmarkFilled from '@/assets/images/icon--checkmark-1--filled.svg';
import IconEditOutlined from '@/assets/images/icon--edit-1--outlined.svg';
import IconMiscMenuFilled from '@/assets/images/icon--menu-2--filled.svg';
import IconMiscMenuOutlined from '@/assets/images/icon--menu-2--outlined.svg';
import IconAddLocationFilled from '@/assets/images/icon--add-location-1--filled.svg';
import IconAddLocationOutlined from '@/assets/images/icon--add-location-1--outlined.svg';
import { DeleteCityModal } from '@/components/delete-city-modal';
import { useMainLayoutAddFlows } from '@/features/MainLayout/use-main-layout-add-flows';

export default function HeaderButtons() {
  const router = useRouter();
  const pathname = usePathname();
  const globalParams = useGlobalSearchParams<{ cityId?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { isEditMode, toggleEditMode } = useEditMode();
  const { openSortPicker, isSortPickerVisible } = useNotificationsSort();
  const { selectedCities, removeCity } = useSelectedCities();
  const localizedCityNames = useLocalizedCityNames(selectedCities.map((city) => city.cityId));

  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const [isDeleteCityModalVisible, setIsDeleteCityModalVisible] = React.useState(false);
  const {
    canAddReminder,
    isAddCityModalVisible,
    isAddReminderModalVisible,
    openAddCityModal,
    openAddReminderModal,
    addFlowModals,
  } = useMainLayoutAddFlows();

  const lastActiveTabPathRef = React.useRef<
    RouteNamePaths.root | RouteNamePaths.timeline | RouteNamePaths.timelineInfinite | RouteNamePaths.notifications
  >(RouteNamePaths.root);

  const isEditCityScreen = pathname === RouteNamePaths.editCity;
  const isContactScreen = pathname === RouteNamePaths.contact;
  const isSettingsScreen = pathname === RouteNamePaths.settings;
  const isAboutScreen = pathname === RouteNamePaths.about;
  const isDiagnosticsScreen = pathname === RouteNamePaths.diagnostics;
  const isNotificationsScreen = pathname === RouteNamePaths.notifications;
  const isIndexScreen = pathname === RouteNamePaths.root || pathname === RouteNamePaths.cities;
  const isTimelineScreen = pathname === RouteNamePaths.timeline;
  const isInfiniteTimelineScreen = pathname === RouteNamePaths.timelineInfinite;

  const isSortScreen = isIndexScreen || isTimelineScreen || isInfiniteTimelineScreen || isNotificationsScreen;
  const isDetailScreen = isEditCityScreen || isContactScreen || isSettingsScreen || isAboutScreen || isDiagnosticsScreen;

  const currentEditCityId = isEditCityScreen && globalParams.cityId ? Number(globalParams.cityId) : null;

  const currentEditCity = React.useMemo(
    () => currentEditCityId ? selectedCities.find((city) => city.id === currentEditCityId) || null : null,
    [currentEditCityId, selectedCities]
  );

  const totalNotifications = React.useMemo(
    () => selectedCities.reduce((count, city) => count + (city.notifications?.length || 0), 0),
    [selectedCities]
  );
  const hasAnyAppData = selectedCities.length > 0 || totalNotifications > 0;

  const hasEditableItems = React.useMemo(() => {
    if (isNotificationsScreen) {
      return totalNotifications > 0;
    }

    if (isIndexScreen || isTimelineScreen || isInfiniteTimelineScreen) {
      return selectedCities.length > 0;
    }

    return true;
  }, [isIndexScreen, isInfiniteTimelineScreen, isNotificationsScreen, isTimelineScreen, selectedCities.length, totalNotifications]);

  const isEditButtonDisabled = !isEditMode && !hasEditableItems;

  useEffect(() => {
    if (
      pathname === RouteNamePaths.root ||
      pathname === RouteNamePaths.cities ||
      pathname === RouteNamePaths.timeline ||
      pathname === RouteNamePaths.timelineInfinite ||
      pathname === RouteNamePaths.notifications
    ) {
      lastActiveTabPathRef.current = pathname === RouteNamePaths.cities ? RouteNamePaths.root : pathname;
    }
  }, [pathname]);

  const handleOpenDeleteCityModal = () => {
    if (pathname !== RouteNamePaths.editCity || !currentEditCity) {
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

    router.navigate(RouteNamePaths.root);
  };

  const handleBackFromEditCity = () => {
    if (pathname === RouteNamePaths.diagnostics) {
      router.navigate(RouteNamePaths.settings);
      return;
    }

    router.navigate(lastActiveTabPathRef.current);
  };

  return (
    <>
      <View style={{
        ...styles.headerButtonsContainer,
        paddingTop: insets.top + 5,
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
              onPress={openAddReminderModal}
              disabled={isEditMode || !canAddReminder}
              style={[styles.headerButton, (isEditMode || !canAddReminder) && styles.headerButtonDisabled]}
            >
              {isAddReminderModalVisible ? (
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
              onPress={openAddCityModal}
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

        {(isContactScreen || isSettingsScreen || isAboutScreen || isDiagnosticsScreen) && (
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
          </>
        )}

        {!isDetailScreen && (
          <>
            {hasAnyAppData && (
              <Pressable
                onPress={toggleEditMode}
                disabled={isEditButtonDisabled}
                style={[
                  styles.headerButton,
                  styles.headerButtonEditCitiesList,
                  isEditButtonDisabled && styles.headerButtonDisabled,
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
            )}

            <Pressable
              onPress={openAddReminderModal}
              disabled={isEditMode || !canAddReminder}
              style={[
                styles.headerButton,
                styles.headerButtonAddNotification,
                (isEditMode || !canAddReminder) && styles.headerButtonDisabled
              ]}
            >
              {isAddReminderModalVisible ? (
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
              onPress={openAddCityModal}
              disabled={isEditMode}
              style={[
                styles.headerButton,
                styles.headerButtonAddCity,
                isEditMode && styles.headerButtonDisabled
              ]}
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

            {isSortScreen && hasAnyAppData && (
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
          </>
        )}
      </View>
      {addFlowModals}
      <DeleteCityModal
        visible={isDeleteCityModalVisible}
        cityName={currentEditCity ? getCityDisplayName(currentEditCity, localizedCityNames[currentEditCity.cityId]) : 'this city'}
        onClose={handleCloseDeleteCityModal}
        onConfirm={handleConfirmDeleteCity}
      />
    </>
  );
}
