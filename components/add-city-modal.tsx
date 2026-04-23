import { useState, useEffect, useMemo } from 'react';
import { Text, View, TextInput, StyleSheet, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SQLite from "expo-sqlite";

import IconCancelOutlined from '@/assets/images/icon--x-1--outlined.svg';
import IconConfirmOutlined from '@/assets/images/icon--checkmark-1--outlined.svg';
import { useDatabase } from '@/hooks/use-database';
import { useI18n } from '@/hooks/use-i18n';
import type { UiTheme } from '@/constants/ui-theme.types';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LoadingSpinner } from '@/components/loading-spinner';

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
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { db } = useDatabase();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        source={theme.image.modalBackgroundSource}
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
                      fill={theme.text.primary}
                    />
                  </Pressable>

                  <Text style={styles.title}>{t('common.addCity')}</Text>

                  <Pressable
                    style={[styles.confirmButton, !selectedCity && styles.confirmButtonDisabled]}
                    onPress={handleSave}
                    disabled={!selectedCity}
                  >
                    <IconConfirmOutlined
                      fill={theme.text.primary}
                    />
                  </Pressable>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={t('addCity.searchPlaceholder')}
                  placeholderTextColor={theme.text.placeholder}
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />

                {isLoading && (
                  <View style={styles.loadingBlock}>
                    <LoadingSpinner />
                  </View>
                )}

                {!isLoading && cities.length > 0 && (
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
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    safeArea: {
      flex: 1,
    },
    modalBg: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    modalContent: {
      minHeight: '100%',
      maxHeight: '100%',
    },
    header: {
      paddingHorizontal: 33,
      paddingTop: theme.spacing.modalInnerY,
      paddingBottom: 30,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontSize: 16,
      color: theme.text.primary,
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
      borderColor: theme.border.field,
      borderRadius: theme.radius.md,
      padding: 12,
      fontSize: theme.typography.control.fontSize,
      marginLeft: theme.spacing.screenX,
      marginRight: theme.spacing.screenX,
      marginBottom: 16,
      backgroundColor: theme.surface.field,
      color: theme.text.primary,
    },
    loadingBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resultsList: {
      flex: 1,
      paddingHorizontal: theme.spacing.screenX,
    },
    cityItem: {
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      marginBottom: 6,
    },
    cityItemPressed: {
      backgroundColor: theme.overlay.strong,
    },
    cityItemSelected: {
      backgroundColor: theme.surface.fieldSelected,
    },
    cityText: {
      fontSize: theme.typography.control.fontSize,
      lineHeight: 16,
      color: theme.text.primary,
      marginBottom: 1,
    },
    cityTimezone: {
      fontSize: 13,
      lineHeight: 13,
      color: theme.text.secondary,
    },
  });
}
