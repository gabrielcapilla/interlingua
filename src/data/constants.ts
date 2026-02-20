import { LanguageCode, DropdownOption } from "../types";

const LANGUAGE_DATA = {
  auto: "Auto-Detect",
  en: "English",
  es: "Spanish",
  ca: "Catalan",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
  ar: "Arabic",
  hi: "Hindi",
} as const;

export const languageOptions: DropdownOption[] = Object.entries(
  LANGUAGE_DATA,
).map(([value, label]) => ({ value, label }));

export const getLanguageLabel = (code: string): string =>
  LANGUAGE_DATA[code as LanguageCode] || code;

export const STORAGE_KEYS = {
  INPUT_LANG: "userSelectedInputLanguage",
  OUTPUT_LANG: "userSelectedOutputLanguage",
  SELECTED_MODEL: "ollamaSelectedModel",
  FAVORITE_MODEL: "ollamaFavoriteModel",
} as const;

export const API = {
  BASE_URL: "http://localhost:11434/api",
  CONNECTION_ERROR_PREFIX: "Could not connect to Ollama.",
} as const;

export const LIMITS = {
  MAX_INPUT_CHARACTERS: 6400,
  MODEL_FETCH_TIMEOUT: 10000,
  TRANSLATION_TIMEOUT: 30000,
  TOAST_DURATION: 5000,
  TOAST_EXIT_DURATION: 300,
} as const;

export const TRANSLATION_CONFIG = {
  SYSTEM_PROMPT:
    "You are TranslateGemma, a specialized translation model. Return only the translated text.",
  ALTERNATIVES: {
    ENABLED: true,
    MAX_COUNT: 2,
    MAX_INPUT_CHARACTERS: 120,
    MAX_INPUT_WORDS: 14,
  } as const,
  AI_PARAMS: {
    temperature: 0,
    seed: 42,
    top_k: 40,
    top_p: 0.5,
  } as const,
} as const;
