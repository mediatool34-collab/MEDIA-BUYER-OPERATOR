import { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { StatePersistenceContext } from '../lib/StateContext';

/**
 * Hook to access the persistence context
 */
export const usePersistence = () => {
  const context = useContext(StatePersistenceContext);
  if (!context) {
    throw new Error('usePersistence must be used within a StatePersistenceProvider');
  }
  return context;
};

/**
 * A hook that works like useState but persists data across page navigations
 * and refreshes, with a 5-minute expiration.
 */
export function usePersistedState<T>(key: string, initialState: T): [T, (value: T | ((prev: T) => T)) => void] {
  const { getPersistedState, setPersistedState } = usePersistence();
  
  // Initialize state from persistence or initial value
  const [state, setState] = useState<T>(() => {
    const persisted = getPersistedState(key);
    return persisted !== undefined ? persisted : initialState;
  });

  // Use a ref to track the last value we synced to persistence
  // to avoid redundant updates to the parent context
  const lastSyncedValue = useRef<string>(JSON.stringify(state));

  // Sync state to persistence whenever it changes
  // We use useEffect to ensure the update happens AFTER the component renders,
  // avoiding the "Cannot update a component while rendering a different component" warning.
  useEffect(() => {
    const stringified = JSON.stringify(state);
    if (lastSyncedValue.current !== stringified) {
      setPersistedState(key, state);
      lastSyncedValue.current = stringified;
    }
  }, [key, state, setPersistedState]);

  return [state, setState];
}
