import React, { useState, useEffect, useCallback } from 'react';
import { StatePersistenceContext, PersistedData, EXPIRATION_TIME } from './StateContext';

export const StatePersistenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<Record<string, PersistedData>>(() => {
    const saved = localStorage.getItem('app_persisted_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean up expired items on load
        const now = Date.now();
        const cleanStore: Record<string, PersistedData> = {};
        Object.entries(parsed).forEach(([key, data]: [string, any]) => {
          if (now - data.timestamp < EXPIRATION_TIME) {
            cleanStore[key] = data;
          }
        });
        return cleanStore;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('app_persisted_state', JSON.stringify(store));
  }, [store]);

  const getPersistedState = useCallback((key: string) => {
    const data = store[key];
    if (!data) return undefined;

    const now = Date.now();
    if (now - data.timestamp > EXPIRATION_TIME) {
      // Item expired
      return undefined;
    }
    return data.value;
  }, [store]);

  const setPersistedState = useCallback((key: string, value: any) => {
    setStore(prev => ({
      ...prev,
      [key]: {
        value,
        timestamp: Date.now()
      }
    }));
  }, []);

  const clearPersistedState = useCallback((key: string) => {
    setStore(prev => {
      const newStore = { ...prev };
      delete newStore[key];
      return newStore;
    });
  }, []);

  return (
    <StatePersistenceContext.Provider value={{ getPersistedState, setPersistedState, clearPersistedState }}>
      {children}
    </StatePersistenceContext.Provider>
  );
};
