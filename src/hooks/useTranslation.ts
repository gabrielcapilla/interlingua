import { useState, useCallback, useRef, useMemo } from "react";
import { OllamaMessage, ProcessingMode } from "../types";
import { TRANSLATION_CONFIG } from "../config/constants";
import { fetchTranslation } from "../services/ollamaApi";
import { languageOptions } from "../config/constants";

interface UseTranslationProps {
  selectedModel: string;
  inputLanguage: string;
  outputLanguage: string;
  mode: ProcessingMode;
}

interface UseTranslationReturn {
  translatedText: string;
  alternativeTranslations: string[];
  detectedSourceLanguage: string | null;
  isTranslating: boolean;
  translationError: string | null;
  setTranslationError: React.Dispatch<React.SetStateAction<string | null>>;
  translateText: (text: string) => Promise<void>;
  setTranslatedText: React.Dispatch<React.SetStateAction<string>>;
}

const SUPPORTED_LANGUAGE_CODES = languageOptions
  .map((option) => option.value)
  .filter((code) => code !== "auto");

const SUPPORTED_LANGUAGE_CODE_SET = new Set(SUPPORTED_LANGUAGE_CODES);

const createTranslationPrompt = (
  text: string,
  inputLang: string,
  outputLang: string,
  languageLabels: Record<string, string>,
  alternativesEnabled: boolean,
  maxAlternatives: number,
): OllamaMessage[] => {
  const sourceCode = inputLang === "auto" ? "auto" : inputLang;
  const sourceLabel =
    inputLang === "auto"
      ? "Auto-Detect"
      : languageLabels[inputLang] || inputLang;
  const targetLabel = languageLabels[outputLang] || outputLang;

  const userMessage = `Translate the following text from ${sourceLabel} (${sourceCode}) to ${targetLabel} (${outputLang}).
Return only the translated text in the first line.
${alternativesEnabled ? `If there are natural colloquial variants, add up to ${maxAlternatives} extra lines, each prefixed with "ALT: ".` : ""}
Preserve the original structure exactly: keep the same line breaks, blank lines, list structure, indentation, and code block fences.
Do not include explanations.

Text:
\`\`\`
${text}
\`\`\``;

  return [{ role: "user", content: userMessage }];
};

const createCorrectionPrompt = (
  text: string,
  inputLang: string,
  languageLabels: Record<string, string>,
): OllamaMessage[] => {
  const sourceCode = inputLang === "auto" ? "auto" : inputLang;
  const sourceLabel =
    inputLang === "auto"
      ? "Auto-Detect"
      : languageLabels[inputLang] || inputLang;

  const userMessage = `Correct the following text in ${sourceLabel} (${sourceCode}).
Return only the corrected text.
Preserve the original structure exactly: keep the same line breaks, blank lines, list structure, indentation, and code block fences.
Do not translate to another language.
Do not include explanations.

Text:
\`\`\`
${text}
\`\`\``;

  return [{ role: "user", content: userMessage }];
};

const createDetectionPrompt = (text: string): OllamaMessage[] => {
  const userMessage = `Detect the source language of the text.
Return only one ISO 639-1 language code from this allowed list: ${SUPPORTED_LANGUAGE_CODES.join(", ")}.
Do not add explanations or extra text.

Text:
\`\`\`
${text}
\`\`\``;

  return [{ role: "user", content: userMessage }];
};

const normalizeDetectedLanguageCode = (raw: string): string | null => {
  const cleaned = raw.trim().toLowerCase().replace(/`/g, "");
  if (!cleaned) return null;

  const candidate = cleaned.split(/\s+/)[0].replace(/[^a-z_-]/g, "");
  if (!candidate) return null;

  const base = candidate.split(/[-_]/)[0];
  if (SUPPORTED_LANGUAGE_CODE_SET.has(base)) return base;

  return null;
};

const isShortExpression = (text: string): boolean => {
  const compact = text.trim();
  if (!compact) return false;

  const words = compact.split(/\s+/).filter(Boolean).length;
  const lineCount = compact.split(/\r?\n/).filter((line) => line.trim()).length;

  return (
    lineCount <= 1 &&
    compact.length <= TRANSLATION_CONFIG.ALTERNATIVES.MAX_INPUT_CHARACTERS &&
    words <= TRANSLATION_CONFIG.ALTERNATIVES.MAX_INPUT_WORDS
  );
};

const stripTranslationPrefix = (value: string): string =>
  value.replace(
    /^(translation|translated text|traduccion|traducción)\s*:\s*/i,
    "",
  );

const cleanPrefix = (value: string): string =>
  stripTranslationPrefix(value).trim();

const normalizeTranslationResponse = (
  raw: string,
  maxAlternatives: number,
  allowAlternatives: boolean,
  sourceHasCodeFences: boolean,
): { primary: string; alternatives: string[] } => {
  const text = raw.replace(/^\uFEFF/, "");
  if (!text.trim()) return { primary: "", alternatives: [] };

  const allLines = text.split(/\r?\n/);
  const altCandidates: string[] = [];
  const primaryLines: string[] = [];

  for (const line of allLines) {
    if (/^\s*ALT:\s*/i.test(line)) {
      altCandidates.push(cleanPrefix(line.replace(/^\s*ALT:\s*/i, "")));
      continue;
    }
    primaryLines.push(line);
  }

  const taggedAlternatives = altCandidates
    .filter(Boolean)
    .slice(0, maxAlternatives);
  const rebuiltPrimary = primaryLines.join("\n");
  let primary = stripTranslationPrefix(rebuiltPrimary).replace(/\s+$/g, "");
  if (!primary.trim())
    primary = stripTranslationPrefix(text).replace(/\s+$/g, "");

  if (!sourceHasCodeFences) {
    const fencedMatch = primary.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
    if (fencedMatch) primary = fencedMatch[1];

    // Remove stray markdown fence lines if model adds them accidentally.
    const withoutFenceLines = primary
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "```")
      .join("\n");
    primary = withoutFenceLines;
  }

  if (primary.includes("```")) {
    return {
      primary,
      alternatives: allowAlternatives ? taggedAlternatives : [],
    };
  }

  if (
    allowAlternatives &&
    !taggedAlternatives.length &&
    !primary.includes("\n") &&
    primary.includes(" / ")
  ) {
    const parts = primary
      .split(/\s*\/\s*/)
      .map((part) => cleanPrefix(part))
      .filter(Boolean);

    if (parts.length > 1) {
      return {
        primary: parts[0],
        alternatives: parts.slice(1, 1 + maxAlternatives),
      };
    }
  }

  return {
    primary,
    alternatives: allowAlternatives ? taggedAlternatives : [],
  };
};

const useTranslation = ({
  selectedModel,
  inputLanguage,
  outputLanguage,
  mode,
}: UseTranslationProps): UseTranslationReturn => {
  const [translatedText, setTranslatedText] = useState("");
  const [alternativeTranslations, setAlternativeTranslations] = useState<
    string[]
  >([]);
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<
    string | null
  >(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const requestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const lastRequestKeyRef = useRef("");

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
      const requestKey = [
        selectedModel,
        inputLanguage,
        outputLanguage,
        mode,
        trimmed,
      ].join("|");
      if (requestKey === lastRequestKeyRef.current && !translationError) return;
      lastRequestKeyRef.current = requestKey;

      isTranslatingRef.current = true;
      setIsTranslating(true);
      setTranslationError(null);
      setAlternativeTranslations([]);
      setDetectedSourceLanguage(null);
      if (current !== requestId.current) setTranslatedText("");

      let sourceLanguageForTranslation = inputLanguage;
      if (inputLanguage === "auto") {
        try {
          const detection = await fetchTranslation({
            model: selectedModel,
            messages: createDetectionPrompt(trimmed),
            options: TRANSLATION_CONFIG.AI_PARAMS,
          });
          const detectedCode = normalizeDetectedLanguageCode(detection);
          if (detectedCode) {
            sourceLanguageForTranslation = detectedCode;
            setDetectedSourceLanguage(detectedCode);
          }
        } catch {
          sourceLanguageForTranslation = "auto";
        }
      }

      if (
        mode === "translate" &&
        sourceLanguageForTranslation !== "auto" &&
        sourceLanguageForTranslation === outputLanguage
      ) {
        const languageLabel =
          languageLabels[sourceLanguageForTranslation] ??
          sourceLanguageForTranslation.toUpperCase();
        if (current === requestId.current) {
          setTranslatedText("");
          setAlternativeTranslations([]);
          setTranslationError(
            `Source and target are both ${languageLabel}. Please choose a different target language.`,
          );
          setIsTranslating(false);
          isTranslatingRef.current = false;
        }
        return;
      }

      const allowAlternatives =
        mode === "translate" &&
        TRANSLATION_CONFIG.ALTERNATIVES.ENABLED &&
        isShortExpression(trimmed);
      const messages =
        mode === "correct"
          ? createCorrectionPrompt(
              trimmed,
              sourceLanguageForTranslation,
              languageLabels,
            )
          : createTranslationPrompt(
              trimmed,
              sourceLanguageForTranslation,
              outputLanguage,
              languageLabels,
              allowAlternatives,
              TRANSLATION_CONFIG.ALTERNATIVES.MAX_COUNT,
            );

      try {
        const result = await fetchTranslation({
          model: selectedModel,
          messages,
          options: TRANSLATION_CONFIG.AI_PARAMS,
        });

        if (current === requestId.current) {
          const normalized = normalizeTranslationResponse(
            result,
            TRANSLATION_CONFIG.ALTERNATIVES.MAX_COUNT,
            allowAlternatives,
            trimmed.includes("```"),
          );
          setTranslatedText(normalized.primary);
          setAlternativeTranslations(normalized.alternatives);
        }
      } catch (error) {
        if (current === requestId.current) {
          setTranslationError(
            error instanceof Error ? error.message : "Unknown error",
          );
          setTranslatedText("");
          setAlternativeTranslations([]);
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
      mode,
      translationError,
      languageLabels,
      setTranslatedText,
      setTranslationError,
    ],
  );

  return {
    translatedText,
    alternativeTranslations,
    detectedSourceLanguage,
    isTranslating,
    translationError,
    setTranslationError,
    translateText,
    setTranslatedText,
  };
};

export default useTranslation;
