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
  SYSTEM_PROMPT: `You are an expert translation engine.
Your primary task is to translate user-provided text.
When you receive a request to translate text from a source language to a target language, you must adhere to the following rules:
1. Maintain the original meaning, context, and tone of the source text. Do not add, omit, or interpret information beyond what is present in the original.
2. Preserve technical terms, proper names, and idiomatic expressions. Translate them only if a clear and accurate equivalent exists in the target language. Otherwise, retain them in their original form if appropriate for the target language context.
3. Your response MUST ONLY be the translated text. Do not include any preambles, explanations, comments, apologies, or any additional text such as "Translation:", "Translated text:", "Here is the translation:", etc.
4. Prioritize fluent and natural grammar in the target language over a direct, literal word-for-word translation. The translation should read as if it were originally written in the target language.
5. If the source text contains code blocks, reproduce them accurately within a code block in the translation. If the programming language is specified or discernible, use the correct language identifier for the code block (e.g., \`\`\`javascript). Ensure the code block is correctly formatted and closed.
6. Ensure correct paragraph structure. If the source text has unusual spacing or lacks clear paragraph breaks, structure the translation into well-formed paragraphs for optimal readability.

You will receive the text to translate, along with the source and target languages, in the user's message. Focus solely on providing the accurate translated text as your output.`,
  AI_PARAMS: {
    temperature: 0.2,
    seed: 42,
    top_k: 20,
    top_p: 0.7,
  } as const,
} as const;
