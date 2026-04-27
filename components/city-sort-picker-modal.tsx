import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NotificationPickerModal } from '@/components/notification-picker-modal';
import { useAppTheme } from '@/contexts/app-theme-context';
import { CityOrderMode } from '@/contexts/notifications-sort-context';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';

function getNextDirectionalMode(currentMode: 'none' | 'asc' | 'desc'): 'asc' | 'desc' {
  if (currentMode === 'none') {
    return 'asc';
  }

  if (currentMode === 'asc') {
    return 'desc';
  }

  return 'asc';
}

function getCityOrderDirection(orderMode: CityOrderMode) {
  if (orderMode.endsWith('-asc')) {
    return 'asc' as const;
  }

  if (orderMode.endsWith('-desc')) {
    return 'desc' as const;
  }

  return 'none' as const;
}

function getDirectionalLabel(baseLabel: string, mode: 'none' | 'asc' | 'desc') {
  if (mode === 'asc') {
    return `${baseLabel} ↑`;
  }

  if (mode === 'desc') {
    return `${baseLabel} ↓`;
  }

  return baseLabel;
}

type Props = {
  visible: boolean;
  cityOrder: CityOrderMode;
  onChangeCityOrder: (value: CityOrderMode) => void;
  onClose: () => void;
  onApply: () => void;
};

export function CitySortPickerModal({
  visible,
  cityOrder,
  onChangeCityOrder,
  onClose,
  onApply,
}: Props) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const handleToggleCityOrder = (sortFamily: 'name' | 'timezone') => {
    const currentDirection = sortFamily === 'name'
      ? getCityOrderDirection(cityOrder.startsWith('name') ? cityOrder : 'none')
      : getCityOrderDirection(cityOrder.startsWith('timezone') ? cityOrder : 'none');
    const nextDirection = getNextDirectionalMode(currentDirection);

    onChangeCityOrder(`${sortFamily}-${nextDirection}` as CityOrderMode);
  };

  return (
    <NotificationPickerModal
      visible={visible}
      title={t('cities.sortTitle')}
      onClose={onClose}
      onApply={onApply}
    >
      <View style={styles.content}>
        <View style={styles.section}>
          <Pressable
            onPress={() => onChangeCityOrder('none')}
            style={[styles.item, cityOrder === 'none' && styles.itemActive]}
          >
            <Text style={[styles.itemText, cityOrder === 'none' && styles.itemTextActive]}>
              {t('notifications.customCityOrder')}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => handleToggleCityOrder('name')}
          style={[styles.item, cityOrder.startsWith('name') && styles.itemActive]}
        >
          <Text style={[styles.itemText, cityOrder.startsWith('name') && styles.itemTextActive]}>
            {getDirectionalLabel(
              t('notifications.sortCitiesByName'),
              getCityOrderDirection(cityOrder.startsWith('name') ? cityOrder : 'none')
            )}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleToggleCityOrder('timezone')}
          style={[styles.item, cityOrder.startsWith('timezone') && styles.itemActive]}
        >
          <Text style={[styles.itemText, cityOrder.startsWith('timezone') && styles.itemTextActive]}>
            {getDirectionalLabel(
              t('notifications.sortCitiesByTimezone'),
              getCityOrderDirection(cityOrder.startsWith('timezone') ? cityOrder : 'none')
            )}
          </Text>
        </Pressable>
      </View>
    </NotificationPickerModal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 14,
    },
    section: {
      flexDirection: 'column',
    },
    item: {
      minWidth: 260,
      minHeight: 30,
      borderRadius: 15,
      paddingHorizontal: 14,
      backgroundColor: 'rgba(62, 63, 86, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemActive: {
      backgroundColor: 'rgba(62, 63, 86, 0.3)',
    },
    itemText: {
      color: theme.text.primary,
      fontSize: 14,
    },
    itemTextActive: {
      fontWeight: 'bold',
    },
  });
}
