import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { TRANSLATION_CONFIG } from "../config/constants";
import {
  createDiagnosticsRecorder,
  type TranslationDiagnosticsRecorder,
} from "../services/diagnostics";
import { fetchTranslation } from "../services/ollamaApi";
import {
  createLanguageMismatchError,
  createSameLanguageError,
} from "../services/translationErrors";
import {
  createCorrectionPrompt,
  createDetectionPrompt,
  createLanguageLabels,
  createTranslationPrompt,
} from "../services/translationPrompts";
import {
  isShortExpression,
  normalizeTranslationResponse,
} from "../services/translationResponse";
import type { ProcessingMode } from "../types";
import {
  detectMixedLanguageSignal,
  getStrongLanguageSignal,
  normalizeDetectedLanguageCode,
} from "../utils/languageDetection";
import { isSourceLanguageMismatch, parseModelReference } from "../utils/transforms";

export {
  createCorrectionPrompt,
  createDetectionPrompt,
  createTranslationPrompt,
} from "../services/translationPrompts";
export { normalizeTranslationResponse } from "../services/translationResponse";
export { normalizeDetectedLanguageCode } from "../utils/languageDetection";

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
  setTranslationError: Dispatch<SetStateAction<string | null>>;
  translateText: (text: string) => Promise<void>;
  setTranslatedText: Dispatch<SetStateAction<string>>;
  diagnostics: TranslationDiagnosticsRecorder;
}

type DetectionConfidence = "high" | "medium" | "low";
type DetectionStrategy = "strong-signal" | "mixed" | "model" | "error";
type DetectionResult = {
  code: string | null;
  confidence: DetectionConfidence;
  strategy: DetectionStrategy;
};

const createTranslationRequestKey = (
  selectedModel: string,
  inputLanguage: string,
  outputLanguage: string,
  mode: ProcessingMode,
  text: string,
): string => [selectedModel, inputLanguage, outputLanguage, mode, text].join("|");

const createDetectionCacheKey = (selectedModel: string, text: string): string =>
  [selectedModel, text].join("\u0000");

const detectSourceLanguage = async (
  model: string,
  text: string,
): Promise<DetectionResult> => {
  if (detectMixedLanguageSignal(text)) {
    return { code: null, confidence: "high", strategy: "mixed" };
  }

  const strongSignal = getStrongLanguageSignal(text);
  if (strongSignal) {
    return {
      code: strongSignal.language,
      confidence: strongSignal.confidence,
      strategy: "strong-signal",
    };
  }

  try {
    const detection = await fetchTranslation({
      model,
      messages: createDetectionPrompt(text),
      options: TRANSLATION_CONFIG.AI_PARAMS,
    });
    const code = normalizeDetectedLanguageCode(detection);
    return {
      code,
      confidence: code && text.trim().split(/\s+/).length >= 3 ? "medium" : "low",
      strategy: "model",
    };
  } catch {
    return { code: null, confidence: "low", strategy: "error" };
  }
};

const useTranslation = ({
  selectedModel,
  inputLanguage,
  outputLanguage,
  mode,
}: UseTranslationProps): UseTranslationReturn => {
  const [translatedText, setTranslatedText] = useState("");
  const [alternativeTranslations, setAlternativeTranslations] = useState<string[]>([]);
  const [detectedSourceLanguage, setDetectedSourceLanguage] = useState<string | null>(
    null,
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const requestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const lastRequestKeyRef = useRef("");
  const lastDetectionRef = useRef<{
    key: string;
    result: DetectionResult;
  } | null>(null);

  const languageLabels = useMemo(createLanguageLabels, []);
  const diagnostics = useMemo(
    () => createDiagnosticsRecorder(TRANSLATION_CONFIG.DIAGNOSTICS.ENABLED),
    [],
  );

  const translateText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !selectedModel || isTranslatingRef.current) return;

      const current = ++requestId.current;
      const requestKey = createTranslationRequestKey(
        selectedModel,
        inputLanguage,
        outputLanguage,
        mode,
        trimmed,
      );
      if (requestKey === lastRequestKeyRef.current && !translationError) return;
      lastRequestKeyRef.current = requestKey;

      isTranslatingRef.current = true;
      setIsTranslating(true);
      setTranslationError(null);
      setAlternativeTranslations([]);
      setDetectedSourceLanguage(null);

      const finishWithError = (message: string): void => {
        if (current !== requestId.current) return;
        setTranslatedText("");
        setAlternativeTranslations([]);
        setTranslationError(message);
        setIsTranslating(false);
        isTranslatingRef.current = false;
      };

      let sourceLanguageForTranslation = inputLanguage;
      const detectionKey = createDetectionCacheKey(selectedModel, trimmed);
      const cachedDetection = lastDetectionRef.current;
      let detectionResult =
        cachedDetection?.key === detectionKey ? cachedDetection.result : null;
      const detectionStartedAt = performance.now();
      const detectionCacheHit = detectionResult !== null;

      if (!detectionResult) {
        detectionResult = await detectSourceLanguage(selectedModel, trimmed);
        lastDetectionRef.current = { key: detectionKey, result: detectionResult };
      }

      const modelReference = parseModelReference(selectedModel);
      diagnostics.record({
        provider: modelReference.provider,
        model: modelReference.model,
        phase: "detection",
        outcome:
          detectionResult.strategy === "error"
            ? "error"
            : detectionResult.strategy === "mixed"
              ? "abstained"
              : detectionResult.code
                ? "success"
                : "unknown",
        inputCharacters: trimmed.length,
        latencyMs: performance.now() - detectionStartedAt,
        cacheHit: detectionCacheHit,
        confidence: detectionResult.confidence,
      });

      const detectedCode =
        detectionResult?.confidence === "low" ? null : detectionResult?.code;

      if (detectedCode) {
        if (current !== requestId.current) return;
        setDetectedSourceLanguage(detectedCode);

        if (inputLanguage === "auto") {
          sourceLanguageForTranslation = detectedCode;
        } else if (isSourceLanguageMismatch(inputLanguage, detectedCode)) {
          diagnostics.record({
            provider: modelReference.provider,
            model: modelReference.model,
            phase: "translation",
            outcome: "mismatch",
            inputCharacters: trimmed.length,
            latencyMs: 0,
          });
          finishWithError(
            createLanguageMismatchError(inputLanguage, detectedCode, languageLabels),
          );
          return;
        }
      } else if (inputLanguage === "auto") {
        sourceLanguageForTranslation = "auto";
      }

      if (
        mode === "translate" &&
        sourceLanguageForTranslation !== "auto" &&
        sourceLanguageForTranslation === outputLanguage
      ) {
        const languageLabel =
          languageLabels[sourceLanguageForTranslation] ??
          sourceLanguageForTranslation.toUpperCase();
        diagnostics.record({
          provider: modelReference.provider,
          model: modelReference.model,
          phase: "translation",
          outcome: "same-language",
          inputCharacters: trimmed.length,
          latencyMs: 0,
        });
        finishWithError(createSameLanguageError(languageLabel));
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

      const translationStartedAt = performance.now();
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
        diagnostics.record({
          provider: modelReference.provider,
          model: modelReference.model,
          phase: "translation",
          outcome: "success",
          inputCharacters: trimmed.length,
          latencyMs: performance.now() - translationStartedAt,
        });
      } catch (error) {
        diagnostics.record({
          provider: modelReference.provider,
          model: modelReference.model,
          phase: "translation",
          outcome: "error",
          inputCharacters: trimmed.length,
          latencyMs: performance.now() - translationStartedAt,
        });
        if (current === requestId.current) {
          setTranslationError(error instanceof Error ? error.message : "Unknown error");
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
      diagnostics,
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
    diagnostics,
  };
};

export default useTranslation;
