import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { ensureCitiesDb, openCitiesDb } from '@/db/citiesDb';

interface DatabaseContextValue {
  db: SQLiteDatabase | null;
  error: string | null;
  isLoading: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureCitiesDb();
        const database = openCitiesDb();

        if (!cancelled) {
          setDb(database);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "DB init failed");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, error, isLoading }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }

  return context;
}
