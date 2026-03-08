import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelectedCities, CityNotification } from '@/contexts/selected-cities-context';
import { NotificationModal, NotificationFormValues } from '@/components/notification-modal';

function getNotificationScheduleLabel(notification: CityNotification) {
  const repeat = notification.repeat || (notification.isDaily ? 'daily' : 'none');
  const weekdayLabel = (d: number) => {
    if (d === 0) return 'Sun';
    if (d === 1) return 'Mon';
    if (d === 2) return 'Tue';
    if (d === 3) return 'Wed';
    if (d === 4) return 'Thu';
    if (d === 5) return 'Fri';
    return 'Sat';
  };

  if (repeat === 'daily') return 'Daily';
  if (repeat === 'weekly') {
    const days = (notification.weekdays || []).slice().sort((a, b) => a - b).map(weekdayLabel);
    return days.length > 0 ? `Weekly: ${days.join(', ')}` : 'Weekly';
  }
  if (repeat === 'monthly') return 'Monthly';
  if (repeat === 'yearly') return 'Yearly';

  if (notification.day && notification.month && notification.year) {
    return `${notification.day.toString().padStart(2, '0')}/${notification.month.toString().padStart(2, '0')}/${notification.year}`;
  }

  return 'Today';
}

export default function EditCity() {
  const router = useRouter();
  const { cityId } = useLocalSearchParams<{ cityId: string }>();
  const { selectedCities, updateCityName, addNotification, updateNotification, removeNotification, toggleNotification } = useSelectedCities();

  const city = selectedCities.find(c => c.id === Number(cityId));

  const [editName, setEditName] = useState(city?.customName || '');
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [editingNotification, setEditingNotification] = useState<CityNotification | null>(null);

  useEffect(() => {
    if (city) {
      setEditName(city.customName || '');
    }
  }, [city?.customName]);

  if (!city) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.errorText}>City not found</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleNameChange = (text: string) => {
    setEditName(text);
    updateCityName(city.id, text.trim());
  };

  const handleSaveNotification = async (values: NotificationFormValues) => {
    if (editingNotification) {
      await updateNotification(
        city.id,
        editingNotification.id,
        values.hour,
        values.minute,
        values.year,
        values.month,
        values.day,
        values.notes,
        values.url,
        values.repeat,
        values.weekdays
      );
      return;
    }

    await addNotification(
      city.id,
      values.hour,
      values.minute,
      values.year,
      values.month,
      values.day,
      values.notes,
      values.url,
      values.repeat,
      values.weekdays
    );
  };

  const handleOpenAddNotificationModal = () => {
    setEditingNotification(null);
    setIsNotificationModalVisible(true);
  };

  const handleOpenEditNotificationModal = (notification: CityNotification) => {
    setEditingNotification(notification);
    setIsNotificationModalVisible(true);
  };

  const handleRemoveNotification = async (notificationId: string) => {
    await removeNotification(city.id, notificationId);
  };

  const handleToggleNotification = async (notificationId: string, enabled: boolean) => {
    await toggleNotification(city.id, notificationId, enabled);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView style={styles.container}>
        <Text style={styles.label}>Custom Name</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={city.name || 'Enter custom name...'}
            placeholderTextColor="#7a7b92"
            value={editName}
            onChangeText={handleNameChange}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {editName.length > 0 && (
            <Pressable style={styles.clearButton} onPress={() => handleNameChange('')}>
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.hint}>
          Leave empty to use original name: {city.name}
        </Text>

        <View style={styles.notificationsSection}>
          <Text style={styles.notificationsSectionTitle}>Notifications</Text>
          <Text style={styles.notificationsSectionHint}>
            Get notified when it&apos;s a specific time in {city.customName || city.name}
          </Text>

          {city.notifications && city.notifications.length > 0 && (
            <View style={styles.notificationsList}>
              {city.notifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <View style={styles.notificationDateTime}>
                    <Text style={styles.notificationDate}>
                      {getNotificationScheduleLabel(notification)}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {notification.hour.toString().padStart(2, '0')}:{notification.minute.toString().padStart(2, '0')}
                    </Text>
                    {!!notification.notes && (
                      <Text style={styles.notificationNotes}>{notification.notes}</Text>
                    )}
                    {!!notification.url && (
                      <Text style={styles.notificationUrl}>{notification.url}</Text>
                    )}
                  </View>
                  <View style={styles.notificationActions}>
                    <Switch
                      value={notification.enabled}
                      onValueChange={(value) => handleToggleNotification(notification.id, value)}
                      trackColor={{ false: '#3e3f56', true: '#4CAF50' }}
                      thumbColor={notification.enabled ? '#fff' : '#9a9bb2'}
                    />
                    <Pressable
                      onPress={() => handleOpenEditNotificationModal(notification)}
                      style={styles.editNotificationButton}
                    >
                      <Text style={styles.editNotificationText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveNotification(notification.id)}
                      style={styles.deleteNotificationButton}
                    >
                      <Text style={styles.deleteNotificationText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Pressable style={styles.showPickerButton} onPress={handleOpenAddNotificationModal}>
            <Text style={styles.showPickerButtonText}>+ Add Notification</Text>
          </Pressable>
        </View>
      </ScrollView>

      <NotificationModal
        visible={isNotificationModalVisible}
        cityName={city.customName || city.name}
        cityTimezone={city.tz}
        mode={editingNotification ? 'edit' : 'add'}
        initialNotification={editingNotification}
        onClose={() => {
          setIsNotificationModalVisible(false);
          setEditingNotification(null);
        }}
        onSave={handleSaveNotification}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#9a9bb2',
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#5a5b73',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9a9bb2',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#9a9bb2',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#7a7b92',
    marginTop: 8,
    marginBottom: 24,
  },
  notificationsSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  notificationsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  notificationsSectionHint: {
    fontSize: 12,
    color: '#7a7b92',
    marginBottom: 16,
  },
  notificationsList: {
    marginBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationDateTime: {
    flexDirection: 'column',
  },
  notificationDate: {
    fontSize: 14,
    color: '#9a9bb2',
  },
  notificationTime: {
    fontSize: 24,
    fontWeight: '300',
    color: '#fff',
  },
  notificationNotes: {
    marginTop: 4,
    fontSize: 13,
    color: '#d8d9f0',
  },
  notificationUrl: {
    marginTop: 2,
    fontSize: 13,
    color: '#8fc7ff',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editNotificationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 6,
  },
  editNotificationText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteNotificationButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderRadius: 6,
  },
  deleteNotificationText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  showPickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  showPickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
