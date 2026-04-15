import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useSettings } from '@/contexts/settings-context';

export default function SettingsScreen() {
  const { timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek } = useSettings();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);

  const refreshNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync();
    setPermissionGranted(permission.granted);
    setPermissionCanAskAgain(permission.canAskAgain);
  };

  useEffect(() => {
    refreshNotificationPermission();
  }, []);

  const handleEnableNotifications = async () => {
    setIsPermissionLoading(true);

    try {
      const permission = await Notifications.requestPermissionsAsync();
      setPermissionGranted(permission.granted);
      setPermissionCanAskAgain(permission.canAskAgain);
    } finally {
      setIsPermissionLoading(false);
    }
  };

  const handleOpenSystemSettings = async () => {
    await Linking.openSettings();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Adjust the basic app behavior and notification access.
        </Text>
      </View>

      <View style={styles.section}>
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

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>First day of week</Text>
            <Text style={styles.settingHint}>
              {firstDayOfWeek === 'monday' ? 'Week starts on Monday.' : 'Week starts on Sunday.'}
            </Text>
          </View>
          <Switch
            value={firstDayOfWeek === 'sunday'}
            onValueChange={(value) => setFirstDayOfWeek(value ? 'sunday' : 'monday')}
            trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
            thumbColor="white"
          />
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingInfoNoMargin}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingHint}>
              {permissionGranted
                ? 'Notifications are enabled.'
                : permissionCanAskAgain
                  ? 'Enable notifications to activate alerts from the app.'
                  : 'Notifications are blocked. Open system settings to enable them again.'}
            </Text>
          </View>

          {permissionGranted !== true && (
            <Pressable
              style={styles.permissionButton}
              onPress={permissionCanAskAgain ? handleEnableNotifications : handleOpenSystemSettings}
              disabled={isPermissionLoading}
            >
              <Text style={styles.permissionButtonText}>
                {isPermissionLoading
                  ? 'Loading...'
                  : permissionCanAskAgain
                    ? 'Enable Notifications'
                    : 'Open Settings'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: {
    fontSize: 31,
    lineHeight: 37,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    padding: 16,
    borderRadius: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingInfoNoMargin: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingHint: {
    fontSize: 13,
    color: '#9a9bb2',
    marginTop: 4,
  },
  settingCard: {
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  permissionButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  permissionButtonText: {
    color: 'rgba(62, 63, 86, 1)',
    fontSize: 14,
    fontWeight: '600',
  },
});
