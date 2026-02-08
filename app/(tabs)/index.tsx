import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useSelectedCities, SelectedCity } from '@/contexts/selected-cities-context';
import { useSettings, TimeFormat } from '@/contexts/settings-context';

function getLocalTime(timezone: string, timeFormat: TimeFormat, offsetMinutes: number = 0): string {
  const now = new Date();
  const shiftedTime = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  return shiftedTime.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

function getTimezoneOffset(timezone: string): string {
  const now = new Date();

  // Get time components in target timezone
  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  // Get time components in local timezone
  const localParts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const targetMinutes =
    getPart(targetParts, 'day') * 24 * 60 +
    getPart(targetParts, 'hour') * 60 +
    getPart(targetParts, 'minute');

  const localMinutes =
    getPart(localParts, 'day') * 24 * 60 +
    getPart(localParts, 'hour') * 60 +
    getPart(localParts, 'minute');

  let diffMinutes = targetMinutes - localMinutes;

  // Handle day boundary crossing
  if (diffMinutes > 12 * 60) diffMinutes -= 24 * 60;
  if (diffMinutes < -12 * 60) diffMinutes += 24 * 60;

  if (diffMinutes === 0) return 'same';

  const sign = diffMinutes > 0 ? '+' : '';
  const hours = diffMinutes / 60;

  if (Number.isInteger(hours)) {
    return `${sign}${hours}hrs`;
  }

  const wholeHours = Math.floor(Math.abs(hours));
  const mins = Math.abs(diffMinutes) % 60;
  const prefix = diffMinutes < 0 ? '-' : '+';
  return `${prefix}${wholeHours}:${mins.toString().padStart(2, '0')}`;
}

export default function Index() {
  const {selectedCities, updateCityName, reorderCities, removeCity} = useSelectedCities();
  const {timeFormat, timeOffsetMinutes} = useSettings();
  const [editModalCity, setEditModalCity] = useState<SelectedCity | null>(null);
  const [editName, setEditName] = useState('');
  const [, setTick] = useState(0);

  const swipeableRefs = useRef<Map<number, Swipeable>>(new Map());

  useEffect(() => {
    if (selectedCities.length === 0) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedCities.length]);

  const openEditModal = (city: SelectedCity) => {
    setEditName(city.customName || '');
    setEditModalCity(city);
  };

  const handleSaveName = () => {
    if (editModalCity) {
      updateCityName(editModalCity.id, editName.trim());
    }
    setEditModalCity(null);
    setEditName('');
  };

  const handleDelete = (cityId: number) => {
    swipeableRefs.current.get(cityId)?.close();
    removeCity(cityId);
  };

  const renderRightActions = (city: SelectedCity) => (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-150, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActions}>
        <Pressable
          style={styles.editAction}
          onPress={() => {
            swipeableRefs.current.get(city.id)?.close();
            openEditModal(city);
          }}
        >
          <Animated.Text style={[styles.actionText, {transform: [{scale}]}]}>
            Edit
          </Animated.Text>
        </Pressable>
        <Pressable
          style={styles.deleteAction}
          onPress={() => handleDelete(city.id)}
        >
          <Animated.Text style={[styles.actionText, {transform: [{scale}]}]}>
            Delete
          </Animated.Text>
        </Pressable>
      </View>
    );
  };

  const renderItem = useCallback(({item: city, drag, isActive}: RenderItemParams<SelectedCity>) => (
    <ScaleDecorator>
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeableRefs.current.set(city.id, ref);
          } else {
            swipeableRefs.current.delete(city.id);
          }
        }}
        renderRightActions={renderRightActions(city)}
        overshootRight={false}
        enabled={!isActive}
      >
        <Pressable
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.cityItem,
            isActive && styles.cityItemDragging,
          ]}
        >
          <View style={styles.cityRow}>
            <View style={styles.dragHandle}>
              <Text style={styles.dragHandleText}>☰</Text>
            </View>
            <View style={styles.cityInfo}>
              <Text style={styles.cityName}>{city.customName || city.name}</Text>
              {city.customName && (
                <Text style={styles.cityOriginalName}>{city.name}, {city.country}</Text>
              )}
              {!city.customName && (
                <Text style={styles.cityCountry}>{city.country}</Text>
              )}
              <Text style={styles.cityTimezone}>{city.tz} ({getTimezoneOffset(city.tz)})</Text>
            </View>
            <Text style={styles.cityTime}>{getLocalTime(city.tz, timeFormat, timeOffsetMinutes)}</Text>
          </View>
        </Pressable>
      </Swipeable>
    </ScaleDecorator>
  ), [timeFormat, timeOffsetMinutes]);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaView style={{flex: 1}}>
        <View style={{flex: 1, padding: 16}}>
          <Text style={styles.pageTitle}>Your Cities</Text>

          {selectedCities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cities added yet.</Text>
              <Text style={styles.emptyStateHint}>Tap the + button to add a city.</Text>
            </View>
          ) : (
            <DraggableFlatList
              data={selectedCities}
              onDragEnd={({data}) => reorderCities(data)}
              keyExtractor={(item) => `city-${item.id}`}
              renderItem={renderItem}
            />
          )}

          <Modal
            visible={editModalCity !== null}
            transparent
            animationType="slide"
            onRequestClose={() => setEditModalCity(null)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.editModalContainer}
            >
              <Pressable style={styles.modalOverlay} onPress={() => setEditModalCity(null)} />
              <View style={styles.editModalContent}>
                <View style={styles.editModalHeader}>
                  <Text style={styles.editModalTitle}>Edit City</Text>
                  <Pressable onPress={() => setEditModalCity(null)} style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </View>

                <Text style={styles.editModalLabel}>Custom Name</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder={editModalCity?.name || 'Enter custom name...'}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
                <Text style={styles.editModalHint}>
                  Leave empty to use original name: {editModalCity?.name}
                </Text>

                <Pressable style={styles.saveButton} onPress={handleSaveName}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  cityItem: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
    paddingLeft: 8,
  },
  editAction: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cityItemDragging: {
    backgroundColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  dragHandle: {
    marginRight: 12,
    justifyContent: 'center',
  },
  dragHandleText: {
    fontSize: 18,
    color: '#999',
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 18,
    fontWeight: '500',
  },
  cityCountry: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cityOriginalName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cityTimezone: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  cityTime: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 280,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  editModalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editModalHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
