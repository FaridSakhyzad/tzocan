import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';

import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';

type SupportIapDebugProps = {
  debugInfo: {
    bundleIdentifier: string;
    requestPayload: string;
    fetchProductsResponse: string;
    lastError: string | null;
  };
};

export function SupportIapDebug({ debugInfo }: SupportIapDebugProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.debugBox}>
      <Text style={styles.debugTitle}>IAP Debug</Text>
      <ScrollView
        style={styles.debugScroll}
        contentContainerStyle={styles.debugScrollContent}
      >
        <Text style={styles.debugMetaText}>
          bundleIdentifier: {debugInfo.bundleIdentifier}
        </Text>

        <Text style={styles.debugSectionTitle}>request</Text>
        <Text style={styles.debugText}>{debugInfo.requestPayload}</Text>

        {debugInfo.lastError ? (
          <>
            <Text style={styles.debugSectionTitle}>error</Text>
            <Text style={styles.debugErrorText}>{debugInfo.lastError}</Text>
          </>
        ) : null}

        <Text style={styles.debugSectionTitle}>response</Text>
        <Text style={styles.debugText}>{debugInfo.fetchProductsResponse}</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    debugBox: {
      width: '100%',
      maxWidth: 295,
      marginHorizontal: 'auto',
      marginTop: 20,
      borderRadius: 16,
      backgroundColor: theme.surface.button.subtleWeak,
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 10,
    },
    debugTitle: {
      color: theme.text.primary,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    debugScroll: {
      maxHeight: 220,
    },
    debugScrollContent: {
      gap: 8,
    },
    debugMetaText: {
      color: theme.text.placeholder,
      fontSize: 12,
      lineHeight: 16,
    },
    debugSectionTitle: {
      color: theme.text.primary,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    debugText: {
      color: theme.text.primary,
      fontSize: 12,
      lineHeight: 16,
    },
    debugErrorText: {
      color: theme.text.warning,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
