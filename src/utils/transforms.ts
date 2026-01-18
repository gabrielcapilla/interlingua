import { OllamaTagsResponse, DropdownOption } from "../types";

export const mapOllamaModelsToOptions = (
  response: OllamaTagsResponse,
): DropdownOption[] =>
  response.models.map((model) => ({
    value: model.name,
    label: model.name,
  }));

export const addFavoriteMarker = (
  options: DropdownOption[],
  favoriteModel: string,
): DropdownOption[] =>
  options.map((option) => ({
    ...option,
    label: option.value === favoriteModel ? `${option.label} ★` : option.label,
  }));

export const isValidModel = (
  model: string | undefined,
  models: DropdownOption[],
): boolean => (model ? models.some((m) => m.value === model) : false);

export const filterAutoLanguage = <T extends { value: string }>(
  options: T[],
): T[] => options.filter((opt) => opt.value !== "auto");

export const findOptionByValue = <T extends { value: string }>(
  options: T[],
  value: string,
): T | undefined => options.find((opt) => opt.value === value);

export const generateToastId = (): string => `${Date.now()}-${Math.random()}`;

export const countWords = (text: string): number =>
  text.trim() ? (text.trim().match(/\S+/g)?.length ?? 0) : 0;

export const withTimeout = async <T>(
  fn: () => Promise<T>,
  ms: number,
): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    const result = await fn();
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Operation timed out after ${ms}ms`);
    }
    throw error;
  }
};

export const selectInitialModel = (
  current: string,
  favorite: string,
  available: DropdownOption[],
): string => {
  if (!current && !favorite) return available[0]?.value ?? "";
  if (current && available.some((m) => m.value === current)) return current;
  if (favorite && available.some((m) => m.value === favorite)) return favorite;
  return available[0]?.value ?? "";
};
