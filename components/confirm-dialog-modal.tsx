import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, ImageBackground } from 'react-native';
import { useMemo } from 'react';

import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';

type ConfirmDialogModalProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function ConfirmDialogModal({
  visible,
  title,
  onClose,
  onConfirm,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogModalProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedConfirmLabel = confirmLabel ?? t('common.delete');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalWrapper}
      >
        <ImageBackground
          source={theme.image.modalBackgroundSource}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageAsset}
          resizeMode="cover"
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderText}>{title}</Text>

            <View style={styles.actions}>
              <Pressable style={[styles.dialogButton, styles.dialogButtonDelete]} onPress={onConfirm}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonTextDelete]}>{resolvedConfirmLabel}</Text>
              </Pressable>
              <Pressable style={[styles.dialogButton, styles.dialogButtonSecondary]} onPress={onClose}>
                <Text style={[styles.dialogButtonText, styles.dialogButtonTextSecondary]}>{resolvedCancelLabel}</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    modalWrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-evenly',
      backgroundColor: theme.overlay.strong,
      padding: theme.spacing.modalX,
    },
    backgroundImage: {
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
    },
    backgroundImageAsset: {
      transform: [{ scale: theme.image.modalBackgroundScale }],
    },
    modalContent: {
      backgroundColor: theme.surface.elevated,
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.modalInnerY,
      paddingHorizontal: theme.spacing.modalInnerX,
    },
    modalHeaderText: {
      textAlign: 'center',
      fontSize: theme.typography.titleSm.fontSize,
      lineHeight: 26,
      color: theme.text.primary,
      minHeight: 100,
      paddingVertical: 12,
      paddingBottom: 24,
    },
    actions: {
      gap: theme.spacing.modalActionsGap,
    },
    dialogButton: {
      height: 40,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.surface.button.subtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogButtonText: {
      fontSize: theme.typography.control.fontSize,
      color: theme.text.primary,
    },
    dialogButtonDelete: {
      backgroundColor: theme.surface.button.subtleStrong,
    },
    dialogButtonTextDelete: {
      color: theme.text.warning,
    },
    dialogButtonSecondary: {
      backgroundColor: theme.surface.button.subtleWeak,
    },
    dialogButtonTextSecondary: {
      color: theme.text.secondary,
    },
  });
}
