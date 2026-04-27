import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useIsFocused } from '@react-navigation/native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { useI18n } from '@/hooks/use-i18n';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemeName } from '@/constants/ui-theme';

export default function SettingsScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { themeName } = useAppTheme();
  const { t, languageCode, setLanguageCode, languageLabels } = useI18n();
  const { timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, setThemeName } = useSettings();
  const isFocused = useIsFocused();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);

  const refreshNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync();
    setPermissionGranted(permission.granted);
    setPermissionCanAskAgain(permission.canAskAgain);
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    refreshNotificationPermission();
  }, [isFocused]);

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
    { value: 'es' as const, label: languageLabels.es },
    { value: 'ru' as const, label: languageLabels.ru },
    { value: 'uk' as const, label: languageLabels.uk },
    { value: 'fr' as const, label: languageLabels.fr },
  ];
  const timeFormatOptions = [
    { value: '24h' as const, label: '24h' },
    { value: '12h' as const, label: '12h (AM/PM)' },
  ];
  const firstDayOfWeekOptions = [
    { value: 'monday' as const, label: t('settings.firstDay.monday') },
    { value: 'sunday' as const, label: t('settings.firstDay.sunday') },
  ];

  return (
    <DetailScreenShell
      title={t('settings.title')}
      subtitle={t('settings.subtitle')}
    >
      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <View style={detailScreenStyles.settingInfoNoMargin}>
          <Text style={detailScreenStyles.settingLabel}>{t('settings.language.label')}</Text>
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {languageOptions.map((option) => {
            const selected = languageCode === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.optionButton,
                  selected && detailScreenStyles.optionButtonActive,
                ]}
                onPress={() => setLanguageCode(option.value)}
              >
                <Text
                  style={[
                    detailScreenStyles.optionButtonText,
                    selected && detailScreenStyles.optionButtonTextActive,
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
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {themeOptions.map((option) => {
            const selected = themeName === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.optionButton,
                  selected && detailScreenStyles.optionButtonActive,
                ]}
                onPress={() => setThemeName(option.value)}
              >
                <Text
                  style={[
                    detailScreenStyles.optionButtonText,
                    selected && detailScreenStyles.optionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={detailScreenStyles.card}>
        <View style={detailScreenStyles.settingInfo}>
          <Text style={detailScreenStyles.settingLabel}>{t('settings.timeFormat.label')}</Text>
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {timeFormatOptions.map((option) => {
            const selected = timeFormat === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.optionButton,
                  selected && detailScreenStyles.optionButtonActive,
                ]}
                onPress={() => setTimeFormat(option.value)}
              >
                <Text
                  style={[
                    detailScreenStyles.optionButtonText,
                    selected && detailScreenStyles.optionButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={detailScreenStyles.card}>
        <View style={detailScreenStyles.settingInfo}>
          <Text style={detailScreenStyles.settingLabel}>{t('settings.firstDay.label')}</Text>
        </View>

        <View style={detailScreenStyles.settingThemeOptions}>
          {firstDayOfWeekOptions.map((option) => {
            const selected = firstDayOfWeek === option.value;

            return (
              <Pressable
                key={option.value}
                style={[
                  detailScreenStyles.optionButton,
                  selected && detailScreenStyles.optionButtonActive,
                ]}
                onPress={() => setFirstDayOfWeek(option.value)}
              >
                <Text
                  style={[
                    detailScreenStyles.optionButtonText,
                    selected && detailScreenStyles.optionButtonTextActive,
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
