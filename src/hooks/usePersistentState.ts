import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

const readPersistedValue = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const writePersistedValue = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
};

function usePersistentState<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => readPersistedValue(key, defaultValue));

  useEffect(() => {
    writePersistedValue(key, state);
  }, [key, state]);

  return [state, setState];
}

export default usePersistentState;
