import { createContext, useContext, useState, ReactNode } from 'react';
import { CityRow } from '@/components/add-city-modal';

export type SelectedCity = CityRow & {
  customName?: string;
};

type SelectedCitiesContextType = {
  selectedCities: SelectedCity[];
  addCity: (city: CityRow) => void;
  removeCity: (cityId: number) => void;
  updateCityName: (cityId: number, customName: string) => void;
  reorderCities: (cities: SelectedCity[]) => void;
};

const SelectedCitiesContext = createContext<SelectedCitiesContextType | null>(null);

export function SelectedCitiesProvider({ children }: { children: ReactNode }) {
  const [selectedCities, setSelectedCities] = useState<SelectedCity[]>([]);

  const addCity = (city: CityRow) => {
    setSelectedCities((prev) => {
      const isAlreadySelected = prev.some((c) => c.id === city.id);
      if (isAlreadySelected) {
        return prev;
      }
      return [...prev, city];
    });
  };

  const removeCity = (cityId: number) => {
    setSelectedCities((prev) => prev.filter((c) => c.id !== cityId));
  };

  const updateCityName = (cityId: number, customName: string) => {
    setSelectedCities((prev) =>
      prev.map((c) =>
        c.id === cityId ? { ...c, customName: customName || undefined } : c
      )
    );
  };

  const reorderCities = (cities: SelectedCity[]) => {
    setSelectedCities(cities);
  };

  return (
    <SelectedCitiesContext.Provider value={{ selectedCities, addCity, removeCity, updateCityName, reorderCities }}>
      {children}
    </SelectedCitiesContext.Provider>
  );
}

export function useSelectedCities() {
  const context = useContext(SelectedCitiesContext);

  if (!context) {
    throw new Error('useSelectedCities must be used within a SelectedCitiesProvider');
  }

  return context;
}
