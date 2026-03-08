import { useState, useEffect } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDatabase } from '@/hooks/use-database';
import { useSelectedCities } from '@/contexts/selected-cities-context';
import * as SQLite from 'expo-sqlite';

type CityRow = {
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
  const p = prefix + '%';

  return db.getAllAsync<CityRow>(
    `SELECT id, name, country, admin1, tz, lat, lon, pop
     FROM cities
     WHERE name_norm LIKE ?
     ORDER BY pop DESC
     LIMIT 30`,
    [p]
  );
}

export default function AddCity() {
  const { db } = useDatabase();
  const { addCity } = useSelectedCities();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<CityRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
  }, [query, db]);

  const handleCityPress = (city: CityRow) => {
    addCity(city);
    setQuery('');
    setCities([]);
    router.navigate('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Search for a city..."
          placeholderTextColor="#fff"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {isLoading && <Text style={styles.loading}>Loading...</Text>}

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
  },
  loading: {
    color: '#fff',
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
  },
  cityItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cityItemPressed: {
    backgroundColor: 'rgba(74, 75, 99, 0.8)',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  cityTimezone: {
    fontSize: 14,
    color: '#fff',
    marginTop: 2,
  },
});
