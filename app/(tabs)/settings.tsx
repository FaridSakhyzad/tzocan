import { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useI18n } from '@/hooks/use-i18n';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemeName } from '@/constants/ui-theme';

export default function SettingsScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { theme, themeName } = useAppTheme();
  const { t, languageCode, setLanguageCode, languageLabels } = useI18n();
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
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
  ];

  const languageOptions = [
    { value: 'en' as const, label: languageLabels.en },
    { value: 'ru' as const, label: languageLabels.ru },
    { value: 'uk' as const, label: languageLabels.uk },
    { value: 'fr' as const, label: languageLabels.fr },
  ];

  return (
    <DetailScreenShell
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
    >
      <View style={detailScreenStyles.settingRow}>
        <View style={detailScreenStyles.settingInfo}>
          <Text style={detailScreenStyles.settingLabel}>{t('settings.timeFormat.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {timeFormat === '24h' ? t('settings.timeFormat.hint24') : t('settings.timeFormat.hint12')}
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
          <Text style={detailScreenStyles.settingLabel}>{t('settings.firstDay.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {firstDayOfWeek === 'monday' ? t('settings.firstDay.hintMonday') : t('settings.firstDay.hintSunday')}
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
          <Text style={detailScreenStyles.settingLabel}>{t('settings.language.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {t('settings.language.hint')}
          </Text>
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {languageOptions.map((option) => {
            const selected = languageCode === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.themeOptionButton,
                  selected && detailScreenStyles.themeOptionButtonActive,
                ]}
                onPress={() => setLanguageCode(option.value)}
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
          <Text style={detailScreenStyles.settingLabel}>{t('settings.theme.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {t('settings.theme.hint')}
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
          <Text style={detailScreenStyles.settingLabel}>{t('settings.notifications.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {permissionGranted
              ? t('settings.notifications.enabled')
              : permissionCanAskAgain
                ? t('settings.notifications.canAsk')
                : t('settings.notifications.blocked')}
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
                ? t('common.loading')
                : permissionCanAskAgain
                  ? t('settings.notifications.enable')
                  : t('settings.notifications.openSettings')}
            </Text>
          </Pressable>
        )}
      </View>
    </DetailScreenShell>
  );
}
