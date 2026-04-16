import { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemeName } from '@/constants/ui-theme';

export default function SettingsScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { theme, themeName } = useAppTheme();
  const { timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, setThemeName } = useSettings();
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

  const themeOptions: { value: ThemeName; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <DetailScreenShell
      title="Settings"
      subtitle="Adjust the basic app behavior and notification access."
    >
      <View style={detailScreenStyles.settingRow}>
        <View style={detailScreenStyles.settingInfo}>
          <Text style={detailScreenStyles.settingLabel}>24-hour format</Text>
          <Text style={detailScreenStyles.settingHint}>
            {timeFormat === '24h' ? 'Using 24-hour format (e.g., 14:30)' : 'Using 12-hour format (e.g., 2:30 PM)'}
          </Text>
        </View>
        <Switch
          value={timeFormat === '24h'}
          onValueChange={(value) => setTimeFormat(value ? '24h' : '12h')}
          trackColor={{ false: theme.surface.button.subtleWeak, true: theme.surface.button.subtleStrong }}
          thumbColor={theme.surface.button.primary}
        />
      </View>

      <View style={detailScreenStyles.settingRow}>
        <View style={detailScreenStyles.settingInfo}>
          <Text style={detailScreenStyles.settingLabel}>First day of week</Text>
          <Text style={detailScreenStyles.settingHint}>
            {firstDayOfWeek === 'monday' ? 'Week starts on Monday.' : 'Week starts on Sunday.'}
          </Text>
        </View>
        <Switch
          value={firstDayOfWeek === 'sunday'}
          onValueChange={(value) => setFirstDayOfWeek(value ? 'sunday' : 'monday')}
          trackColor={{ false: theme.surface.button.subtleWeak, true: theme.surface.button.subtleStrong }}
          thumbColor={theme.surface.button.primary}
        />
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <View style={detailScreenStyles.settingInfoNoMargin}>
          <Text style={detailScreenStyles.settingLabel}>Theme</Text>
          <Text style={detailScreenStyles.settingHint}>
            Choose the visual theme for the app.
          </Text>
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {themeOptions.map((option) => {
            const selected = themeName === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.themeOptionButton,
                  selected && detailScreenStyles.themeOptionButtonActive,
                ]}
                onPress={() => setThemeName(option.value)}
              >
                <Text
                  style={[
                    detailScreenStyles.themeOptionButtonText,
                    selected && detailScreenStyles.themeOptionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <View style={detailScreenStyles.settingInfoNoMargin}>
          <Text style={detailScreenStyles.settingLabel}>Notifications</Text>
          <Text style={detailScreenStyles.settingHint}>
            {permissionGranted
              ? 'Notifications are enabled.'
              : permissionCanAskAgain
                ? 'Enable notifications to activate alerts from the app.'
                : 'Notifications are blocked. Open system settings to enable them again.'}
          </Text>
        </View>

        {permissionGranted !== true && (
          <Pressable
            style={detailScreenStyles.secondaryActionButton}
            onPress={permissionCanAskAgain ? handleEnableNotifications : handleOpenSystemSettings}
            disabled={isPermissionLoading}
          >
            <Text style={detailScreenStyles.secondaryActionButtonText}>
              {isPermissionLoading
                ? 'Loading...'
                : permissionCanAskAgain
                  ? 'Enable Notifications'
                  : 'Open Settings'}
            </Text>
          </Pressable>
        )}
      </View>
    </DetailScreenShell>
  );
}
