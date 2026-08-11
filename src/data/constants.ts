import type { DropdownOption, LanguageCode } from "../types";

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

export const languageOptions: DropdownOption[] = Object.entries(LANGUAGE_DATA).map(
  ([value, label]) => ({ value, label }),
);

export const getLanguageLabel = (code: string): string =>
  LANGUAGE_DATA[code as LanguageCode] || code;

export const STORAGE_KEYS = {
  INPUT_LANG: "userSelectedInputLanguage",
  OUTPUT_LANG: "userSelectedOutputLanguage",
  SELECTED_MODEL: "ollamaSelectedModel",
  FAVORITE_MODEL: "ollamaFavoriteModel",
} as const;

export const API = {
  OLLAMA_BASE_URL: "http://localhost:11434/api",
  LLAMA_CPP_BASE_URL: "http://localhost:4256/v1",
} as const;

export const LIMITS = {
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
  CHUNKING: {
    MAX_SOURCE_TOKENS: 1600,
    DETECTION_SOURCE_TOKENS: 600,
    AUTO_TRANSLATE_MAX_SOURCE_TOKENS: 600,
    MAX_CHUNKS: 512,
  } as const,
  DIAGNOSTICS: {
    ENABLED: false,
  } as const,
  AI_PARAMS: {
    temperature: 0,
    seed: 42,
    top_k: 40,
    top_p: 0.5,
  } as const,
} as const;
