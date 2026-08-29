import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { SUPPORT_FEATURE_ENABLED } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';
import { useSupportModal } from '@/contexts/support-modal-context';
import { useSettings } from '@/contexts/settings-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemeName } from '@/constants/ui-theme';
import { RouteNamePaths } from '@/types/router';
import {
  getCalendarPermissionState,
  requestCalendarPermission,
} from '@/utils/reminder-calendar';

export default function Settings() {
  const router = useRouter();
  const detailScreenStyles = useDetailScreenStyles();
  const { themeName } = useAppTheme();
  const { t, languageCode, setLanguageCode, languageLabels } = useI18n();
  const { timeFormat, setTimeFormat, firstDayOfWeek, setFirstDayOfWeek, setThemeName } = useSettings();
  const {
    isSupportPurchasesLoading,
    isRestoringSupportPurchases,
    isSupportUnavailable,
    restoreSupportPurchases,
    resetSupportLocalState,
  } = useSupportModal();
  const isFocused = useIsFocused();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionCanAskAgain, setPermissionCanAskAgain] = useState(true);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);
  const [calendarPermissionGranted, setCalendarPermissionGranted] = useState<boolean | null>(null);
  const [calendarPermissionCanAskAgain, setCalendarPermissionCanAskAgain] = useState(true);
  const [isCalendarPermissionLoading, setIsCalendarPermissionLoading] = useState(false);
  const [isResettingSupportState, setIsResettingSupportState] = useState(false);
  const [restoreMessageKey, setRestoreMessageKey] = useState<
    | 'settings.supportRestore.ready'
    | 'settings.supportRestore.success'
    | 'settings.supportRestore.empty'
    | 'settings.supportRestore.unavailable'
  >('settings.supportRestore.ready');
  const [resetMessageKey, setResetMessageKey] = useState<
    | 'settings.supportReset.ready'
    | 'settings.supportReset.success'
  >('settings.supportReset.ready');

  const refreshNotificationPermission = async () => {
    const permission = await Notifications.getPermissionsAsync();
    setPermissionGranted(permission.granted);
    setPermissionCanAskAgain(permission.canAskAgain);
  };

  const refreshCalendarPermission = async () => {
    const permission = await getCalendarPermissionState();
    setCalendarPermissionGranted(permission.granted);
    setCalendarPermissionCanAskAgain(permission.canAskAgain);
  };

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    refreshNotificationPermission();
    void refreshCalendarPermission();
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

  const handleEnableCalendarAccess = async () => {
    setIsCalendarPermissionLoading(true);

    try {
      const permission = await requestCalendarPermission();
      setCalendarPermissionGranted(permission.granted);
      setCalendarPermissionCanAskAgain(permission.canAskAgain);
    } finally {
      setIsCalendarPermissionLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (isSupportUnavailable) {
      setRestoreMessageKey('settings.supportRestore.unavailable');
      Alert.alert(t('settings.supportRestore.title'), t('settings.supportRestore.unavailable'));
      return;
    }

    try {
      const restoredProductIds = await restoreSupportPurchases();
      const nextMessageKey = restoredProductIds.length > 0
        ? 'settings.supportRestore.success'
        : 'settings.supportRestore.empty';

      setRestoreMessageKey(nextMessageKey);
      Alert.alert(t('settings.supportRestore.title'), t(nextMessageKey));
    } catch (error) {
      console.warn('Failed to restore support purchases', error);
      setRestoreMessageKey('settings.supportRestore.unavailable');
      Alert.alert(t('settings.supportRestore.title'), t('settings.supportRestore.unavailable'));
    }
  };

  const handleResetSupportState = async () => {
    setIsResettingSupportState(true);

    try {
      await resetSupportLocalState();
      setResetMessageKey('settings.supportReset.success');
      Alert.alert(t('settings.supportReset.title'), t('settings.supportReset.success'));
    } catch (error) {
      console.warn('Failed to reset local support state', error);
    } finally {
      setIsResettingSupportState(false);
    }
  };

  const themeOptions: { value: ThemeName; label: string }[] = [
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
    { value: 'paperLight', label: t('settings.theme.paperLight') },
    { value: 'paperDark', label: t('settings.theme.paperDark') },
    { value: 'contrastWhite', label: t('settings.theme.contrastWhite') },
    { value: 'contrastBlack', label: t('settings.theme.contrastBlack') },
  ];

  const languageOptions = [
    { value: 'de' as const, label: languageLabels.de },
    { value: 'en' as const, label: languageLabels.en },
    { value: 'es' as const, label: languageLabels.es },
    { value: 'pt' as const, label: languageLabels.pt },
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

      {SUPPORT_FEATURE_ENABLED && Platform.OS !== 'android' && (
        <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
          <View style={detailScreenStyles.settingInfoNoMargin}>
            <Text style={detailScreenStyles.settingLabel}>{t('settings.supportRestore.title')}</Text>
            <Text style={detailScreenStyles.settingHint}>
              {t(restoreMessageKey)}
            </Text>
          </View>

          <Pressable
            style={detailScreenStyles.optionButton}
            onPress={handleRestorePurchases}
            disabled={isSupportPurchasesLoading || isRestoringSupportPurchases}
          >
            <Text style={[detailScreenStyles.optionButtonText, detailScreenStyles.notificationsOptionButtonText]}>
              {isSupportPurchasesLoading || isRestoringSupportPurchases
                ? t('common.loading')
                : t('settings.supportRestore.button')}
            </Text>
          </Pressable>

          {__DEV__ && (
            <>
              <View style={detailScreenStyles.settingInfoNoMargin}>
                <Text style={detailScreenStyles.settingHint}>
                  {t(resetMessageKey)}
                </Text>
              </View>

              <Pressable
                style={detailScreenStyles.optionButton}
                onPress={handleResetSupportState}
                disabled={isResettingSupportState}
              >
                <Text style={[detailScreenStyles.optionButtonText, detailScreenStyles.notificationsOptionButtonText]}>
                  {isResettingSupportState
                    ? t('common.loading')
                    : t('settings.supportReset.button')}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      )}

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
            style={detailScreenStyles.optionButton}
            onPress={permissionCanAskAgain ? handleEnableNotifications : handleOpenSystemSettings}
            disabled={isPermissionLoading}
          >
            <Text style={[detailScreenStyles.optionButtonText, detailScreenStyles.notificationsOptionButtonText]}>
              {isPermissionLoading
                ? t('common.loading')
                : permissionCanAskAgain
                  ? t('settings.notifications.enable')
                  : t('settings.notifications.openSettings')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <View style={detailScreenStyles.settingInfoNoMargin}>
          <Text style={detailScreenStyles.settingLabel}>{t('settings.calendar.label')}</Text>
          <Text style={detailScreenStyles.settingHint}>
            {calendarPermissionGranted
              ? t('settings.calendar.enabled')
              : calendarPermissionCanAskAgain
                ? t('settings.calendar.canAsk')
                : t('settings.calendar.blocked')}
          </Text>
        </View>

        {calendarPermissionGranted !== true && (
          <Pressable
            style={detailScreenStyles.optionButton}
            onPress={calendarPermissionCanAskAgain ? handleEnableCalendarAccess : handleOpenSystemSettings}
            disabled={isCalendarPermissionLoading}
          >
            <Text style={[detailScreenStyles.optionButtonText, detailScreenStyles.notificationsOptionButtonText]}>
              {isCalendarPermissionLoading
                ? t('common.loading')
                : calendarPermissionCanAskAgain
                  ? t('settings.calendar.enable')
                  : t('settings.calendar.openSettings')}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[detailScreenStyles.card, detailScreenStyles.cardWithGap]}>
        <Pressable
          style={detailScreenStyles.optionButton}
          onPress={() => {
            router.navigate(RouteNamePaths.diagnostics);
          }}
        >
          <Text style={[detailScreenStyles.optionButtonText, detailScreenStyles.notificationsOptionButtonText]}>
            {t('settings.diagnostics.button')}
          </Text>
        </Pressable>
      </View>
    </DetailScreenShell>
  );
}
