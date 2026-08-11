import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "../data";
import { fetchAvailableModels as fetchModelsFromApi } from "../services/ollamaApi";
import type { DropdownOption } from "../types";
import { addFavoriteMarker, selectInitialModel } from "../utils/transforms";
import usePersistentState from "./usePersistentState";

const getModelPlaceholder = (
  isLoading: boolean,
  error: string | null,
  modelCount: number,
): string =>
  isLoading
    ? "Loading models..."
    : error || modelCount === 0
      ? "No models available"
      : "Select a model";

interface OllamaModelsState {
  ollamaModels: DropdownOption[];
  selectedModel: string;
  favoriteModel: string;
  isLoadingModels: boolean;
  modelError: string | null;
  dropdownPlaceholder: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  setFavoriteModel: Dispatch<SetStateAction<string>>;
  fetchOllamaModels: () => Promise<void>;
}

const useOllamaModels = (): OllamaModelsState => {
  const [rawModels, setRawModels] = useState<DropdownOption[]>([]);
  const [favoriteModel, setFavoriteModel] = usePersistentState<string>(
    STORAGE_KEYS.FAVORITE_MODEL,
    "",
  );
  const [selectedModel, setSelectedModel] = usePersistentState<string>(
    STORAGE_KEYS.SELECTED_MODEL,
    "",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const models = await fetchModelsFromApi();
      setRawModels(models);

      if (models.length === 0) {
        setError("No models found in Ollama or llama.cpp.");
        setSelectedModel("");
        return;
      }

      setSelectedModel(selectInitialModel(selectedModel, favoriteModel, models));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setRawModels([]);
      setSelectedModel("");
    } finally {
      setIsLoading(false);
    }
  }, [favoriteModel, setSelectedModel, selectedModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    const favoriteExists =
      favoriteModel && rawModels.some((m) => m.value === favoriteModel);
    if (favoriteExists && !selectedModel) {
      setSelectedModel(favoriteModel);
    }
  }, [favoriteModel, rawModels, selectedModel, setSelectedModel]);

  const models = useMemo(
    () => addFavoriteMarker(rawModels, favoriteModel),
    [rawModels, favoriteModel],
  );

  const placeholder = useMemo(
    () => getModelPlaceholder(isLoading, error, models.length),
    [isLoading, error, models.length],
  );

  return {
    ollamaModels: models,
    selectedModel,
    favoriteModel,
    isLoadingModels: isLoading,
    modelError: error,
    dropdownPlaceholder: placeholder,
    setSelectedModel,
    setFavoriteModel,
    fetchOllamaModels: fetchModels,
  };
};

export default useOllamaModels;
