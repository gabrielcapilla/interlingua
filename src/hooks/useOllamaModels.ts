import { useState, useEffect, useCallback } from 'react';
import { DropdownOption } from '../types';
import { OLLAMA_CONNECTION_ERROR_PREFIX, OLLAMA_MODEL_STORAGE_KEY } from '../config/constants';
import usePersistentState from './usePersistentState';
import { fetchOllamaModels as fetchModelsFromApi } from '../services/ollamaApi';

interface UseOllamaModelsReturn {
  ollamaModels: DropdownOption[];
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  isLoadingModels: boolean;
  modelError: string | null;
  dropdownPlaceholder: string;
  fetchOllamaModels: () => Promise<void>;
}

/**
 * @description Custom hook to manage fetching Ollama models, handling selection, and persisting the choice. It encapsulates all logic related to the model list, including loading states, error handling, and providing dynamic UI text.
 * @returns {UseOllamaModelsReturn} An object containing all the necessary state and functions for managing Ollama models.
 * @property {DropdownOption[]} ollamaModels - An array of available models, formatted for the `Dropdown` component.
 * @property {string} selectedModel - The name of the currently selected model.
 * @property {React.Dispatch<React.SetStateAction<string>>} setSelectedModel - The state setter for `selectedModel`.
 * @property {boolean} isLoadingModels - A flag that is true while models are being fetched from the API.
 * @property {string | null} modelError - An error message string if the fetch fails, otherwise null.
 * @property {string} dropdownPlaceholder - A dynamic placeholder text for the model selection dropdown, reflecting the current state (loading, error, etc.).
 * @property {() => Promise<void>} fetchOllamaModels - A function to manually trigger a refetch of the models.
 * @interactions
 * - **React Hooks:** Utilizes `useState` for loading and error states, `useEffect` to fetch on mount, and `useCallback` to memoize the fetch function.
 * - **Custom Hooks:** Uses `usePersistentState` to store and retrieve the `selectedModel` from localStorage, preserving the user's choice across sessions.
 * - **Services:** Calls `fetchModelsFromApi` from `ollamaApi.ts` to perform the actual network request.
 * - **State Management:** Manages internal states for `ollamaModels`, `isLoadingModels`, and `modelError`. It also derives `dropdownPlaceholder` from these states.
 * - **Constants:** Uses `OLLAMA_MODEL_STORAGE_KEY` for localStorage and `OLLAMA_CONNECTION_ERROR_PREFIX` for error message comparisons.
 */
function useOllamaModels(): UseOllamaModelsReturn {
  const [ollamaModels, setOllamaModels] = useState<DropdownOption[]>([]);
  const [selectedModel, setSelectedModel] = usePersistentState<string>(OLLAMA_MODEL_STORAGE_KEY, '');
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const fetchOllamaModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    try {
      const formattedModels = await fetchModelsFromApi();
      setOllamaModels(formattedModels);

      if (formattedModels.length > 0) {
        setSelectedModel(prevSelected =>
          formattedModels.some(m => m.value === prevSelected) ? prevSelected : formattedModels[0].value
        );
      } else {
        setSelectedModel('');
        setModelError('No Ollama models found. Ensure models are pulled in Ollama.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setModelError(errorMessage);
      setOllamaModels([]);
      setSelectedModel('');
    } finally {
      setIsLoadingModels(false);
    }
  }, [setSelectedModel]);

  useEffect(() => {
    fetchOllamaModels();
  }, [fetchOllamaModels]);

  let dropdownPlaceholder: string;
  if (isLoadingModels) {
    dropdownPlaceholder = "Loading models...";
  } else if (modelError?.startsWith(OLLAMA_CONNECTION_ERROR_PREFIX)) {
    dropdownPlaceholder = "Ollama Disconnected";
  } else if (modelError) {
    dropdownPlaceholder = "Error fetching models";
  } else if (ollamaModels.length === 0) {
    dropdownPlaceholder = "No models available";
  } else {
    dropdownPlaceholder = "Select a model";
  }

  return {
    ollamaModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    modelError,
    dropdownPlaceholder,
    fetchOllamaModels,
  };
}

export default useOllamaModels;
