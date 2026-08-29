import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useSupportModal } from '@/contexts/support-modal-context';
import { useI18n } from '@/hooks/use-i18n';

type DiagnosticRowProps = {
  label: string;
  value: string;
};

function DiagnosticRow({ label, value }: DiagnosticRowProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function Diagnostics() {
  const detailScreenStyles = useDetailScreenStyles();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { diagnostics } = useSupportModal();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isCopying, setIsCopying] = useState(false);

  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const appVersion = Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? t('diagnostics.notAvailable');
  const appBuild = isExpoGo
    ? t('diagnostics.expoGoBuild')
    : Application.nativeBuildVersion ?? t('diagnostics.notAvailable');
  const executionEnvironment = Constants.executionEnvironment ?? t('diagnostics.notAvailable');
  const appOwnership = Constants.appOwnership ?? t('diagnostics.notAvailable');
  const environment = __DEV__ ? 'development' : 'production';

  const diagnosticsText = useMemo(() => {
    const productLines = diagnostics.products.map((product) => {
      const status = product.wasReturned ? t('diagnostics.returned') : t('diagnostics.notReturned');
      const price = product.displayPrice ?? t('diagnostics.notAvailable');

      return `- ${product.id} | ${product.title} | ${price} | ${status}`;
    }).join('\n');

    return [
      `App Version: ${appVersion}`,
      `Build: ${appBuild}`,
      `Environment: ${environment}`,
      `Execution Environment: ${executionEnvironment}`,
      `App Ownership: ${appOwnership}`,
      `Platform: ${Platform.OS}`,
      `Bundle ID: ${diagnostics.bundleIdentifier}`,
      `Store Connection State: ${diagnostics.storeConnectionState}`,
      `Returned IAP Count: ${String(diagnostics.returnedProductCount)}`,
      `Last Store Error: ${diagnostics.lastError ?? t('diagnostics.notAvailable')}`,
      'Products:',
      productLines || `- ${t('diagnostics.noProducts')}`,
      'Request Payload:',
      diagnostics.requestPayload,
      'Response:',
      diagnostics.fetchProductsResponse,
    ].join('\n');
  }, [
    appBuild,
    appOwnership,
    appVersion,
    diagnostics,
    environment,
    executionEnvironment,
    t,
  ]);

  const handleCopyDiagnostics = async () => {
    setIsCopying(true);

    try {
      await Clipboard.setStringAsync(diagnosticsText);
      Alert.alert(t('diagnostics.title'), t('diagnostics.copySuccess'));
    } catch {
      Alert.alert(t('diagnostics.title'), t('common.openLinkError'));
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <DetailScreenShell
      title={t('diagnostics.title')}
      subtitle={t('diagnostics.subtitle')}
    >
      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <DiagnosticRow label={t('diagnostics.appVersion')} value={appVersion} />
        <DiagnosticRow label={t('diagnostics.appBuild')} value={appBuild} />
        <DiagnosticRow label={t('diagnostics.environment')} value={environment} />
        <DiagnosticRow label={t('diagnostics.executionEnvironment')} value={executionEnvironment} />
        <DiagnosticRow label={t('diagnostics.appOwnership')} value={appOwnership} />
        <DiagnosticRow label={t('diagnostics.platform')} value={Platform.OS} />
        <DiagnosticRow label={t('diagnostics.bundleId')} value={diagnostics.bundleIdentifier} />
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <DiagnosticRow label={t('diagnostics.storeConnectionState')} value={diagnostics.storeConnectionState} />
        <DiagnosticRow label={t('diagnostics.iapCount')} value={String(diagnostics.returnedProductCount)} />
        <DiagnosticRow
          label={t('diagnostics.lastError')}
          value={diagnostics.lastError ?? t('diagnostics.notAvailable')}
        />
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <Text style={detailScreenStyles.settingLabel}>{t('diagnostics.products')}</Text>

        {diagnostics.products.map((product) => (
          <View key={product.id} style={styles.productCard}>
            <Text style={styles.productId}>{product.id}</Text>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productMeta}>
              {product.displayPrice ?? t('diagnostics.notAvailable')}
            </Text>
            <Text style={styles.productMeta}>
              {product.wasReturned ? t('diagnostics.returned') : t('diagnostics.notReturned')}
            </Text>
          </View>
        ))}
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <Pressable
          style={[styles.copyButton, isCopying && styles.copyButtonDisabled]}
          onPress={handleCopyDiagnostics}
          disabled={isCopying}
        >
          <Text style={styles.copyButtonText}>
            {isCopying ? t('common.loading') : t('diagnostics.copy')}
          </Text>
        </Pressable>
      </View>
    </DetailScreenShell>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    row: {
      gap: 4,
    },
    rowLabel: {
      fontSize: 13,
      lineHeight: 17,
      color: theme.text.placeholder,
    },
    rowValue: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.text.primary,
    },
    productCard: {
      gap: 4,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border.subtle,
    },
    productId: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.text.warning,
    },
    productTitle: {
      fontSize: 15,
      lineHeight: 20,
      color: theme.text.primary,
    },
    productMeta: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.text.secondary,
    },
    copyButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 22,
      backgroundColor: theme.surface.button.subtle,
      borderWidth: 1,
      borderColor: theme.text.secondary,
    },
    copyButtonDisabled: {
      opacity: 0.55,
    },
    copyButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text.primary,
    },
  });
}
