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
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CityNotification } from '@/contexts/selected-cities-context';

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
  cityOptions?: Array<{ id: number; label: string; hint?: string; timezone: string }>;
  selectedCityId?: number | null;
  onSelectCityId?: (cityId: number) => void;
  initialNotification?: CityNotification | null;
  onClose: () => void;
  onSave: (values: NotificationFormValues) => Promise<void>;
};

export function NotificationModal({
  visible,
  cityName,
  cityTimezone,
  mode,
  cityOptions,
  selectedCityId,
  onSelectCityId,
  initialNotification,
  onClose,
  onSave,
}: NotificationModalProps) {
  const [notificationDate, setNotificationDate] = useState(new Date());
  const [notificationTime, setNotificationTime] = useState(() => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
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

    const localYear = triggerDate.getFullYear();
    const localMonth = triggerDate.getMonth() + 1;
    const localDay = triggerDate.getDate();
    const cityStamp = Date.UTC(cityYear, cityMonth - 1, cityDay);
    const localStamp = Date.UTC(localYear, localMonth - 1, localDay);
    const dayDiff = Math.round((localStamp - cityStamp) / 86400000);

    const dayShiftText = dayDiff < 0 ? 'предыдущий день' : dayDiff > 0 ? 'следующий день' : '';

    return { dateText, dayShiftText };
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
      time.setHours(12, 0, 0, 0);
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
    setPickerDraftTime(time);
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

      await onSave(values);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTimeLabel = `${notificationTime.getHours().toString().padStart(2, '0')}:${notificationTime.getMinutes().toString().padStart(2, '0')}`;
  const selectedDateLabel = hasDate
    ? `${notificationDate.getDate().toString().padStart(2, '0')}/${(notificationDate.getMonth() + 1).toString().padStart(2, '0')}/${notificationDate.getFullYear()}`
    : 'Не выбрана (сегодня)';
  const selectedCityOption = cityOptions?.find((city) => city.id === selectedCityId) || null;
  const repeatLabel =
    repeat === 'none' ? 'Только сегодня'
      : repeat === 'daily' ? 'Каждый день'
        : repeat === 'weekly' ? 'Каждую неделю'
          : repeat === 'monthly' ? 'Каждый месяц'
            : 'Каждый год';
  const weekdaysLabel = weekdays.length > 0
    ? weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => (d === 0 ? 'Вс' : d === 1 ? 'Пн' : d === 2 ? 'Вт' : d === 3 ? 'Ср' : d === 4 ? 'Чт' : d === 5 ? 'Пт' : 'Сб'))
      .join(', ')
    : 'Не выбрано';
  const canSave = mode === 'edit' || !cityOptions || selectedCityId !== null && selectedCityId !== undefined;
  const isPickerOpen = activePicker !== null;
  const effectiveTimezone = selectedCityOption?.timezone || cityTimezone;

  const localPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { dateText: 'Локальное время появится после выбора города', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, notificationTime.getHours(), notificationTime.getMinutes());
  }, [effectiveTimezone, notificationTime, hasDate, notificationDate]);
  const timePickerLocalPreviewInfo = useMemo(() => {
    if (!effectiveTimezone) {
      return { dateText: 'Локальное время появится после выбора города', dayShiftText: '' };
    }

    return getPreviewInfo(effectiveTimezone, pickerDraftTime.getHours(), pickerDraftTime.getMinutes());
  }, [effectiveTimezone, pickerDraftTime, hasDate, notificationDate]);

  const openTimePicker = () => {
    setPickerDraftTime(new Date(notificationTime));
    setActivePicker('time');
  };
  const openCityPicker = () => {
    setPickerDraftCityId(selectedCityId ?? null);
    setActivePicker('city');
  };

  const openDatePicker = () => {
    if (!isTimeSelected) return;
    setPickerDraftDate(new Date(notificationDate));
    setActivePicker('date');
  };
  const openRepeatPicker = () => {
    setPickerDraftRepeat(repeat);
    setPickerDraftWeekdays(weekdays);
    setActivePicker('repeat');
  };
  const openWeekdaysPicker = () => {
    setPickerDraftWeekdays(weekdays.length > 0 ? weekdays : [new Date().getDay()]);
    setActivePicker('weekdays');
  };

  const closePicker = () => {
    setActivePicker(null);
  };

  const applyPicker = () => {
    if (activePicker === 'time') {
      setNotificationTime(pickerDraftTime);
      setIsTimeSelected(true);
    }

    if (activePicker === 'date') {
      setNotificationDate(pickerDraftDate);
      setHasDate(true);
    }

    if (activePicker === 'repeat') {
      setRepeat(pickerDraftRepeat);
    }

    if (activePicker === 'weekdays') {
      setWeekdays(pickerDraftWeekdays.length > 0 ? pickerDraftWeekdays : [new Date().getDay()]);
    }

    if (activePicker === 'city' && onSelectCityId && pickerDraftCityId !== null) {
      onSelectCityId(pickerDraftCityId);
    }

    closePicker();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{mode === 'edit' ? 'Редактировать уведомление' : 'Новое уведомление'}</Text>
                <Text style={styles.subtitle}>{cityName}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Отмена</Text>
              </Pressable>
            </View>

            {mode === 'add' && cityOptions && cityOptions.length > 0 && onSelectCityId && (
              <Pressable style={styles.singleActionButton} onPress={openCityPicker}>
                <Text style={styles.actionButtonText}>Выбрать город</Text>
                <Text style={styles.actionButtonHint}>{selectedCityOption?.label || 'Выберите город'}</Text>
              </Pressable>
            )}

            <View style={styles.actionButtonsRow}>
              <Pressable
                style={[styles.actionButton, activePicker === 'time' && styles.actionButtonActive]}
                onPress={openTimePicker}
              >
                <Text style={styles.actionButtonText}>Выбрать время</Text>
                <Text style={styles.actionButtonHint}>{selectedTimeLabel}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.actionButton,
                  activePicker === 'date' && styles.actionButtonActive,
                  !isTimeSelected && styles.actionButtonDisabled,
                ]}
                onPress={openDatePicker}
                disabled={!isTimeSelected}
              >
                <Text style={styles.actionButtonText}>Выбрать дату</Text>
                <Text style={styles.actionButtonHint}>
                  {isTimeSelected ? selectedDateLabel : 'Сначала выберите время'}
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.singleActionButton} onPress={openRepeatPicker}>
              <Text style={styles.actionButtonText}>Выбрать повторение</Text>
              <Text style={styles.actionButtonHint}>{repeatLabel}</Text>
            </Pressable>

            <View style={styles.localPreviewBox}>
              <Text style={styles.localPreviewLabel}>У вас локально это будет:</Text>
              <Text style={styles.localPreviewValue}>{localPreviewInfo.dateText}</Text>
              {!!localPreviewInfo.dayShiftText && (
                <Text style={styles.dayShiftText}>{localPreviewInfo.dayShiftText}</Text>
              )}
            </View>

            {hasDate && (
              <Pressable style={styles.clearDateButton} onPress={() => setHasDate(false)}>
                <Text style={styles.clearDateButtonText}>Очистить дату</Text>
              </Pressable>
            )}

            <Text style={styles.label}>Label</Text>
            <TextInput
              style={styles.metaInput}
              placeholder="Add a label..."
              placeholderTextColor="#7a7b92"
              value={notificationLabel}
              onChangeText={setNotificationLabel}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.textAreaInput}
              placeholder="Add notes..."
              placeholderTextColor="#7a7b92"
              value={notificationNotes}
              onChangeText={setNotificationNotes}
              multiline
            />

            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.metaInput}
              placeholder="https://example.com"
              placeholderTextColor="#7a7b92"
              value={notificationUrl}
              onChangeText={setNotificationUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Pressable style={[styles.primaryButton, !canSave && styles.primaryButtonDisabled]} onPress={handleSave} disabled={isSaving || !canSave}>
              <Text style={styles.primaryButtonText}>{isSaving ? 'Сохранение...' : mode === 'edit' ? 'Сохранить' : 'Добавить'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={isPickerOpen} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.pickerOverlay} onPress={closePicker}>
          <Pressable style={[styles.pickerCard, activePicker === 'city' && styles.pickerCardCity]} onPress={() => undefined}>
            <Text style={styles.pickerTitle}>
              {activePicker === 'city'
                ? 'Выберите город'
                : activePicker === 'time'
                ? 'Выберите время'
                : activePicker === 'date'
                  ? 'Выберите дату'
                  : activePicker === 'weekdays'
                    ? 'Выберите дни недели'
                    : 'Выберите повторение'}
            </Text>

            {activePicker === 'city' && cityOptions && (
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
                  <Text style={styles.localPreviewLabel}>У вас локально это будет:</Text>
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
                minimumDate={new Date()}
              />
            )}

            {activePicker === 'repeat' && (
              <View style={styles.repeatPickerList}>
                <Pressable style={[styles.repeatPickerItem, pickerDraftRepeat === 'none' && styles.repeatPickerItemActive]} onPress={() => setPickerDraftRepeat('none')}>
                  <Text style={styles.repeatPickerItemText}>Только сегодня</Text>
                </Pressable>
                <Pressable style={[styles.repeatPickerItem, pickerDraftRepeat === 'daily' && styles.repeatPickerItemActive]} onPress={() => setPickerDraftRepeat('daily')}>
                  <Text style={styles.repeatPickerItemText}>Каждый день</Text>
                </Pressable>
                <Pressable style={[styles.repeatPickerItem, pickerDraftRepeat === 'weekly' && styles.repeatPickerItemActive]} onPress={() => setPickerDraftRepeat('weekly')}>
                  <Text style={styles.repeatPickerItemText}>Каждую неделю</Text>
                </Pressable>
                <Pressable style={[styles.repeatPickerItem, pickerDraftRepeat === 'monthly' && styles.repeatPickerItemActive]} onPress={() => setPickerDraftRepeat('monthly')}>
                  <Text style={styles.repeatPickerItemText}>Каждый месяц</Text>
                </Pressable>
                <Pressable style={[styles.repeatPickerItem, pickerDraftRepeat === 'yearly' && styles.repeatPickerItemActive]} onPress={() => setPickerDraftRepeat('yearly')}>
                  <Text style={styles.repeatPickerItemText}>Каждый год</Text>
                </Pressable>
                <Pressable style={styles.repeatPickerSecondary} onPress={openWeekdaysPicker}>
                  <Text style={styles.repeatPickerSecondaryText}>Выбрать дни недели</Text>
                  <Text style={styles.repeatPickerSecondaryHint}>{weekdaysLabel}</Text>
                </Pressable>
              </View>
            )}

            {activePicker === 'weekdays' && (
              <View style={styles.repeatPickerList}>
                <View style={styles.weekdaysWrap}>
                  {[
                    { label: 'Пн', value: 1 },
                    { label: 'Вт', value: 2 },
                    { label: 'Ср', value: 3 },
                    { label: 'Чт', value: 4 },
                    { label: 'Пт', value: 5 },
                    { label: 'Сб', value: 6 },
                    { label: 'Вс', value: 0 },
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
                  <Text style={styles.pickerSecondaryButtonText}>Отмена</Text>
                </Pressable>
                <Pressable style={styles.pickerPrimaryButton} onPress={applyPicker}>
                  <Text style={styles.pickerPrimaryButtonText}>Применить</Text>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(62, 63, 86, 0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '65%',
    maxHeight: '88%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9a9bb2',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#9a9bb2',
    fontSize: 15,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonHint: {
    color: '#9a9bb2',
    marginTop: 4,
    fontSize: 12,
  },
  singleActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
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
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  clearDateButtonText: {
    color: '#ffb4ad',
    fontSize: 13,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
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
