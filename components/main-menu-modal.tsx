import {
  Animated,
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
import { SUPPORT_FEATURE_ENABLED } from '@/constants/app-config';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';
import HeartIcon from '@/assets/images/icon--heart-1.svg';

type MainMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  onAddNotification: () => void;
  onAddCity: () => void;
  onSupport: () => void;
  onContact: () => void;
  onSettings: () => void;
  onAbout: () => void;
  canAddNotification?: boolean;
  canShowSupport?: boolean;
};

export function MainMenuModal({
  visible,
  onClose,
  onAddNotification,
  onAddCity,
  onSupport,
  onContact,
  onSettings,
  onAbout,
  canAddNotification = true,
  canShowSupport = true,
}: MainMenuModalProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);

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

  const handleOpenSupport = () => {
    onClose();
    onSupport();
  };

  const handleOpenAbout = () => {
    onClose();
    onAbout();
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      style={styles.mainMenuModal}
    >
      <Animated.View style={[styles.modalRoot, { opacity }]}>
        <View style={styles.modalRoot}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
            pointerEvents="box-none"
          >
            <View style={[styles.modalPad, styles.modalPadTop]} />

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
                    <Text style={styles.menuButtonText}>{t('common.addReminder')}</Text>
                  </Pressable>

                  <Pressable style={styles.menuButton} onPress={handleAddCity}>
                    <Text style={styles.menuButtonText}>{t('common.addCity')}</Text>
                  </Pressable>

                  {SUPPORT_FEATURE_ENABLED && canShowSupport && (
                    <>
                      <View style={styles.menuSeparator} />

                      <Pressable style={styles.menuButton} onPress={handleOpenSupport}>
                        <View style={styles.menuButtonInline}>
                          <HeartIcon fill={theme.text.primary} style={styles.menuButtonHeartIcon} />
                          <Text style={styles.menuButtonText}>{t('common.sayThanks')}</Text>
                        </View>
                      </Pressable>
                    </>
                  )}

                  <View style={styles.menuSeparator} />

                  <Pressable style={styles.menuButton} onPress={handleOpenSettings}>
                    <Text style={styles.menuButtonText}>{t('common.settings')}</Text>
                  </Pressable>

                  <Pressable style={styles.menuButton} onPress={handleOpenContact}>
                    <Text style={styles.menuButtonText}>{t('common.contact')}</Text>
                  </Pressable>

                  <Pressable style={styles.menuButton} onPress={handleOpenAbout}>
                    <Text style={styles.menuButtonText}>{t('common.about')}</Text>
                  </Pressable>

                </View>
              </View>
            </ImageBackground>

            <View style={styles.modalPad} />
          </KeyboardAvoidingView>
        </View>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  const isContrastBlack = theme.name === 'contrastBlack';

  return StyleSheet.create({
    mainMenuModal: {},
    modalRoot: { flex: 1 },
    modalContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-evenly',
      backgroundColor: theme.overlay.strong,
      padding: theme.spacing.modalX,
    },
    modalPad: {
      flex: 1,
    },
    modalPadTop: {
      marginBottom: 80,
    },
    closeButton: {
      width: 60,
      height: 60,
      margin: 'auto',
    },
    backgroundImage: {
      display: 'flex',
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      shadowColor: isContrastBlack ? '#ffffff' : '#000000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: isContrastBlack ? 0.28 : 0.16,
      shadowRadius: isContrastBlack ? 24 : 18,
      elevation: 16,
    },
    backgroundImageAsset: {
      transform: [{ scale: theme.image.modalBackgroundScale }],
    },
    modalContent: {
      backgroundColor: theme.surface.elevated,
      borderRadius: theme.radius.xl,
      paddingVertical: 15,
      paddingHorizontal: 23,
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
    },
    menuButton: {
      height: 50,
      justifyContent: 'center',
    },
    menuButtonInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    menuButtonHeartIcon: {
      width: 14,
      height: 12,
    },
    menuSeparator: {
      height: 1,
      backgroundColor: theme.overlay.strong,
      marginVertical: 5,
      opacity: 0.2
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
