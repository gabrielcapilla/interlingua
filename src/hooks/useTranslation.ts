import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { TRANSLATION_CONFIG } from "../config/constants";
import {
  createDiagnosticsRecorder,
  type TranslationDiagnosticsRecorder,
} from "../services/diagnostics";
import { fetchTranslation, type TranslationDeltaHandler } from "../services/ollamaApi";
import {
  getLanguageDetectionSample,
  reassembleTranslationChunks,
  splitIntoTranslationChunks,
  type TranslationChunk,
  TranslationChunkingError,
} from "../services/translationChunking";
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
  normalizeStreamingTranslationResponse,
  normalizeTranslationResponse,
} from "../services/translationResponse";
import type { ProcessingMode, TranslationProgress } from "../types";
import {
  detectMixedLanguageSignal,
  getStrongLanguageSignal,
  normalizeDetectedLanguageCode,
} from "../utils/languageDetection";
import {
  isAbortError,
  isSourceLanguageMismatch,
  parseModelReference,
} from "../utils/transforms";

export {
  createCorrectionPrompt,
  createDetectionPrompt,
  createTranslationPrompt,
} from "../services/translationPrompts";
export {
  normalizeStreamingTranslationResponse,
  normalizeTranslationResponse,
} from "../services/translationResponse";
export { normalizeDetectedLanguageCode } from "../utils/languageDetection";

const scheduleAnimationFrame = (callback: () => void): number => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
};

const cancelScheduledAnimationFrame = (handle: number): void => {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle);
};

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
  translationProgress: TranslationProgress | null;
  translationError: string | null;
  setTranslationError: Dispatch<SetStateAction<string | null>>;
  translateText: (text: string) => Promise<void>;
  cancelTranslation: () => void;
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

const hashText = (text: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${hash >>> 0}`;
};

const createTranslationRequestKey = (
  selectedModel: string,
  inputLanguage: string,
  outputLanguage: string,
  mode: ProcessingMode,
  text: string,
): string =>
  [selectedModel, inputLanguage, outputLanguage, mode, hashText(text)].join("|");

const createDetectionCacheKey = (selectedModel: string, text: string): string =>
  [selectedModel, hashText(text)].join("\u0000");

const detectSourceLanguage = async (
  model: string,
  fullText: string,
  sample: string,
  signal: AbortSignal,
): Promise<DetectionResult> => {
  if (detectMixedLanguageSignal(fullText)) {
    return { code: null, confidence: "high", strategy: "mixed" };
  }

  const strongSignal = getStrongLanguageSignal(fullText);
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
      messages: createDetectionPrompt(sample),
      options: TRANSLATION_CONFIG.AI_PARAMS,
      signal,
    });
    const code = normalizeDetectedLanguageCode(detection);
    return {
      code,
      confidence: code && fullText.trim().split(/\s+/).length >= 3 ? "medium" : "low",
      strategy: "model",
    };
  } catch (error) {
    if (isAbortError(error)) throw error;
    return { code: null, confidence: "low", strategy: "error" };
  }
};

const createChunkFailure = (
  error: unknown,
  chunkIndex: number,
  totalChunks: number,
): Error => {
  const reason = error instanceof Error ? error.message : "Unknown model error";
  return new Error(
    `Translation failed for chunk ${chunkIndex + 1} of ${totalChunks}: ${reason}`,
  );
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
  const [translationProgress, setTranslationProgress] =
    useState<TranslationProgress | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const requestId = useRef(0);
  const isTranslatingRef = useRef(false);
  const requestAbortControllerRef = useRef<AbortController | null>(null);
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

  const cancelTranslation = useCallback(() => {
    requestId.current += 1;
    requestAbortControllerRef.current?.abort();
    requestAbortControllerRef.current = null;
    isTranslatingRef.current = false;
    setIsTranslating(false);
    setTranslationProgress(null);
  }, []);

  const translateText = useCallback(
    async (text: string) => {
      const sourceText = text;
      const trimmed = sourceText.trim();
      if (!trimmed || !selectedModel || isTranslatingRef.current) return;

      const current = ++requestId.current;
      const requestKey = createTranslationRequestKey(
        selectedModel,
        inputLanguage,
        outputLanguage,
        mode,
        sourceText,
      );
      if (requestKey === lastRequestKeyRef.current && !translationError) return;
      lastRequestKeyRef.current = requestKey;

      const controller = new AbortController();
      requestAbortControllerRef.current = controller;
      isTranslatingRef.current = true;
      setIsTranslating(true);
      setTranslationError(null);
      setAlternativeTranslations([]);
      setDetectedSourceLanguage(null);
      setTranslationProgress(null);

      const finishWithError = (message: string): void => {
        if (current !== requestId.current) return;
        setTranslatedText("");
        setAlternativeTranslations([]);
        setTranslationError(message);
      };

      const modelReference = parseModelReference(selectedModel);
      const detectionSample = getLanguageDetectionSample(
        trimmed,
        TRANSLATION_CONFIG.CHUNKING.DETECTION_SOURCE_TOKENS,
      );
      const detectionKey = createDetectionCacheKey(selectedModel, trimmed);
      const cachedDetection = lastDetectionRef.current;
      let detectionResult =
        cachedDetection?.key === detectionKey ? cachedDetection.result : null;
      const detectionStartedAt = performance.now();
      const detectionCacheHit = detectionResult !== null;

      try {
        if (!detectionResult) {
          detectionResult = await detectSourceLanguage(
            selectedModel,
            trimmed,
            detectionSample,
            controller.signal,
          );
          lastDetectionRef.current = { key: detectionKey, result: detectionResult };
        }

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

        if (current !== requestId.current || controller.signal.aborted) return;

        let sourceLanguageForTranslation = inputLanguage;
        const detectedCode =
          detectionResult.confidence === "low" ? null : detectionResult.code;

        if (detectedCode) {
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

        let chunks: TranslationChunk[] = [];
        try {
          chunks = splitIntoTranslationChunks(
            sourceText,
            TRANSLATION_CONFIG.CHUNKING.MAX_SOURCE_TOKENS,
            TRANSLATION_CONFIG.CHUNKING.MAX_CHUNKS,
          );
        } catch (error) {
          const message =
            error instanceof TranslationChunkingError
              ? error.message
              : "The document could not be safely divided for translation.";
          finishWithError(message);
          return;
        }

        if (chunks.length === 0) return;
        setTranslationProgress({ completedChunks: 0, totalChunks: chunks.length });
        const translatedParts: string[] = [];
        const alternatives: string[] = [];
        const allowAlternatives =
          chunks.length === 1 &&
          mode === "translate" &&
          TRANSLATION_CONFIG.ALTERNATIVES.ENABLED &&
          isShortExpression(trimmed);

        for (let index = 0; index < chunks.length; index += 1) {
          const chunk = chunks[index];
          if (!chunk) continue;
          const chunkStartedAt = performance.now();
          let rawChunkResponse = "";
          let streamingFrame: number | null = null;
          const sourceHasCodeFences =
            chunk.text.includes("```") || chunk.text.includes("~~~");
          const commitStreamingPreview = (): void => {
            streamingFrame = null;
            if (current !== requestId.current || controller.signal.aborted) return;
            const preview = normalizeStreamingTranslationResponse(
              rawChunkResponse,
              sourceHasCodeFences,
            );
            const completedPrefix =
              index === 0
                ? chunk.leadingSeparator
                : reassembleTranslationChunks(
                    chunks.slice(0, index),
                    translatedParts.slice(0, index),
                  );
            setTranslatedText(completedPrefix + preview);
          };
          const scheduleStreamingPreview = (): void => {
            if (streamingFrame !== null) return;
            streamingFrame = scheduleAnimationFrame(commitStreamingPreview);
          };
          const flushStreamingPreview = (): void => {
            if (streamingFrame !== null) {
              cancelScheduledAnimationFrame(streamingFrame);
              streamingFrame = null;
            }
            commitStreamingPreview();
          };
          const updateStreamingOutput: TranslationDeltaHandler = (delta) => {
            rawChunkResponse += delta;
            if (current !== requestId.current || controller.signal.aborted) {
              return;
            }
            scheduleStreamingPreview();
          };
          try {
            const messages =
              mode === "correct"
                ? createCorrectionPrompt(
                    chunk.text,
                    sourceLanguageForTranslation,
                    languageLabels,
                  )
                : createTranslationPrompt(
                    chunk.text,
                    sourceLanguageForTranslation,
                    outputLanguage,
                    languageLabels,
                    allowAlternatives,
                    TRANSLATION_CONFIG.ALTERNATIVES.MAX_COUNT,
                  );
            const result = await fetchTranslation({
              model: selectedModel,
              messages,
              options: TRANSLATION_CONFIG.AI_PARAMS,
              signal: controller.signal,
              onDelta: updateStreamingOutput,
            });

            if (current !== requestId.current || controller.signal.aborted) return;
            flushStreamingPreview();
            const normalized = normalizeTranslationResponse(
              result,
              TRANSLATION_CONFIG.ALTERNATIVES.MAX_COUNT,
              allowAlternatives,
              sourceHasCodeFences,
            );
            if (!normalized.primary.trim()) {
              throw new Error("The model returned an empty translation.");
            }
            translatedParts.push(normalized.primary);
            alternatives.push(...normalized.alternatives);
            diagnostics.record({
              provider: modelReference.provider,
              model: modelReference.model,
              phase: "translation",
              outcome: "success",
              inputCharacters: chunk.text.length,
              latencyMs: performance.now() - chunkStartedAt,
            });
            setTranslationProgress({
              completedChunks: index + 1,
              totalChunks: chunks.length,
            });
          } catch (error) {
            if (isAbortError(error) || controller.signal.aborted) throw error;
            diagnostics.record({
              provider: modelReference.provider,
              model: modelReference.model,
              phase: "translation",
              outcome: "error",
              inputCharacters: chunk.text.length,
              latencyMs: performance.now() - chunkStartedAt,
            });
            throw createChunkFailure(error, index, chunks.length);
          } finally {
            if (streamingFrame !== null) {
              cancelScheduledAnimationFrame(streamingFrame);
              streamingFrame = null;
            }
          }
        }

        if (current !== requestId.current || controller.signal.aborted) return;
        setTranslatedText(reassembleTranslationChunks(chunks, translatedParts));
        setAlternativeTranslations(chunks.length === 1 ? alternatives : []);
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) return;
        finishWithError(
          error instanceof Error ? error.message : "Unknown translation error",
        );
      } finally {
        if (current === requestId.current) {
          requestAbortControllerRef.current = null;
          setIsTranslating(false);
          isTranslatingRef.current = false;
          setTranslationProgress(null);
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
    translationProgress,
    translationError,
    setTranslationError,
    translateText,
    cancelTranslation,
    setTranslatedText,
    diagnostics,
  };
};

export default useTranslation;
