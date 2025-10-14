import { useState, useCallback, useRef } from 'react';
import { OllamaMessage } from '../types';
import { languageOptions, translationSystemPrompt } from '../config/constants';
import { fetchTranslation } from '../services/ollamaApi';

interface UseTranslationProps {
  selectedModel: string;
  inputLanguage: string;
  outputLanguage: string;
}

interface UseTranslationReturn {
  translatedText: string;
  isTranslating: boolean;
  translationError: string | null;
  setTranslationError: React.Dispatch<React.SetStateAction<string | null>>;
  translateText: (text: string) => Promise<void>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * @description A custom hook that encapsulates the logic for translating text via the Ollama API. It manages the translated text state, loading status, and any errors returned from the API call. It's designed to be robust against race conditions and provides clear instructions to the AI model.
 * @param {UseTranslationProps} props - An object containing the dependencies for the translation logic.
 * @param {string} props.selectedModel - The name of the AI model to be used for the translation.
 * @param {string} props.inputLanguage - The language code of the source text (e.g., 'en', 'auto').
 * @param {string} props.outputLanguage - The language code for the target translation (e.g., 'es').
 * @returns {UseTranslationReturn} An object containing the translation state and control functions.
 * @property {string} translatedText - The translated text returned by the API.
 * @property {boolean} isTranslating - A flag that is true while a translation request is in progress.
 * @property {string | null} translationError - An error message if the request fails, otherwise null.
 * @property {React.Dispatch<React.SetStateAction<string | null>>} setTranslationError - State setter for the translation error.
 * @property {(text: string) => Promise<void>} translateText - An async function that takes a text string, constructs the API request, and initiates the translation.
 * @property {React.Dispatch<React.SetStateAction<string>>} setTranslatedText - State setter for the translated text, allowing parent components to clear it.
 * @interactions
 * - **React Hooks:** Uses `useState` to manage `translatedText`, `isTranslating`, and `translationError`. Uses `useCallback` to memoize the `translateText` function and `useRef` to prevent concurrent translation requests.
 * - **Services:** Calls the `fetchTranslation` function from `ollamaApi.ts` to execute the network request.
 * - **Constants:**
 *   - `languageOptions`: Used to find the full language label (e.g., 'English') from its code (e.g., 'en') for the prompt.
 *   - `translationSystemPrompt`: The detailed system instruction provided to the AI model.
 * - **Types:** Uses the `OllamaMessage` type to structure the payload for the API request.
 * - **Prompt Engineering:**
 *   - Provides a specific, clearer prompt when 'Auto-Detect' is selected to improve reliability.
 *   - Adds a dialect clarification ("from Catalonia") to the prompt when "Catalan" is selected as a source or target language.
 */
function useTranslation({ selectedModel, inputLanguage, outputLanguage }: UseTranslationProps): UseTranslationReturn {
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  // Track the current request ID to handle race conditions
  const currentRequestId = useRef(0);
  const isTranslatingRef = useRef(false);

  const getLanguageLabelWithDialect = useCallback((langCode: string): string => {
    const lang = languageOptions.find(l => l.value === langCode);
    if (!lang) return langCode;
    if (lang.value === 'ca') {
      return `${lang.label} (from Catalonia)`;
    }
    return lang.label;
  }, []);

  const translateText = useCallback(async (text: string) => {
    const textToTranslate = text.trim();
    if (!textToTranslate || !selectedModel || isTranslatingRef.current) return;

    // Generate a unique request ID for this translation
    const requestId = ++currentRequestId.current;
    
    // Check if we're already translating the same text to prevent duplicate requests
    if (textToTranslate === translatedText && !translationError) {
      return;
    }

    isTranslatingRef.current = true;
    setIsTranslating(true);
    setTranslationError(null);
    // Only clear the translated text if it's a different request
    if (requestId !== currentRequestId.current - 1) {
      setTranslatedText('');
    }

    const outputLangLabel = getLanguageLabelWithDialect(outputLanguage);

    let userMessageContent: string;

    if (inputLanguage === 'auto') {
      userMessageContent = `Detect the language of the following text and then translate it to ${outputLangLabel}. Your response must contain ONLY the translated text, without any additional comments or explanations.\n\n${textToTranslate}`;
    } else {
      const inputLangLabel = getLanguageLabelWithDialect(inputLanguage);
      userMessageContent = `Translate the following text from ${inputLangLabel} to ${outputLangLabel}:\n\n${textToTranslate}`;
    }

    const messages: OllamaMessage[] = [
      { role: 'system', content: translationSystemPrompt },
      { role: 'user', content: userMessageContent }
    ];

    try {
      const translation = await fetchTranslation({
        model: selectedModel,
        messages,
        options: { temperature: 0.2, seed: 42, top_k: 20, top_p: 0.7 },
      });

      // Only update state if this is the most recent request
      if (requestId === currentRequestId.current) {
        setTranslatedText(translation);
      }
    } catch (error) {
      // Only update error state if this is the most recent request
      if (requestId === currentRequestId.current) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        setTranslationError(errorMessage);
        setTranslatedText('');
      }
    } finally {
      // Only update loading state if this is the most recent request
      if (requestId === currentRequestId.current) {
        setIsTranslating(false);
      }
      isTranslatingRef.current = false;
    }
  }, [selectedModel, inputLanguage, outputLanguage, setTranslatedText, setTranslationError, translatedText, translationError, getLanguageLabelWithDialect]);

  return { translatedText, isTranslating, translationError, setTranslationError, translateText, setTranslatedText };
}

export default useTranslation;
