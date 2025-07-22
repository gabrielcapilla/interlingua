import { useState, useEffect, useCallback, useMemo } from 'react';
import { DropdownOption } from '../types';
import { OLLAMA_MODEL_STORAGE_KEY, FAVORITE_OLLAMA_MODEL_KEY } from '../config/constants';
import usePersistentState from './usePersistentState';
import { fetchOllamaModels as fetchModelsFromApi } from '../services/ollamaApi';

interface UseOllamaModelsReturn {
  ollamaModels: DropdownOption[];
  selectedModel: string;
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
  favoriteModel: string;
  setFavoriteModel: React.Dispatch<React.SetStateAction<string>>;
  isLoadingModels: boolean;
  modelError: string | null;
  dropdownPlaceholder: string;
  fetchOllamaModels: () => Promise<void>;
}

/**
 * @description Custom hook to manage fetching Ollama models, handling selection, and persisting the choice. It encapsulates all logic related to the model list, including loading states, error handling, and providing dynamic UI text. It also manages a "favorite" model, which is used as the default selection.
 * @returns {UseOllamaModelsReturn} An object containing all the necessary state and functions for managing Ollama models.
 * @property {DropdownOption[]} ollamaModels - An array of available models, formatted for the `Dropdown` component, with the favorite model's label decorated with a star.
 * @property {string} selectedModel - The name of the currently selected model.
 * @property {React.Dispatch<React.SetStateAction<string>>} setSelectedModel - The state setter for `selectedModel`.
 * @property {string} favoriteModel - The name of the user's favorite model.
 * @property {React.Dispatch<React.SetStateAction<string>>} setFavoriteModel - The state setter for `favoriteModel`.
 * @property {boolean} isLoadingModels - A flag that is true while models are being fetched from the API.
 * @property {string | null} modelError - An error message string if the fetch fails, otherwise null.
 * @property {string} dropdownPlaceholder - A dynamic placeholder text for the model selection dropdown, reflecting the current state (loading, error, etc.).
 * @property {() => Promise<void>} fetchOllamaModels - A function to manually trigger a refetch of the models.
 * @interactions
 * - **React Hooks:** Utilizes `useState`, `useEffect`, `useCallback`, and `useMemo`.
 * - **Custom Hooks:** Uses `usePersistentState` to store and retrieve `selectedModel` and `favoriteModel` from localStorage.
 * - **Services:** Calls `fetchModelsFromApi` from `ollamaApi.ts` to perform the actual network request.
 * - **State Management:** Manages internal states for `rawModels`, `isLoadingModels`, and `modelError`. It derives `ollamaModels` and `dropdownPlaceholder`.
 * - **Constants:** Uses `OLLAMA_MODEL_STORAGE_KEY` and `FAVORITE_OLLAMA_MODEL_KEY` for localStorage.
 */
function useOllamaModels(): UseOllamaModelsReturn {
  const [rawModels, setRawModels] = useState<DropdownOption[]>([]);
  const [favoriteModel, setFavoriteModel] = usePersistentState<string>(FAVORITE_OLLAMA_MODEL_KEY, '');
  const [selectedModel, setSelectedModel] = usePersistentState<string>(OLLAMA_MODEL_STORAGE_KEY, '');
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);

  const fetchOllamaModels = useCallback(async () => {
    setIsLoadingModels(true);
    setModelError(null);
    try {
      const formattedModels = await fetchModelsFromApi();
      setRawModels(formattedModels);

      if (formattedModels.length > 0) {
        setSelectedModel(prevSelected => {
          const favoriteExists = formattedModels.some(m => m.value === favoriteModel);
          if (favoriteExists) {
            return favoriteModel;
          }
          const prevSelectedExists = formattedModels.some(m => m.value === prevSelected);
          if (prevSelectedExists) {
            return prevSelected;
          }
          return formattedModels[0].value;
        });
      } else {
        setSelectedModel('');
        setModelError('No Ollama models found. Ensure models are pulled in Ollama.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setModelError(errorMessage);
      setRawModels([]);
      setSelectedModel('');
    } finally {
      setIsLoadingModels(false);
    }
  }, [setSelectedModel, favoriteModel]);

  useEffect(() => {
    fetchOllamaModels();
  }, [fetchOllamaModels]);

  useEffect(() => {
    if (favoriteModel && rawModels.some(m => m.value === favoriteModel)) {
      setSelectedModel(favoriteModel);
    }
  }, [favoriteModel, rawModels, setSelectedModel]);

  const ollamaModels = useMemo(() => {
    return rawModels.map(model => ({
      ...model,
      label: model.value === favoriteModel ? `${model.label} ★` : model.label,
    }));
  }, [rawModels, favoriteModel]);


  let dropdownPlaceholder: string;
  if (isLoadingModels) {
    dropdownPlaceholder = "Loading models...";
  } else if (modelError || ollamaModels.length === 0) {
    dropdownPlaceholder = "No models available";
  } else {
    dropdownPlaceholder = "Select a model";
  }

  return {
    ollamaModels,
    selectedModel,
    setSelectedModel,
    favoriteModel,
    setFavoriteModel,
    isLoadingModels,
    modelError,
    dropdownPlaceholder,
    fetchOllamaModels,
  };
}

export default useOllamaModels;
