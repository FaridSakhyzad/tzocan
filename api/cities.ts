import { getCachedCities, setCachedCities } from './cache';

const API_NINJAS_BASE_URL = 'https://api.api-ninjas.com/v1';
const API_KEY = process.env.EXPO_PUBLIC_API_NINJAS_KEY ?? '';

export interface City {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  population: number;
  is_capital: boolean;
}

export async function searchCities(query: string): Promise<City[]> {
  if (!query.trim()) {
    return [];
  }

  // Check cache first
  const cached = await getCachedCities(query);
  if (cached) {
    console.log('Returning cached results for:', query);
    return cached;
  }

  // Fetch from API
  const response = await fetch(
    `${API_NINJAS_BASE_URL}/city?name=${encodeURIComponent(query)}`,
    {
      headers: {
        'X-Api-Key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch cities: ${response.status}`);
  }

  const cities: City[] = await response.json();

  // Cache the results
  await setCachedCities(query, cities);
  console.log('Cached results for:', query);

  return cities;
}
