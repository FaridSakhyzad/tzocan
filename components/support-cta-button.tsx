import { Pressable, StyleSheet, Text } from 'react-native';
import { useMemo } from 'react';

import { SUPPORT_FEATURE_ENABLED } from '@/constants/app-config';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useSupportModal } from '@/contexts/support-modal-context';
import { useI18n } from '@/hooks/use-i18n';

import HeartIcon from '@/assets/images/icon--heart-1.svg';

type SupportCtaButtonProps = {
  onPress: () => void;
};

export function SupportCtaButton({ onPress }: SupportCtaButtonProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { hasPurchasedAnySupportProduct } = useSupportModal();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!SUPPORT_FEATURE_ENABLED || hasPurchasedAnySupportProduct) {
    return null;
  }

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <HeartIcon fill={theme.text.primary} style={styles.buttonIcon} />
      <Text style={styles.buttonText}>{t('common.sayThanks')}</Text>
    </Pressable>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    button: {
      alignSelf: 'stretch',
      backgroundColor: theme.surface.cardAlt,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonIcon: {
      width: 14,
      height: 12,
    },
    buttonText: {
      color: theme.text.primary,
      fontSize: 16,
      textAlign: 'center',
    },
  });
}
