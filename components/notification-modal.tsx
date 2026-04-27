import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground
} from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CityNotification } from '@/contexts/selected-cities-context';
import { useSettings } from '@/contexts/settings-context';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';

import IconClock from '@/assets/images/icon--clock-2--outlined.svg';
import IconCalendar from '@/assets/images/icon--calendar-2--outlined.svg';
import IconRepeat from '@/assets/images/icon--repeat-1.svg';
import IconDelete from '@/assets/images/icon--x-2--outlined.svg';
import IconArrow from '@/assets/images/icon--arrow-1.svg';
import IconCheckmark from '@/assets/images/icon--checkmark-2.svg';

import { NotificationPickerModal } from '@/components/notification-picker-modal';

export type NotificationFormValues = {
  year?: number;
  month?: number;
  day?: number;
  hour: number;
  minute: number;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  weekdays?: number[]; // JS: 0=Sun ... 6=Sat
  label?: string;
  notes?: string;
  url?: string;
};

type NotificationModalProps = {
  visible: boolean;
  cityName: string;
  cityTimezone?: string;
  mode: 'add' | 'edit';
  citySelectionMode?: 'selectable' | 'locked';
  cityOptions?: { id: number; label: string; hint?: string; timezone: string }[];
  selectedCityId?: number | null;
  onSelectCityId?: (cityId: number) => void;
  initialNotification?: CityNotification | null;
  onClose: () => void;
  onSave: (values: NotificationFormValues) => Promise<boolean>;
};

export function NotificationModal({
  visible,
  cityName,
  cityTimezone,
  mode,
  citySelectionMode = 'locked',
  cityOptions,
  selectedCityId,
  onSelectCityId,
  initialNotification,
  onClose,
  onSave,
}: NotificationModalProps) {
  const { theme } = useAppTheme();
  const { t, locale, weekdayShortLabels } = useI18n();
  const { firstDayOfWeek, timeFormat } = useSettings();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const DATE_SHIFT_LABELS = useMemo(() => ({
    previousDay: t('common.previousDay'),
    nextDay: t('common.nextDay'),
    previousMonth: t('common.previousMonth'),
    nextMonth: t('common.nextMonth'),
    previousYear: t('common.previousYear'),
    nextYear: t('common.nextYear'),
  }), [t]);
  const REPEAT_LABELS = useMemo(() => ({
    todayOnly: t('notification.repeat.never'),
    daily: t('notification.repeat.daily'),
    weekly: t('notification.repeat.weekly'),
    monthly: t('notification.repeat.monthly'),
    yearly: t('notification.repeat.yearly'),
    chooseRepeat: t('notification.repeatPlaceholder'),
    chooseSpecificWeekdays: t('notification.repeat.specificWeekdays'),
    weekdaysNotSelected: t('notification.repeat.notSelected'),
    weekdays: weekdayShortLabels,
  }), [t, weekdayShortLabels]);
  const [notificationDate, setNotificationDate] = useState(new Date());
  const [notificationTime, setNotificationTime] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [hasDate, setHasDate] = useState(false);
  const [isTimeSelected, setIsTimeSelected] = useState(false);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [activePicker, setActivePicker] = useState<'city' | 'time' | 'date' | 'repeat' | 'weekdays' | null>(null);
  const [notificationLabel, setNotificationLabel] = useState('');
  const [notificationNotes, setNotificationNotes] = useState('');
  const [notificationUrl, setNotificationUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pickerDraftTime, setPickerDraftTime] = useState(new Date());
  const [pickerDraftDate, setPickerDraftDate] = useState(new Date());
  const [pickerDraftRepeat, setPickerDraftRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [pickerDraftWeekdays, setPickerDraftWeekdays] = useState<number[]>([]);
  const [pickerDraftCityId, setPickerDraftCityId] = useState<number | null>(null);

  const formatDateLabel = useCallback((date: Date) => {
    const currentYear = new Date().getFullYear();
    const includeYear = date.getFullYear() !== currentYear;
    const parts = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).formatToParts(date);
    const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
    const baseLabel = `${getPart('weekday')} ${getPart('day')} ${getPart('month')}`;

    if (includeYear) {
      return `${baseLabel}, ${getPart('year')}`;
    }

    return baseLabel;
  }, [locale]);

  const formatTimeLabel = useCallback((hour: number, minute: number) => {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(new Date(2027, 0, 1, hour, minute));
  }, [locale, timeFormat]);

  const getTriggerDateForTimezone = (
    timezone: string,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
  ): Date => {
    const now = new Date();

    const targetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = targetFormatter.formatToParts(now);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const currentYearInTz = getPart('year');
    const currentMonthInTz = getPart('month');
    const currentDayInTz = getPart('day');
    const currentHourInTz = getPart('hour');
    const currentMinuteInTz = getPart('minute');
    const currentSecondInTz = getPart('second');

    const currentDateInTz = new Date(
      currentYearInTz,
      currentMonthInTz - 1,
      currentDayInTz,
      currentHourInTz,
      currentMinuteInTz,
      currentSecondInTz
    );
    const targetDateInTz = new Date(year, month - 1, day, hour, minute, 0);

    const diffMs = targetDateInTz.getTime() - currentDateInTz.getTime();

    return new Date(now.getTime() + diffMs);
  };
  const getDatePartsInTimezone = (date: Date, timezone: string) => {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(date);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    return {
      year: getPart('year'),
      month: getPart('month'),
      day: getPart('day'),
    };
  };
  const getPreviewInfo = useCallback((timezone: string, hour: number, minute: number, overrideDate?: Date) => {
    const now = new Date();
    let triggerDate: Date;
    let cityYear: number;
    let cityMonth: number;
    let cityDay: number;
    const effectiveHasDate = Boolean(overrideDate) || hasDate;
    const effectiveDate = overrideDate || notificationDate;

    if (effectiveHasDate) {
      cityYear = effectiveDate.getFullYear();
      cityMonth = effectiveDate.getMonth() + 1;
      cityDay = effectiveDate.getDate();
      triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
    } else {
      const cityNow = getDatePartsInTimezone(now, timezone);
      cityYear = cityNow.year;
      cityMonth = cityNow.month;
      cityDay = cityNow.day;

      triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
      if (triggerDate.getTime() <= now.getTime()) {
        const next = new Date(cityYear, cityMonth - 1, cityDay + 1);
        cityYear = next.getFullYear();
        cityMonth = next.getMonth() + 1;
        cityDay = next.getDate();
        triggerDate = getTriggerDateForTimezone(timezone, cityYear, cityMonth, cityDay, hour, minute);
      }
    }

    const timeText = new Intl.DateTimeFormat(locale, {
      timeStyle: 'short',
    }).format(triggerDate);
    const localTimeText = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: timeFormat === '12h',
    }).format(triggerDate);

    const localYear = triggerDate.getFullYear();
    const localMonth = triggerDate.getMonth() + 1;
    const localDay = triggerDate.getDate();
    const localDateText = formatDateLabel(triggerDate);
    const cityStamp = Date.UTC(cityYear, cityMonth - 1, cityDay);
    const localStamp = Date.UTC(localYear, localMonth - 1, localDay);
    const dayDiff = Math.round((localStamp - cityStamp) / 86400000);
    const monthOrYearShiftText =
      localYear > cityYear ? DATE_SHIFT_LABELS.nextYear
        : localYear < cityYear ? DATE_SHIFT_LABELS.previousYear
          : localMonth > cityMonth ? DATE_SHIFT_LABELS.nextMonth
            : localMonth < cityMonth ? DATE_SHIFT_LABELS.previousMonth
              : '';

    const dayShiftText =
      dayDiff < 0
        ? DATE_SHIFT_LABELS.previousDay
        : dayDiff > 0
          ? DATE_SHIFT_LABELS.nextDay
          : '';

    return {
      timeText,
      localTimeText,
      localDateText: localStamp !== cityStamp ? localDateText : '',
      monthOrYearShiftText,
      dayShiftText,
    };
  }, [DATE_SHIFT_LABELS, formatDateLabel, hasDate, locale, notificationDate, timeFormat]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const source = initialNotification ?? null;
    const hasDateInSource = Boolean(source?.year && source?.month && source?.day);

    if (hasDateInSource && source?.year && source?.month && source?.day) {
      setNotificationDate(new Date(source.year, source.month - 1, source.day));
    } else {
      setNotificationDate(new Date());
    }

    const time = new Date();
    if (source) {
      time.setHours(source.hour, source.minute, 0, 0);
    } else {
      time.setHours(0, 0, 0, 0);
    }
    setNotificationTime(time);
    setIsTimeSelected(Boolean(source));
    setRepeat(source?.repeat || (source?.isDaily ? 'daily' : 'none'));
    setWeekdays(source?.weekdays || []);

    setHasDate(hasDateInSource);
    setActivePicker(null);
    setNotificationLabel(source?.label || '');
    setNotificationNotes(source?.notes || '');
    setNotificationUrl(source?.url || '');
    const initialPickerTime = new Date(time);
    if (!source) {
      initialPickerTime.setHours(12, 0, 0, 0);
    }
    setPickerDraftTime(initialPickerTime);
    setPickerDraftDate(hasDateInSource && source?.year && source?.month && source?.day ? new Date(source.year, source.month - 1, source.day) : new Date());
    setPickerDraftRepeat(source?.repeat || (source?.isDaily ? 'daily' : 'none'));
    setPickerDraftWeekdays(source?.weekdays || []);
    setPickerDraftCityId(selectedCityId ?? null);
  }, [visible, initialNotification, selectedCityId]);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDraftDate(selectedDate);
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setPickerDraftTime(selectedDate);
    }
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const hour = notificationTime.getHours();
      const minute = notificationTime.getMinutes();
      const label = notificationLabel.trim() || undefined;
      const notes = notificationNotes.trim() || undefined;
      const url = notificationUrl.trim() || undefined;

      const values: NotificationFormValues = {
        hour,
        minute,
        year: hasDate ? notificationDate.getFullYear() : undefined,
        month: hasDate ? notificationDate.getMonth() + 1 : undefined,
        day: hasDate ? notificationDate.getDate() : undefined,
        repeat,
        weekdays: weekdays.length > 0 ? weekdays : undefined,
        label,
        notes,
        url,
      };

      const didSave = await onSave(values);

      if (didSave) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTimeLabel = formatTimeLabel(notificationTime.getHours(), notificationTime.getMinutes());
  const selectedDateLabel = formatDateLabel(notificationDate);

  const selectedCityOption = cityOptions?.find((city) => city.id === selectedCityId) || null;
  const weekdayOrder = firstDayOfWeek === 'sunday'
    ? [0, 1, 2, 3, 4, 5, 6]
    : [1, 2, 3, 4, 5, 6, 0];
  const weekdaySortOrder = new Map(weekdayOrder.map((value, index) => [value, index]));

  const repeatLabel = (() => {
    if (weekdays.length > 0) {
      return weekdays
        .slice()
        .sort((a, b) => (weekdaySortOrder.get(a) ?? 0) - (weekdaySortOrder.get(b) ?? 0))
        .map((d) => REPEAT_LABELS.weekdays[d as keyof typeof REPEAT_LABELS.weekdays])
        .join(', ');
    }

    if (repeat === 'none') {
      return null;
    }

    if (repeat === 'daily') {
      return REPEAT_LABELS.daily;
    }

    if (repeat === 'weekly') {
      return REPEAT_LABELS.weekly;
    }

    if (repeat === 'monthly') {
      return REPEAT_LABELS.monthly;
    }

    return REPEAT_LABELS.yearly;
  })();

  const canSelectCity =
    citySelectionMode === 'selectable' &&
    mode === 'add' &&
    Boolean(cityOptions && cityOptions.length > 0 && onSelectCityId);

  const canSave =
    isTimeSelected &&
    (mode === 'edit' || !cityOptions || selectedCityId !== null && selectedCityId !== undefined);
  const isPickerOpen = activePicker !== null;
  const isCityPicker = activePicker === 'city';
  const effectiveTimezone = selectedCityOption?.timezone || cityTimezone;

  const pickerTitle = (() => {
    if (activePicker === 'city') {
      return t('notification.chooseCity');
    }

    if (activePicker === 'time') {
      return t('notification.chooseTime');
    }

    if (activePicker === 'date') {
      return t('notification.chooseDate');
    }

    if (activePicker === 'weekdays') {
      return t('notification.chooseWeekdays');
    }

    if (activePicker === 'repeat') {
      return t('notification.chooseRepeat');
    }

    return null
  })();

  const modalTitle = (() => {
    if (mode === 'edit') {
      return t('notification.title.edit');
    }

    if (citySelectionMode === 'locked') {
      return t('notification.title.add');
    }

    return t('notification.title.new');
  })();

  const localPreviewInfo = useMemo(() => {
    if (!isTimeSelected) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, notificationTime.getHours(), notificationTime.getMinutes());
  }, [effectiveTimezone, getPreviewInfo, isTimeSelected, notificationTime]);

  const timePickerLocalPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, pickerDraftTime.getHours(), pickerDraftTime.getMinutes());
  }, [effectiveTimezone, getPreviewInfo, pickerDraftTime]);

  const datePickerPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { timeText: '', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    const previewHour = isTimeSelected ? notificationTime.getHours() : pickerDraftTime.getHours();
    const previewMinute = isTimeSelected ? notificationTime.getMinutes() : pickerDraftTime.getMinutes();

    return getPreviewInfo(effectiveTimezone, previewHour, previewMinute, pickerDraftDate);
  }, [effectiveTimezone, getPreviewInfo, isTimeSelected, notificationTime, pickerDraftTime, pickerDraftDate]);

  const openTimePicker = () => {
    const nextPickerTime = new Date(notificationTime);

    if (!isTimeSelected) {
      nextPickerTime.setHours(12, 0, 0, 0);
    }

    setPickerDraftTime(nextPickerTime);
    setActivePicker('time');
  };

  const openCityPicker = () => {
    setPickerDraftCityId(selectedCityId ?? null);
    setActivePicker('city');
  };

  const openDatePicker = () => {
    setPickerDraftDate(new Date(notificationDate));
    setActivePicker('date');
  };
  const openRepeatPicker = () => {
    setPickerDraftRepeat(repeat);
    setPickerDraftWeekdays(weekdays);
    setActivePicker('repeat');
  };
  const openWeekdaysPicker = () => {
    setPickerDraftWeekdays(weekdays);
    setActivePicker('weekdays');
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const handleClosePicker = () => {
    if (activePicker === 'weekdays') {
      setActivePicker('repeat');

      return;
    }

    closePicker();
  };

  const clearRepeat = () => {
    setRepeat('none');
    setWeekdays([]);
    setPickerDraftRepeat('none');
    setPickerDraftWeekdays([]);
  };

  const applyPicker = () => {
    if (activePicker === 'time') {
      setNotificationTime(pickerDraftTime);
      setIsTimeSelected(true);
    }

    if (activePicker === 'date') {
      setNotificationDate(pickerDraftDate);
      setHasDate(true);
      setRepeat('none');
      setWeekdays([]);
      setPickerDraftRepeat('none');
      setPickerDraftWeekdays([]);
    }

    if (activePicker === 'repeat') {
      setHasDate(false);
      setRepeat(pickerDraftRepeat);
      setWeekdays([]);
    }

    if (activePicker === 'weekdays') {
      setHasDate(false);
      setRepeat('weekly');
      setWeekdays(pickerDraftWeekdays);
    }

    if (activePicker === 'city' && onSelectCityId && pickerDraftCityId !== null) {
      onSelectCityId(pickerDraftCityId);
    }

    closePicker();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <ImageBackground
        source={theme.image.modalBackgroundSource}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View
            style={[
              styles.modalContent,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={styles.header}>
                <Pressable onPress={onClose} style={styles.headerButton}>
                  <IconCancelOutlined fill={theme.text.primary} />
                </Pressable>

                <View>
                  <Text style={styles.title}>{modalTitle}</Text>
                </View>

                <Pressable style={[styles.headerButton, !canSave && styles.headerButtonDisabled]} onPress={handleSave} disabled={isSaving || !canSave}>
                  <IconConfirmOutlined fill={theme.text.primary} />
                </Pressable>
              </View>

              <View style={styles.content}>
                {canSelectCity && (
                  <Pressable style={[styles.actionButton, styles.citySelect]} onPress={openCityPicker}>
                    {selectedCityOption?.label ? (
                      <Text style={[styles.actionButtonText, styles.citySelectText]}>{selectedCityOption?.label}</Text>
                    ) : (
                      <Text style={[styles.actionButtonHintText, styles.actionButtonHintTextCity]}>{t('notification.cityPlaceholder')}</Text>
                    )}
                    <IconArrow style={styles.citySelectIcon} fill={theme.text.primary} />
                  </Pressable>
                )}

                {!canSelectCity && citySelectionMode === 'locked' && !!cityName && (
                  <View style={styles.cityTitle}>
                    <Text style={styles.cityTitleText}>{cityName}</Text>
                  </View>
                )}

                <TextInput
                  style={styles.labelInput}
                  placeholder={t('notification.labelPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationLabel}
                  onChangeText={setNotificationLabel}
                  multiline
                />

                <TextInput
                  style={styles.notesInput}
                  placeholder={t('notification.notesPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationNotes}
                  onChangeText={setNotificationNotes}
                  multiline
                />

                <TextInput
                  style={styles.urlInput}
                  placeholder={t('notification.urlPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={notificationUrl}
                  onChangeText={setNotificationUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Pressable
                  style={[styles.actionButton, activePicker === 'time' && styles.actionButtonActive]}
                  onPress={openTimePicker}
                >
                  {isTimeSelected ? (
                    <>
                      <View style={styles.actionButtonHint}>
                        <IconClock style={styles.actionButtonHintIcon} fill={theme.text.primary} />
                        <Text style={styles.actionButtonText}>{selectedTimeLabel}</Text>
                      </View>
                      {effectiveTimezone && (
                        <View style={styles.localTimeBox}>
                          <Text style={styles.localTimeLabel}>{t('common.yourTime')}</Text>
                          <Text style={styles.localTime}>{localPreviewInfo.localTimeText}</Text>
                          {!!localPreviewInfo.dayShiftText && (
                            <Text style={styles.localTimeDayShift}>{localPreviewInfo.dayShiftText}</Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconClock style={styles.actionButtonHintIcon} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{t('notification.timePlaceholder')}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.actionButton,
                    activePicker === 'date' && styles.actionButtonActive,
                  ]}
                  onPress={openDatePicker}
                >
                  {hasDate ? (
                    <>
                      <View style={styles.actionButtonHint}>
                        <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill={theme.text.primary} />
                        <Text style={styles.actionButtonText}>{selectedDateLabel}</Text>

                        <Pressable style={styles.clearDateButton} onPress={() => setHasDate(false)}>
                          <IconDelete fill={theme.text.warning} />
                        </Pressable>
                      </View>

                      {!!localPreviewInfo.localDateText && (
                        <View style={styles.localDateBox}>
                          <Text style={styles.localDateLabel}>{t('common.yourDate')}</Text>
                          <Text style={styles.localDate}>{localPreviewInfo.localDateText}</Text>
                          {!!localPreviewInfo.monthOrYearShiftText && (
                            <Text
                              style={[
                                styles.localDateShift,
                                (localPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.nextYear ||
                                  localPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.previousYear) &&
                                  styles.localDateShiftYear,
                              ]}
                            >
                              {localPreviewInfo.monthOrYearShiftText}
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{t('notification.datePlaceholder')}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={styles.singleActionButton} onPress={openRepeatPicker}>
                  {repeatLabel ? (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonText}>{repeatLabel}</Text>
                      <Pressable style={styles.clearDateButton} onPress={clearRepeat}>
                        <IconDelete fill={theme.text.warning} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill={theme.text.primary} />
                      <Text style={styles.actionButtonHintText}>{REPEAT_LABELS.chooseRepeat}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>

      <NotificationPickerModal
        visible={isPickerOpen}
        title={pickerTitle}
        onClose={handleClosePicker}
        onApply={applyPicker}
        showActions={activePicker !== 'city'}
        wide={isCityPicker}
      >
        {isCityPicker && cityOptions && (
          <ScrollView style={styles.cityPickerList}>
            {cityOptions.map((city, idx) => {
              const selected = pickerDraftCityId === city.id;

              return (
                <Pressable
                  key={`city-picker-${city.id}`}
                  style={[
                    styles.cityPickerItem,
                    selected && styles.cityPickerItemActive,
                    (1 + idx) === cityOptions.length  && styles.cityPickerItemLast
                  ]}
                  onPress={() => {
                    setPickerDraftCityId(city.id);
                    if (onSelectCityId) {
                      onSelectCityId(city.id);
                    }
                    closePicker();
                  }}
                >
                  <Text style={styles.cityPickerItemText}>{city.label}</Text>
                  {!!city.hint && <Text style={styles.cityPickerItemHint}>{city.hint}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {activePicker === 'time' && (
          <>
            <DateTimePicker
              value={pickerDraftTime}
              mode="time"
              is24Hour={timeFormat === '24h'}
              display="spinner"
              onChange={handleTimeChange}
              style={styles.timePicker}
              textColor={theme.text.primary}
            />
            {!!timePickerLocalPreviewInfo.timeText && (
              <View style={styles.timePickerLocalTimeBox}>
                <Text style={styles.timePickerLocalTimeLabel}>{t('common.yourTime')}</Text>
                <Text style={styles.timePickerLocalTime}>
                  {timePickerLocalPreviewInfo.timeText}
                </Text>

                {!!timePickerLocalPreviewInfo.dayShiftText && (
                  <Text style={styles.timePickerDayShiftText}>{timePickerLocalPreviewInfo.dayShiftText}</Text>
                )}
              </View>
            )}
          </>
        )}

        {activePicker === 'date' && (
          <>
            <DateTimePicker
              value={pickerDraftDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              style={styles.datePicker}
              textColor={theme.text.primary}
            />
            {!!datePickerPreviewInfo.localDateText && (
              <View style={styles.timePickerLocalTimeBox}>
                <Text style={styles.timePickerLocalTimeLabel}>{t('common.yourDate')}</Text>
                <Text style={styles.timePickerLocalTime}>
                  {datePickerPreviewInfo.localDateText}
                </Text>

                {!!datePickerPreviewInfo.monthOrYearShiftText && (
                  <Text
                    style={[
                      styles.localDateShift,
                      (datePickerPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.nextYear ||
                        datePickerPreviewInfo.monthOrYearShiftText === DATE_SHIFT_LABELS.previousYear) &&
                        styles.localDateShiftYear,
                    ]}
                  >
                    {datePickerPreviewInfo.monthOrYearShiftText}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {activePicker === 'repeat' && (
          <View style={styles.repeatPickerList}>
            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === 'none' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat('none');
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === 'none' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.todayOnly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === 'daily' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat('daily');
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === 'daily' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.daily}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === 'weekly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat('weekly');
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === 'weekly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.weekly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === 'monthly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat('monthly');
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === 'monthly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.monthly}</Text>
            </Pressable>

            <Pressable
              style={[styles.repeatPickerItem, pickerDraftRepeat === 'yearly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
              onPress={() => {
                setPickerDraftRepeat('yearly');
                setPickerDraftWeekdays([]);
              }}
            >
              <Text style={[
                styles.repeatPickerItemText,
                pickerDraftRepeat === 'yearly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemTextActive
              ]}>{REPEAT_LABELS.yearly}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.repeatPickerSecondary,
                pickerDraftWeekdays.length > 0 && styles.repeatPickerItemActive
              ]}
              onPress={openWeekdaysPicker}
            >
              <Text style={[styles.repeatPickerItemText, pickerDraftWeekdays.length > 0 && styles.repeatPickerItemTextActive]}>{REPEAT_LABELS.chooseSpecificWeekdays}</Text>
            </Pressable>
          </View>
        )}

        {activePicker === 'weekdays' && (
          <View style={styles.repeatPickerList}>
            <View style={styles.weekdaysWrap}>
              {[
                ...weekdayOrder.map((value) => ({
                  label: REPEAT_LABELS.weekdays[value as keyof typeof REPEAT_LABELS.weekdays],
                  value,
                })),
              ].map((day, idx) => {
                const selected = pickerDraftWeekdays.includes(day.value);
                return (
                  <Pressable
                    key={`weekday-${day.value}`}
                    style={[
                      styles.weekdayChip,
                      selected && styles.weekdayChipActive,
                      idx === 6 && styles.weekdayChipLast
                    ]}
                    onPress={() => {
                      setPickerDraftWeekdays((prev) =>
                        prev.includes(day.value)
                          ? prev.filter((d) => d !== day.value)
                          : [...prev, day.value]
                      );
                    }}
                  >
                    <Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextActive]}>{day.label}</Text>
                    {selected && (
                      <IconCheckmark fill={theme.text.primary} style={styles.weekdayChipIcon} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </NotificationPickerModal>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.overlay.medium,
  },
  modalContent: {
    minHeight: '100%',
    maxHeight: '100%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  header: {
    paddingHorizontal: 33,
    paddingTop: theme.spacing.modalInnerY,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.text.primary,
    fontSize: theme.typography.titleSm.fontSize,
  },
  headerButton: {
    width: 30,
    height: 30,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: theme.spacing.screenX,
  },
  cityTitle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
  },
  cityTitleText: {
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
    color: theme.text.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  labelInput: {
    fontSize: theme.typography.control.fontSize,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderBottomColor: theme.border.subtle,
    borderTopLeftRadius: theme.radius.md,
    borderTopRightRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  notesInput: {
    fontSize: 15,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderBottomColor: theme.border.subtle,
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  urlInput: {
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    borderTopWidth: 0,
    borderBottomLeftRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: theme.text.primary,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
  },
  actionButtonActive: {
    borderColor: theme.border.success,
    backgroundColor: theme.surface.successSoft,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextCity: {
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
  },
  actionButtonText: {
    fontSize: 15,
    color: theme.text.primary,
  },
  actionButtonHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonHintText: {
    fontSize: 15,
    color: theme.text.placeholder,
  },
  actionButtonHintTextCity: {
    fontSize: theme.typography.control.fontSize,
  },
  citySelect: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  citySelectText: {
    flex: 1,
    paddingRight: 10,
    fontSize: theme.typography.control.fontSize,
    fontWeight: 'bold',
  },
  citySelectIcon: {
    transform: [{ rotate: '90deg' }],
    width: 7,
    height: 12,
    marginLeft: 'auto',
    marginRight: 5,
  },
  actionButtonHintIcon: {
    marginRight: 9,
  },
  actionButtonHintIconCalendar: {
    marginLeft: 1,
    marginRight: 9,
  },
  actionButtonHintIconRepeat: {
    marginLeft: 1,
    marginRight: 8,
  },
  singleActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border.field,
    backgroundColor: theme.surface.field,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.control.fontSize,
    fontWeight: '600',
  },
  notificationTime: {},
  localTimeBox: {
    borderTopWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  localTimeLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  localTime: {
    fontSize: 14,
    color: theme.text.primary,
  },
  notificationDate: {},
  localDateBox: {
    borderTopWidth: 1,
    borderColor: theme.border.subtle,
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  localDateLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  localDate: {
    fontSize: 14,
    color: theme.text.primary,
  },
  localDateShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: theme.radius.pillSm,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  localDateShiftYear: {
    backgroundColor: theme.text.warning,
  },
  localTimeDayShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: theme.radius.pillSm,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  repeatPickerList: {
    gap: theme.spacing.xxs,
    width: 295,
    paddingHorizontal: theme.spacing.screenX,
    paddingBottom: theme.spacing.screenX,
  },
  repeatPickerItem: {
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
  },
  repeatPickerItemActive: {
    backgroundColor: theme.surface.fieldSelected,
  },
  repeatPickerItemText: {
    color: theme.text.primary,
    fontSize: 15,
  },
  repeatPickerItemTextActive: {
    fontWeight: 'bold',
  },
  repeatPickerSecondary: {
    borderTopLeftRadius: theme.radius.sm,
    borderTopRightRadius: theme.radius.sm,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
  },
  weekdaysWrap: {},
  weekdayChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderColor: theme.border.muted,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekdayChipLast: {
    borderBottomWidth: 0,
  },
  weekdayChipActive: {},
  weekdayChipText: {
    color: theme.text.primary,
    fontSize: 15,
  },
  weekdayChipTextActive: {
    fontWeight: 'bold',
  },
  weekdayChipIcon: {
    width: 10,
    height: 10,
    marginLeft: 'auto',
    marginRight: 5,
  },
  dayShiftText: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: theme.radius.pillSm,
    lineHeight: 13,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 7,
  },
  clearDateButton: {
    width: 20,
    height: 20,
    marginLeft: 'auto',
    marginRight: 1,
    marginBlock: -1,
  },
  timePicker: {
    height: 140,
  },
  timePickerLocalTimeBox: {
    paddingHorizontal: theme.spacing.screenX,
    paddingVertical: theme.spacing.screenX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timePickerLocalTimeLabel: {
    fontSize: 14,
    color: theme.text.placeholder,
  },
  timePickerLocalTime: {
    fontSize: 14,
    color: theme.text.primary,
  },
  timePickerDayShiftText: {
    fontSize: 11,
    paddingHorizontal: 9,
    height: 18,
    borderRadius: theme.radius.pillMd,
    lineHeight: 17,
    backgroundColor: theme.surface.button.primary,
    color: theme.text.onLight,
    marginLeft: 'auto',
  },
  datePicker: {
    height: 140,
  },
  label: {
    color: theme.text.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  cityPickerList: {
    maxHeight: '100%',
    padding: theme.spacing.screenX,
    gap: 6,
  },
  cityPickerItem: {
    borderRadius: theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.surface.fieldStrong,
    marginBottom: 6,
  },
  cityPickerItemActive: {
    backgroundColor: theme.surface.fieldSelected,
  },
  cityPickerItemLast: {
    marginBottom: 0,
  },
  cityPickerItemText: {
    color: theme.text.primary,
    fontSize: theme.typography.control.fontSize,
    fontWeight: '600',
  },
  cityPickerItemHint: {
    color: theme.text.placeholder,
    fontSize: 12,
  },
  });
}
