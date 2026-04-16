import { Text, View } from 'react-native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useI18n } from '@/hooks/use-i18n';

export default function AboutScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { t } = useI18n();

  return (
    <DetailScreenShell
      title={t('about.title')}
      subtitle={t('about.subtitle')}
    >
      <View style={detailScreenStyles.card}>
        <Text style={detailScreenStyles.bodyText}>{t('about.body')}</Text>
      </View>
    </DetailScreenShell>
  );
}
