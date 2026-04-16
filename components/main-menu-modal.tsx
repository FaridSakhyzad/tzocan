import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useMemo } from 'react';

import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';

import CloseButton from '../assets/images/icon--x-3--outlined.svg';

type MainMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddNotification: () => void;
  onAddCity: () => void;
  onContact: () => void;
  onSettings: () => void;
  onAbout: () => void;
  canAddNotification?: boolean;
};

export function MainMenuModal({
  visible,
  onClose,
  onAddNotification,
  onAddCity,
  onContact,
  onSettings,
  onAbout,
  canAddNotification = true,
}: MainMenuModalProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleAddNotification = () => {
    onClose();
    onAddNotification();
  };

  const handleAddCity = () => {
    onClose();
    onAddCity();
  };

  const handleOpenContact = () => {
    onClose();
    onContact();
  };

  const handleOpenSettings = () => {
    onClose();
    onSettings();
  };

  const handleOpenAbout = () => {
    onClose();
    onAbout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      style={styles.mainMenuModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalTop}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <CloseButton fill={theme.text.primary} />
          </Pressable>
        </View>
        <ImageBackground
          source={theme.image.modalBackgroundSource}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
          resizeMode="cover"
        >
          <View style={styles.modalContent}>
            <View style={styles.menuCard}>
              <Pressable
                style={[styles.menuButton, !canAddNotification && styles.menuButtonDisabled]}
                onPress={handleAddNotification}
                disabled={!canAddNotification}
              >
                <Text style={styles.menuButtonText}>Add Notification</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleAddCity}>
                <Text style={styles.menuButtonText}>Add City</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenSettings}>
                <Text style={styles.menuButtonText}>Settings</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenContact}>
                <Text style={styles.menuButtonText}>Contact</Text>
              </Pressable>

              <Pressable style={styles.menuButton} onPress={handleOpenAbout}>
                <Text style={styles.menuButtonText}>About</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
        <View style={styles.modalTop} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    mainMenuModal: {},
    modalContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-evenly',
      backgroundColor: theme.overlay.strong,
      padding: theme.spacing.modalX,
    },
    modalTop: {
      flex: 1,
    },
    modalBottom: {
      flex: 1,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      margin: 'auto',
    },
    backgroundImage: {
      display: 'flex',
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
    },
    backgroundImageAsset: {
      transform: [{ scale: theme.image.modalBackgroundScale }],
    },
    modalContent: {
      backgroundColor: theme.surface.transparent,
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.modalInnerY,
      paddingHorizontal: theme.spacing.modalInnerX,
      gap: theme.spacing.sectionGap,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    menuCard: {
      flexDirection: 'column',
      gap: 10,
    },
    menuButton: {
      height: 40,
      justifyContent: 'center',
    },
    menuButtonDisabled: {
      opacity: 0.5,
    },
    menuButtonText: {
      fontSize: theme.typography.titleLg.fontSize,
      color: theme.text.primary,
    },
  });
}
