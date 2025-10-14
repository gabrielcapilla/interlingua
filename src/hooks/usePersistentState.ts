import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * @description A custom React hook that creates a state variable that persists its value in the browser's localStorage. It mirrors the `useState` API but adds the side effect of synchronization with localStorage.
 * @template T The type of the state value being persisted.
 * @param {string} key The unique key under which the value will be stored in localStorage.
 * @param {T} defaultValue The default value to use if no value is found in localStorage or if a parsing error occurs during initialization.
 * @returns {[T, Dispatch<SetStateAction<T>>]} A tuple containing the current state value and a state setter function, identical to the return of `useState`.
 * @interactions
 * - **React Hooks:** Internally uses `useState` to manage the state and `useEffect` to trigger the persistence logic.
 * - **Browser API:**
 *   - `localStorage.getItem(key)`: Called once on initialization to retrieve the persisted state.
 *   - `localStorage.setItem(key, value)`: Called inside `useEffect` whenever the state changes.
 * - **Serialization:** Uses `JSON.parse()` to deserialize the stored string and `JSON.stringify()` to serialize the state value for storage. It includes error handling for these operations.
 */
function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export default usePersistentState;
