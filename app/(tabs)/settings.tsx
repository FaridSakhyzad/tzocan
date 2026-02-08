import { Text, View, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/contexts/settings-context';

export default function Settings() {
  const { timeFormat, setTimeFormat } = useSettings();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={styles.pageTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>24-hour format</Text>
            <Text style={styles.settingHint}>
              {timeFormat === '24h' ? 'Using 24-hour format (e.g., 14:30)' : 'Using 12-hour format (e.g., 2:30 PM)'}
            </Text>
          </View>
          <Switch
            value={timeFormat === '24h'}
            onValueChange={(value) => setTimeFormat(value ? '24h' : '12h')}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor="white"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});
