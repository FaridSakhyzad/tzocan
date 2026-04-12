import { useState, useEffect } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from "expo-sqlite";

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconCancelFilled from '@/assets/images/icon--x-1--filled.svg';

import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';
import IconConfirmFilled from '@/assets/images/icon--checkmark-1--filled.svg';

import { useDatabase } from '@/hooks/use-database';

export type CityRow = {
  id: number;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  lat: number;
  lon: number;
  pop: number;
};

async function searchCitiesInDb(db: SQLite.SQLiteDatabase, prefix: string): Promise<CityRow[]> {
  const p = prefix + "%";

  return db.getAllAsync<CityRow>(
    `SELECT id, name, country, admin1, tz, lat, lon, pop
     FROM cities
     WHERE name_norm LIKE ?
     ORDER BY pop DESC
     LIMIT 30`,
    [p]
  );
}

type AddCityModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (city: CityRow) => void;
};

export function AddCityModal({ visible, onClose, onSave }: AddCityModalProps) {
  const insets = useSafeAreaInsets();
  const { db } = useDatabase();
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityRow[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCities([]);
      setSelectedCity(null);
      return;
    }

    if (query.length <= 1) {
      setCities([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!db) {
        return;
      }

      setIsLoading(true);

      try {
        const results = await searchCitiesInDb(db as SQLite.SQLiteDatabase, query);
        setCities(results);
      } catch (error) {
        console.error('Failed to search cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, visible, db]);

  const handleCityPress = (city: CityRow) => {
    setSelectedCity(city);
  };

  const handleSave = () => {
    if (!selectedCity) {
      return;
    }

    onSave(selectedCity);
    setQuery('');
    setCities([]);
    setSelectedCity(null);
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
        <View style={styles.modalBg}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View
              style={[
                styles.safeArea,
                {
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom,
                },
              ]}
            >
              <View style={styles.modalContent}>
                <View style={styles.header}>
                  <Pressable style={styles.cancelButton} onPress={onClose}>
                    <IconCancelOutlined
                      fill="white"
                    />
                  </Pressable>

                  <Text style={styles.title}>Add City</Text>

                  <Pressable
                    style={[styles.confirmButton, !selectedCity && styles.confirmButtonDisabled]}
                    onPress={handleSave}
                    disabled={!selectedCity}
                  >
                    <IconConfirmOutlined
                      fill="white"
                    />
                  </Pressable>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Enter City Name..."
                  placeholderTextColor='rgba(255, 255, 255, 0.5)'
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />

                {isLoading && <Text style={styles.loading}>Loading...</Text>}

                <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
                  {cities.map((city) => (
                    <Pressable
                      key={`${city.id}-${city.name}-${city.country}`}
                      onPress={() => handleCityPress(city)}
                      style={({ pressed }) => [
                        styles.cityItem,
                        selectedCity?.id === city.id && styles.cityItemSelected,
                        pressed && styles.cityItemPressed,
                      ]}
                    >
                      <Text style={styles.cityText}>{city.name}, {city.country}</Text>
                      <Text style={styles.cityTimezone}>{city.tz}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
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
  safeArea: {
    flex: 1,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(62, 63, 86, 0.4)',
  },
  modalContent: {
    minHeight: '100%',
    maxHeight: '100%',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    width: 30,
    height: 30,
  },
  confirmButton: {
    width: 30,
    height: 30,
  },
  confirmButtonDisabled: {
    opacity: 0.5
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginLeft: 20,
    marginRight: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
  },
  loading: {
    color: '#9a9bb2',
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 6,
  },
  cityItemPressed: {
    backgroundColor: 'rgba(62, 63, 86, 0.9)',
  },
  cityItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  cityText: {
    fontSize: 16,
    lineHeight: 16,
    color: '#fff',
    marginBottom: 1,
  },
  cityTimezone: {
    fontSize: 13,
    lineHeight: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
