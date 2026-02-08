import { useState, useEffect } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useDatabase } from '@/hooks/use-database';
import * as SQLite from "expo-sqlite";

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
  onSelectCity: (city: CityRow) => void;
};

export function AddCityModal({ visible, onClose, onSelectCity }: AddCityModalProps) {
  const { db } = useDatabase();
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setCities([]);
      return;
    }

    if (query.length <= 1) {
      setCities([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!db) return;

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

    return () => clearTimeout(timeoutId);
  }, [query, visible, db]);

  const handleCityPress = (city: CityRow) => {
    onSelectCity(city);
    setQuery('');
    setCities([]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Add City</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Search for a city..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />

          {isLoading && <Text style={styles.loading}>Loading...</Text>}

          <View style={styles.resultsList}>
            {cities.map((city) => (
              <Pressable
                key={`${city.id}-${city.name}-${city.country}`}
                onPress={() => handleCityPress(city)}
                style={({ pressed }) => [
                  styles.cityItem,
                  pressed && styles.cityItemPressed,
                ]}
              >
                <Text style={styles.cityText}>{city.name}, {city.country}</Text>
                <Text style={styles.cityTimezone}>{city.tz}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '60%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  loading: {
    color: '#666',
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cityItemPressed: {
    backgroundColor: '#f0f0f0',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cityTimezone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
