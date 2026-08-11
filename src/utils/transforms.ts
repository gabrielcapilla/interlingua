import type {
  DropdownOption,
  InferenceProvider,
  LlamaCppModelsResponse,
  OllamaTagsResponse,
} from "../types";

const MODEL_REFERENCE_SEPARATOR = ":";

const isInferenceProvider = (value: string): value is InferenceProvider =>
  value === "ollama" || value === "llamacpp";

export const createModelReference = (
  provider: InferenceProvider,
  model: string,
): string => `${provider}${MODEL_REFERENCE_SEPARATOR}${model}`;

export const parseModelReference = (
  reference: string,
): { provider: InferenceProvider; model: string } => {
  const separatorIndex = reference.indexOf(MODEL_REFERENCE_SEPARATOR);
  if (separatorIndex < 0) return { provider: "ollama", model: reference };

  const provider = reference.slice(0, separatorIndex);
  const model = reference.slice(separatorIndex + 1);
  if (!isInferenceProvider(provider)) {
    return { provider: "ollama", model: reference };
  }
  return { provider, model };
};

export const mapOllamaModelsToOptions = (
  response: OllamaTagsResponse,
): DropdownOption[] =>
  response.models.map((model) => ({
    value: createModelReference("ollama", model.name),
    label: `${model.name} · Ollama`,
  }));

export const mapLlamaCppModelsToOptions = (
  response: LlamaCppModelsResponse,
): DropdownOption[] =>
  response.data.map((model) => ({
    value: createModelReference("llamacpp", model.id),
    label: `${model.id.split("/").pop() || model.id} · llama.cpp`,
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

export const filterAutoLanguage = <T extends { value: string }>(options: T[]): T[] =>
  options.filter((opt) => opt.value !== "auto");

export const filterOutputLanguages = <T extends { value: string }>(
  options: T[],
  inputLanguage: string,
): T[] =>
  options.filter((option) => option.value !== "auto" && option.value !== inputLanguage);

export const isSourceLanguageMismatch = (
  inputLanguage: string,
  detectedLanguage: string | null,
): boolean =>
  inputLanguage !== "auto" &&
  detectedLanguage !== null &&
  detectedLanguage !== inputLanguage;

export const findOptionByValue = <T extends { value: string }>(
  options: T[],
  value: string,
): T | undefined => options.find((opt) => opt.value === value);

export const generateToastId = (): string => `${Date.now()}-${Math.random()}`;

export const countWords = (text: string): number =>
  text.trim().match(/\S+/g)?.length ?? 0;

export const shouldScheduleAutoTranslation = (
  inputText: string,
  lastRequestedText: string,
): boolean => Boolean(inputText.trim()) && inputText !== lastRequestedText;

export const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === "AbortError") ||
  (error instanceof Error && error.name === "AbortError");

export const withTimeout = async <T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  externalSignal?: AbortSignal,
): Promise<T> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbortListener: (() => void) | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
      controller.abort();
    }, ms);
  });
  const externalAbort = externalSignal
    ? new Promise<never>((_, reject) => {
        const abort = (): void => {
          controller.abort();
          reject(
            externalSignal.reason instanceof Error
              ? externalSignal.reason
              : new DOMException("The operation was aborted.", "AbortError"),
          );
        };
        if (externalSignal.aborted) {
          abort();
        } else {
          externalSignal.addEventListener("abort", abort, { once: true });
          removeExternalAbortListener = () =>
            externalSignal.removeEventListener("abort", abort);
        }
      })
    : null;

  try {
    return await Promise.race(
      externalAbort
        ? [fn(controller.signal), timeout, externalAbort]
        : [fn(controller.signal), timeout],
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    removeExternalAbortListener?.();
  }
};

export const withInactivityTimeout = async <T>(
  fn: (signal: AbortSignal, onActivity: () => void) => Promise<T>,
  ms: number,
  externalSignal?: AbortSignal,
): Promise<T> => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let removeExternalAbortListener: (() => void) | undefined;
  let rejectTimeout: ((error: Error) => void) | undefined;

  const resetTimeout = (): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      rejectTimeout?.(new Error(`Operation timed out after ${ms}ms`));
      controller.abort();
    }, ms);
  };

  const timeout = new Promise<never>((_, reject) => {
    rejectTimeout = reject;
    resetTimeout();
  });
  const externalAbort = externalSignal
    ? new Promise<never>((_, reject) => {
        const abort = (): void => {
          controller.abort();
          reject(
            externalSignal.reason instanceof Error
              ? externalSignal.reason
              : new DOMException("The operation was aborted.", "AbortError"),
          );
        };
        if (externalSignal.aborted) {
          abort();
        } else {
          externalSignal.addEventListener("abort", abort, { once: true });
          removeExternalAbortListener = () =>
            externalSignal.removeEventListener("abort", abort);
        }
      })
    : null;

  try {
    return await Promise.race(
      externalAbort
        ? [fn(controller.signal, resetTimeout), timeout, externalAbort]
        : [fn(controller.signal, resetTimeout), timeout],
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    removeExternalAbortListener?.();
  }
};

export const selectInitialModel = (
  current: string,
  favorite: string,
  available: DropdownOption[],
): string => {
  if (isValidModel(current, available)) return current;
  if (isValidModel(favorite, available)) return favorite;
  return available[0]?.value ?? "";
};
