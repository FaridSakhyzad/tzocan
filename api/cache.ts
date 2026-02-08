import AsyncStorage from '@react-native-async-storage/async-storage';
import { City } from './cities';

const CACHE_KEY = 'cities_cache';

interface CityCache {
  [query: string]: City[];
}

export async function getCachedCities(query: string): Promise<City[] | null> {
  try {
    const cacheJson = await AsyncStorage.getItem(CACHE_KEY);
    if (!cacheJson) {
      return null;
    }
    const cache: CityCache = JSON.parse(cacheJson);
    const normalizedQuery = query.toLowerCase().trim();
    return cache[normalizedQuery] ?? null;
  } catch (error) {
    console.error('Failed to read from cache:', error);
    return null;
  }
}

export async function setCachedCities(query: string, cities: City[]): Promise<void> {
  try {
    const cacheJson = await AsyncStorage.getItem(CACHE_KEY);
    const cache: CityCache = cacheJson ? JSON.parse(cacheJson) : {};
    const normalizedQuery = query.toLowerCase().trim();
    cache[normalizedQuery] = cities;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to write to cache:', error);
  }
}
