import { useEffect, useMemo, useState } from 'react';
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
import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';

import IconClock from '@/assets/images/icon--clock-2--outlined.svg';
import IconCalendar from '@/assets/images/icon--calendar-2--outlined.svg';
import IconRepeat from '@/assets/images/icon--repeat-1.svg';

import IconDelete from '@/assets/images/icon--x-2--outlined.svg';

import IconArrow from '@/assets/images/icon--arrow-1.svg';

const DATE_SHIFT_LABELS = {
  previousDay: 'Previous day',
  nextDay: 'Next day',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
} as const;

const REPEAT_LABELS = {
  todayOnly: 'Today only',
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
  chooseRepeat: 'Repeat...',
  chooseSpecificWeekdays: 'Choose specific weekdays',
  weekdaysNotSelected: 'Not selected',
  weekdays: {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  } as const,
} as const;

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
  cityOptions?: Array<{ id: number; label: string; hint?: string; timezone: string }>;
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
  const insets = useSafeAreaInsets();
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

  const formatDateLabel = (date: Date) => {
    const currentYear = new Date().getFullYear();
    const includeYear = date.getFullYear() !== currentYear;
    const parts = new Intl.DateTimeFormat('en-GB', {
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
  };

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
  const getPreviewInfo = (timezone: string, hour: number, minute: number) => {
    const now = new Date();
    let triggerDate: Date;
    let cityYear: number;
    let cityMonth: number;
    let cityDay: number;

    if (hasDate) {
      cityYear = notificationDate.getFullYear();
      cityMonth = notificationDate.getMonth() + 1;
      cityDay = notificationDate.getDate();
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

    const dateText = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(triggerDate);
    const localTimeText = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
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
      dateText,
      localTimeText,
      localDateText: localStamp !== cityStamp ? localDateText : '',
      monthOrYearShiftText,
      dayShiftText,
    };
  };

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
    setNotificationLabel(source?.label || source?.notes || '');
    setNotificationNotes(source?.label ? (source.notes || '') : '');
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
  }, [visible, initialNotification]);

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
    if (isSaving) return;

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

  const selectedTimeLabel = `${notificationTime.getHours().toString().padStart(2, '0')}:${notificationTime.getMinutes().toString().padStart(2, '0')}`;
  const selectedDateLabel = formatDateLabel(notificationDate);

  const selectedCityOption = cityOptions?.find((city) => city.id === selectedCityId) || null;

  const repeatLabel = (() => {
    if (weekdays.length > 0) {
      return weekdays
        .slice()
        .sort((a, b) => a - b)
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

  const weekdaysLabel = weekdays.length > 0
    ? weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => REPEAT_LABELS.weekdays[d as keyof typeof REPEAT_LABELS.weekdays])
      .join(', ')
    : REPEAT_LABELS.weekdaysNotSelected;

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
      return 'Choose City';
    }

    if (activePicker === 'time') {
      return 'Choose Time';
    }

    if (activePicker === 'date') {
      return 'Choose Date';
    }

    if (activePicker === 'weekdays') {
      return 'Choose Weekdays';
    }

    return 'Choose Repeat';
  })();
  const modalTitle = (() => {
    if (mode === 'edit') {
      return 'Edit Notification';
    }

    if (citySelectionMode === 'locked') {
      return 'Add Notification';
    }

    return 'New Notification';
  })();

  const localPreviewInfo = useMemo(() => {
    if (!isTimeSelected) {
      return { dateText: 'Local time will appear after you choose a time', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    if (!effectiveTimezone) {
      return { dateText: 'Local time will appear after you choose a city', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, notificationTime.getHours(), notificationTime.getMinutes());
  }, [effectiveTimezone, isTimeSelected, notificationTime, hasDate, notificationDate]);

  const timePickerLocalPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { dateText: 'Local time will appear after you choose a city', localTimeText: '', localDateText: '', monthOrYearShiftText: '', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, pickerDraftTime.getHours(), pickerDraftTime.getMinutes());
  }, [effectiveTimezone, pickerDraftTime, hasDate, notificationDate]);

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
        source={require('@/assets/images/bg--main-1.jpg')}
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
                  <IconCancelOutlined fill="white" />
                </Pressable>

                <View>
                  <Text style={styles.title}>{modalTitle}</Text>
                </View>

                <Pressable style={[styles.headerButton, !canSave && styles.headerButtonDisabled]} onPress={handleSave} disabled={isSaving || !canSave}>
                  <IconConfirmOutlined fill="white" />
                </Pressable>
              </View>

              <View style={styles.content}>
                {canSelectCity && (
                  <Pressable style={[styles.actionButton, styles.citySelect]} onPress={openCityPicker}>
                    {selectedCityOption?.label ? (
                      <Text style={[styles.actionButtonText, styles.citySelectText]}>{selectedCityOption?.label}</Text>
                    ) : (
                      <Text style={[styles.actionButtonHintText, styles.actionButtonHintTextCity]}>Choose City...</Text>
                    )}
                    <IconArrow style={styles.citySelectIcon} fill='#fff' />
                  </Pressable>
                )}

                {!canSelectCity && citySelectionMode === 'locked' && !!cityName && (
                  <View style={styles.cityTitle}>
                    <Text style={styles.cityTitleText}>{cityName}</Text>
                  </View>
                )}

                <TextInput
                  style={styles.labelInput}
                  placeholder="Title..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={notificationLabel}
                  onChangeText={setNotificationLabel}
                  multiline
                />

                <TextInput
                  style={styles.notesInput}
                  placeholder="Notes..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={notificationNotes}
                  onChangeText={setNotificationNotes}
                  multiline
                />

                <TextInput
                  style={styles.urlInput}
                  placeholder="URL..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
                        <IconClock style={styles.actionButtonHintIcon} fill="rgba(255, 255, 255, 1)" />
                        <Text style={styles.actionButtonText}>{selectedTimeLabel}</Text>
                      </View>
                      {selectedCityOption && (
                        <View style={styles.localTimeBox}>
                          <Text style={styles.localTimeLabel}>Your Time:</Text>
                          <Text style={styles.localTime}>{localPreviewInfo.localTimeText}</Text>
                          {!!localPreviewInfo.dayShiftText && (
                            <Text style={styles.localTimeDayShift}>{localPreviewInfo.dayShiftText}</Text>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconClock style={styles.actionButtonHintIcon} fill="rgba(255, 255, 255, 1)" />
                      <Text style={styles.actionButtonHintText}>Time...</Text>
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
                        <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill="rgba(255, 255, 255, 1)" />
                        <Text style={styles.actionButtonText}>{selectedDateLabel}</Text>

                        <Pressable style={styles.clearDateButton} onPress={() => setHasDate(false)}>
                          <IconDelete fill="rgba(255, 255, 204, 1)" />
                        </Pressable>
                      </View>
                      {!!localPreviewInfo.localDateText && (
                        <View style={styles.localDateBox}>
                          <Text style={styles.localDateLabel}>Your Date:</Text>
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
                      <IconCalendar style={[styles.actionButtonHintIcon, styles.actionButtonHintIconCalendar]} fill="rgba(255, 255, 255, 1)" />
                      <Text style={styles.actionButtonHintText}>Date...</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={styles.singleActionButton} onPress={openRepeatPicker}>
                  {repeatLabel ? (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill="rgba(255, 255, 255, 1)" />
                      <Text style={styles.actionButtonText}>{repeatLabel}</Text>
                      <Pressable style={styles.clearDateButton} onPress={clearRepeat}>
                        <IconDelete fill="rgba(255, 255, 204, 1)" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.actionButtonHint}>
                      <IconRepeat style={[styles.actionButtonHintIcon, styles.actionButtonHintIconRepeat]} fill="rgba(255, 255, 255, 1)" />
                      <Text style={styles.actionButtonHintText}>{REPEAT_LABELS.chooseRepeat}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>

      <Modal visible={isPickerOpen} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.pickerOverlay} onPress={closePicker}>
          <Pressable style={[styles.pickerCard, isCityPicker && styles.pickerCardCity]} onPress={() => undefined}>
            <Text style={styles.pickerTitle}>{pickerTitle}</Text>

            {isCityPicker && cityOptions && (
              <ScrollView style={styles.cityPickerList}>
                {cityOptions.map((city) => {
                  const selected = pickerDraftCityId === city.id;
                  return (
                    <Pressable
                      key={`city-picker-${city.id}`}
                      style={[styles.cityPickerItem, selected && styles.cityPickerItemActive]}
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
                  is24Hour={true}
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.timePicker}
                  textColor="#fff"
                />
                <View style={styles.localPreviewBox}>
                  <Text style={styles.localPreviewLabel}>Your local time will be:</Text>
                  <Text style={styles.localPreviewValue}>{timePickerLocalPreviewInfo.dateText}</Text>
                  {!!timePickerLocalPreviewInfo.dayShiftText && (
                    <Text style={styles.dayShiftText}>{timePickerLocalPreviewInfo.dayShiftText}</Text>
                  )}
                </View>
              </>
            )}

            {activePicker === 'date' && (
              <DateTimePicker
                value={pickerDraftDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
                textColor="#fff"
              />
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
                  <Text style={styles.repeatPickerItemText}>{REPEAT_LABELS.todayOnly}</Text>
                </Pressable>
                <Pressable
                  style={[styles.repeatPickerItem, pickerDraftRepeat === 'daily' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
                  onPress={() => {
                    setPickerDraftRepeat('daily');
                    setPickerDraftWeekdays([]);
                  }}
                >
                  <Text style={styles.repeatPickerItemText}>{REPEAT_LABELS.daily}</Text>
                </Pressable>
                <Pressable
                  style={[styles.repeatPickerItem, pickerDraftRepeat === 'weekly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
                  onPress={() => {
                    setPickerDraftRepeat('weekly');
                    setPickerDraftWeekdays([]);
                  }}
                >
                  <Text style={styles.repeatPickerItemText}>{REPEAT_LABELS.weekly}</Text>
                </Pressable>
                <Pressable
                  style={[styles.repeatPickerItem, pickerDraftRepeat === 'monthly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
                  onPress={() => {
                    setPickerDraftRepeat('monthly');
                    setPickerDraftWeekdays([]);
                  }}
                >
                  <Text style={styles.repeatPickerItemText}>{REPEAT_LABELS.monthly}</Text>
                </Pressable>
                <Pressable
                  style={[styles.repeatPickerItem, pickerDraftRepeat === 'yearly' && pickerDraftWeekdays.length === 0 && styles.repeatPickerItemActive]}
                  onPress={() => {
                    setPickerDraftRepeat('yearly');
                    setPickerDraftWeekdays([]);
                  }}
                >
                  <Text style={styles.repeatPickerItemText}>{REPEAT_LABELS.yearly}</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.repeatPickerSecondary,
                    pickerDraftWeekdays.length > 0 && styles.repeatPickerItemActive
                  ]}
                  onPress={openWeekdaysPicker}
                >
                  <Text style={styles.repeatPickerSecondaryText}>{REPEAT_LABELS.chooseSpecificWeekdays}</Text>
                  <Text style={styles.repeatPickerSecondaryHint}>{weekdaysLabel}</Text>
                </Pressable>
              </View>
            )}

            {activePicker === 'weekdays' && (
              <View style={styles.repeatPickerList}>
                <View style={styles.weekdaysWrap}>
                  {[
                    { label: REPEAT_LABELS.weekdays[1], value: 1 },
                    { label: REPEAT_LABELS.weekdays[2], value: 2 },
                    { label: REPEAT_LABELS.weekdays[3], value: 3 },
                    { label: REPEAT_LABELS.weekdays[4], value: 4 },
                    { label: REPEAT_LABELS.weekdays[5], value: 5 },
                    { label: REPEAT_LABELS.weekdays[6], value: 6 },
                    { label: REPEAT_LABELS.weekdays[0], value: 0 },
                  ].map((day) => {
                    const selected = pickerDraftWeekdays.includes(day.value);
                    return (
                      <Pressable
                        key={`weekday-${day.value}`}
                        style={[styles.weekdayChip, selected && styles.weekdayChipActive]}
                        onPress={() => {
                          setPickerDraftWeekdays((prev) =>
                            prev.includes(day.value)
                              ? prev.filter((d) => d !== day.value)
                              : [...prev, day.value]
                          );
                        }}
                      >
                        <Text style={[styles.weekdayChipText, selected && styles.weekdayChipTextActive]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {activePicker !== 'city' && (
              <View style={styles.pickerButtonsRow}>
                <Pressable style={styles.pickerSecondaryButton} onPress={closePicker}>
                  <Text style={styles.pickerSecondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.pickerPrimaryButton} onPress={applyPicker}>
                  <Text style={styles.pickerPrimaryButtonText}>Apply</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(62, 63, 86, 0.4)',
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
    paddingTop: 20,
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  headerButton: {
    width: 30,
    height: 30,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    paddingHorizontal: 20,
  },
  cityTitle: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  cityTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  labelInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#ffffff',
  },
  notesInput: {
    fontSize: 15,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: '#ffffff',
  },
  urlInput: {
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 11,
    color: '#ffffff',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  actionButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonTextCity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonText: {
    fontSize: 15,
    color: '#fff',
  },
  actionButtonHint: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionButtonHintText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionButtonHintTextCity: {
    fontSize: 16,
  },
  citySelect: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  citySelectText: {
    flex: 1,
    paddingRight: 10,
    fontSize: 16,
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  notificationTime: {},
  localTimeBox: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  localTimeLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  localTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 1)',
  },
  notificationDate: {},
  localDateBox: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginTop: 11,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  localDateLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  localDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 1)',
  },
  localDateShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: 7,
    lineHeight: 13,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    color: 'rgba(63, 68, 86, 0.9)',
    marginLeft: 7,
  },
  localDateShiftYear: {
    backgroundColor: 'rgba(255, 255, 204, 1)',
  },
  localTimeDayShift: {
    fontSize: 11,
    paddingHorizontal: 7,
    height: 14,
    borderRadius: 7,
    lineHeight: 13,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    color: 'rgba(63, 68, 86, 0.9)',
    marginLeft: 7,
  },
  repeatPickerList: {
    gap: 8,
    marginBottom: 10,
  },
  repeatPickerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  repeatPickerItemActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  repeatPickerItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  repeatPickerSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  repeatPickerSecondaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  repeatPickerSecondaryHint: {
    color: '#9a9bb2',
    fontSize: 12,
    marginTop: 3,
  },
  weekdaysWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  weekdayChip: {
    minWidth: 42,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  weekdayChipActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.18)',
  },
  weekdayChipText: {
    color: '#d7d8ee',
    fontSize: 12,
    fontWeight: '600',
  },
  weekdayChipTextActive: {
    color: '#fff',
  },
  localPreviewBox: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  localPreviewLabel: {
    color: '#9a9bb2',
    fontSize: 12,
  },
  localPreviewValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dayShiftText: {
    color: '#ffcf99',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  clearDateButton: {
    width: 20,
    height: 20,
    marginLeft: 'auto',
    marginRight: 1,
    marginBlock: -1,
  },
  datePicker: {
    height: 140,
    marginBottom: 12,
  },
  timePicker: {
    height: 140,
    marginBottom: 12,
  },
  label: {
    color: '#9a9bb2',
    fontSize: 14,
    marginBottom: 8,
  },
  textAreaInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  metaInput: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: 'rgba(62, 63, 86, 0.98)',
    borderRadius: 14,
    padding: 16,
  },
  pickerCardCity: {
    maxHeight: '90%',
    width: '100%',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  cityPickerList: {
    maxHeight: '100%',
    marginBottom: 12,
  },
  cityPickerItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  cityPickerItemActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  cityPickerItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cityPickerItemHint: {
    color: '#9a9bb2',
    fontSize: 12,
    marginTop: 2,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerSecondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerSecondaryButtonText: {
    color: '#9a9bb2',
    fontSize: 15,
    fontWeight: '500',
  },
  pickerPrimaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerPrimaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
