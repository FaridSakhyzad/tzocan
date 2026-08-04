import React from 'react';
import { useRouter } from 'expo-router';

import { SUPPORT_FEATURE_ENABLED } from '@/constants/app-config';
import { MainMenuModal } from '@/components/main-menu-modal';
import { useEditMode } from '@/contexts/edit-mode-context';
import { useSupportModal } from '@/contexts/support-modal-context';
import { RouteNamePaths } from '@/types/router';
import { useMainLayoutAddFlows } from '@/features/MainLayout/use-main-layout-add-flows';

type MainMenuLauncherProps = {
  visible: boolean;
  onClose: () => void;
};

export default function MainMenuLauncher({ visible, onClose }: MainMenuLauncherProps) {
  const router = useRouter();
  const { isEditMode } = useEditMode();
  const { openSupportModal, canPurchaseAnySupportProduct } = useSupportModal();
  const [shouldForceUnmountMainMenu, setShouldForceUnmountMainMenu] = React.useState(false);

  React.useEffect(() => {
    if (visible) {
      setShouldForceUnmountMainMenu(false);
    }
  }, [visible]);

  const forceCloseMainMenu = () => {
    setShouldForceUnmountMainMenu(true);
    onClose();
  };
  const {
    canAddReminder,
    openAddCityModal,
    openAddReminderModal,
    addFlowModals,
  } = useMainLayoutAddFlows({
    onBeforeOpenAddCity: forceCloseMainMenu,
    onBeforeOpenAddReminder: forceCloseMainMenu,
  });

  const handleOpenSupportModal = () => {
    if (isEditMode || !SUPPORT_FEATURE_ENABLED || !canPurchaseAnySupportProduct) {
      return;
    }

    forceCloseMainMenu();
    openSupportModal();
  };

  const handleOpenContactScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.contact);
  };

  const handleOpenSettingsScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.settings);
  };

  const handleOpenAboutScreen = () => {
    if (isEditMode) {
      return;
    }

    forceCloseMainMenu();
    router.replace(RouteNamePaths.about);
  };

  return (
    <>
      {addFlowModals}

      {!shouldForceUnmountMainMenu && (
        <MainMenuModal
          visible={visible}
          onClose={onClose}
          onAddNotification={openAddReminderModal}
          onAddCity={openAddCityModal}
          onSupport={handleOpenSupportModal}
          onContact={handleOpenContactScreen}
          onSettings={handleOpenSettingsScreen}
          onAbout={handleOpenAboutScreen}
          canAddNotification={canAddReminder}
          canShowSupport={canPurchaseAnySupportProduct}
        />
      )}
    </>
  );
}
