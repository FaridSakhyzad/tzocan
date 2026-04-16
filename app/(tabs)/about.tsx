import { Text, View } from 'react-native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';

export default function AboutScreen() {
  const detailScreenStyles = useDetailScreenStyles();

  return (
    <DetailScreenShell
      title="About"
      subtitle="A short note about the app."
    >
      <View style={detailScreenStyles.card}>
        <Text style={detailScreenStyles.bodyText}>Lorem ipsum dolor</Text>
      </View>
    </DetailScreenShell>
  );
}
