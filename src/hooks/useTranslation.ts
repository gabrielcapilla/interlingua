import { useState, useCallback, useRef, useMemo } from "react";
import { OllamaMessage } from "../types";
import { TRANSLATION_CONFIG } from "../config/constants";
import { fetchTranslation } from "../services/ollamaApi";
import { languageOptions } from "../config/constants";

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

const createTranslationPrompt = (
  text: string,
  inputLang: string,
  outputLang: string,
  languageLabels: Record<string, string>,
): OllamaMessage[] => {
  const outputLabel = languageLabels[outputLang] || outputLang;
  const userMessage =
    inputLang === "auto"
      ? `Detect language and translate to ${outputLabel}. Output ONLY translated text.\n\n${text}`
      : `Translate from ${languageLabels[inputLang] || inputLang} to ${outputLabel}:\n\n${text}`;

  return [
    { role: "system", content: TRANSLATION_CONFIG.SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];
};

const useTranslation = ({
  selectedModel,
  inputLanguage,
  outputLanguage,
}: UseTranslationProps): UseTranslationReturn => {
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const requestId = useRef(0);
  const isTranslatingRef = useRef(false);

  const languageLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const { value, label } of languageOptions) {
      labels[value] = value === "ca" ? `${label} (from Catalonia)` : label;
    }
    return labels;
  }, []);

  const translateText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !selectedModel || isTranslatingRef.current) return;

      const current = ++requestId.current;
      if (trimmed === translatedText && !translationError) return;

      isTranslatingRef.current = true;
      setIsTranslating(true);
      setTranslationError(null);
      if (current !== requestId.current) setTranslatedText("");

      const messages = createTranslationPrompt(
        trimmed,
        inputLanguage,
        outputLanguage,
        languageLabels,
      );

      try {
        const result = await fetchTranslation({
          model: selectedModel,
          messages,
          options: TRANSLATION_CONFIG.AI_PARAMS,
        });

        if (current === requestId.current) setTranslatedText(result);
      } catch (error) {
        if (current === requestId.current) {
          setTranslationError(
            error instanceof Error ? error.message : "Unknown error",
          );
          setTranslatedText("");
        }
      } finally {
        if (current === requestId.current) {
          setIsTranslating(false);
          isTranslatingRef.current = false;
        }
      }
    },
    [
      selectedModel,
      inputLanguage,
      outputLanguage,
      translatedText,
      translationError,
      languageLabels,
      setTranslatedText,
      setTranslationError,
    ],
  );

  return {
    translatedText,
    isTranslating,
    translationError,
    setTranslationError,
    translateText,
    setTranslatedText,
  };
};

export default useTranslation;
