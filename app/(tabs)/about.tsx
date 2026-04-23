import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useMemo } from 'react';

export default function AboutScreen() {
  const detailScreenStyles = useDetailScreenStyles();

  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { t } = useI18n();

  const handleOpenTerms = async () => {
    await Linking.openURL('https://faridsakhizad.github.io/tzc-terms-of-use/');
  };

  const handleOpenPrivacy = async () => {
    await Linking.openURL('https://faridsakhizad.github.io/tzc-privacy-policy/');
  };

  return (
    <DetailScreenShell
      title={t('about.title')}
      subtitle={t('about.subtitle')}
    >
      <View style={detailScreenStyles.aboutSection}>
        <Text style={styles.bodyText}>{t('about.body')}</Text>

        <Pressable
          style={styles.linkButton}
          onPress={handleOpenTerms}
        >
          <Text style={styles.linkButtonText}>
            {t('about.termsOfUse')}
          </Text>
        </Pressable>

        <Pressable
          style={styles.linkButton}
          onPress={handleOpenPrivacy}
        >
          <Text style={styles.linkButtonText}>
            {t('about.privacyPolicy')}
          </Text>
        </Pressable>
      </View>
    </DetailScreenShell>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    bodyText: {
      fontSize: 15,
      color: theme.text.primary,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 30,
    },
    linkButton: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: 36,
      marginBottom: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 18,
    },
    linkButtonText: {
      color: theme.text.warning
    },
  });
}
