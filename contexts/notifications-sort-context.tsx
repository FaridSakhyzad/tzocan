import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type NotificationOrderMode = 'none' | 'trigger-asc' | 'trigger-desc' | 'created-asc' | 'created-desc';
export type CityOrderMode = 'none' | 'name-asc' | 'name-desc' | 'timezone-asc' | 'timezone-desc';

export type NotificationsSortState = {
  groupByCity: boolean;
  notificationOrder: NotificationOrderMode;
  cityOrder: CityOrderMode;
};

type NotificationsSortContextValue = {
  sortState: NotificationsSortState;
  setSortState: (value: NotificationsSortState) => void;
  isSortPickerVisible: boolean;
  openSortPicker: () => void;
  closeSortPicker: () => void;
};

const DEFAULT_SORT_STATE: NotificationsSortState = {
  groupByCity: true,
  notificationOrder: 'none',
  cityOrder: 'none',
};

const NotificationsSortContext = createContext<NotificationsSortContextValue | null>(null);

export function NotificationsSortProvider({ children }: { children: ReactNode }) {
  const [sortState, setSortState] = useState<NotificationsSortState>(DEFAULT_SORT_STATE);
  const [isSortPickerVisible, setIsSortPickerVisible] = useState(false);

  const value = useMemo<NotificationsSortContextValue>(() => ({
    sortState,
    setSortState,
    isSortPickerVisible,
    openSortPicker: () => setIsSortPickerVisible(true),
    closeSortPicker: () => setIsSortPickerVisible(false),
  }), [isSortPickerVisible, sortState]);

  return (
    <NotificationsSortContext.Provider value={value}>
      {children}
    </NotificationsSortContext.Provider>
  );
}

export function useNotificationsSort() {
  const context = useContext(NotificationsSortContext);

  if (!context) {
    throw new Error('useNotificationsSort must be used within a NotificationsSortProvider');
  }

  return context;
}
