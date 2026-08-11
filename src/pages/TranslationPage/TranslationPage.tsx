import type { ChangeEvent, FC } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../components/atoms/Button";
import { AppHeader } from "../../components/molecules/AppHeader";
import { CustomDropdown } from "../../components/molecules/CustomDropdown";
import { AppFooter } from "../../components/molecules/Footer";
import { TranslationIO } from "../../components/organisms/TranslationIO";
import { TRANSLATION_CONFIG } from "../../config/constants";
import { languageOptions } from "../../data";
import {
  useLanguageSelection,
  useOllamaModels,
  useToast,
  useTranslation,
} from "../../hooks";
import { estimateTokenCount } from "../../services/translationChunking";
import type { LanguageCode, ProcessingMode } from "../../types";
import { createLatestRequestScheduler } from "../../utils/latestRequest";
import {
  countWords,
  filterOutputLanguages,
  findOptionByValue,
  shouldScheduleAutoTranslation,
} from "../../utils/transforms";

const FILE_INPUT_ACCEPT = ".txt,.md,.json,.html,.csv,.xml,.rtf";
const AUTO_TRANSLATE_DELAY_MS = 750;

export const TranslationPage: FC = () => {
  const [inputText, setInputText] = useState("");
  const [mode, setMode] = useState<ProcessingMode>("translate");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const {
    ollamaModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    modelError,
    dropdownPlaceholder,
    favoriteModel,
    setFavoriteModel,
  } = useOllamaModels();

  const {
    inputLanguage,
    setInputLanguage,
    outputLanguage,
    setOutputLanguage,
    handleLanguageSwap,
  } = useLanguageSelection();

  const outputLanguageOptions = useMemo(
    () => filterOutputLanguages(languageOptions, inputLanguage),
    [inputLanguage],
  );
  const effectiveOutputLanguage = useMemo(() => {
    if (outputLanguageOptions.some(({ value }) => value === outputLanguage)) {
      return outputLanguage;
    }

    return outputLanguageOptions[0]?.value ?? outputLanguage;
  }, [outputLanguage, outputLanguageOptions]);

  const {
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
  } = useTranslation({
    selectedModel,
    inputLanguage,
    outputLanguage: effectiveOutputLanguage,
    mode,
  });

  const estimatedInputTokens = useMemo(
    () => estimateTokenCount(inputText),
    [inputText],
  );
  const isLargeAutoTranslation =
    estimatedInputTokens > TRANSLATION_CONFIG.CHUNKING.AUTO_TRANSLATE_MAX_SOURCE_TOKENS;
  const lastAutoRequestText = useRef("");
  const previousInputTextRef = useRef(inputText);
  const translationResetKey = [mode, inputLanguage, outputLanguage, selectedModel].join(
    "\u0000",
  );
  const translateTextRef = useRef(translateText);
  translateTextRef.current = translateText;
  const autoRequestSchedulerRef = useRef<ReturnType<
    typeof createLatestRequestScheduler
  > | null>(null);
  if (!autoRequestSchedulerRef.current) {
    autoRequestSchedulerRef.current = createLatestRequestScheduler((text) =>
      translateTextRef.current(text),
    );
  }
  const isCorrectMode = mode === "correct";
  const hasManualSourceLanguage = inputLanguage !== "auto";
  const isFavoriteModel = selectedModel === favoriteModel;
  const actionLabel = isCorrectMode ? "Correct" : "Translate";
  const actionLabelLower = actionLabel.toLowerCase();

  const handleTranslateClick = useCallback(() => {
    if (!inputText.trim() || !selectedModel || isTranslating) return;
    translateText(inputText);
  }, [inputText, selectedModel, isTranslating, translateText]);

  const clearTranslation = useCallback(() => {
    cancelTranslation();
    setTranslatedText("");
    setTranslationError(null);
  }, [cancelTranslation, setTranslatedText, setTranslationError]);

  const handleClearInput = useCallback(() => {
    setInputText("");
    clearTranslation();
  }, [clearTranslation]);

  useEffect(() => {
    if (!inputText.trim()) {
      clearTranslation();
      lastAutoRequestText.current = "";
      autoRequestSchedulerRef.current?.clearPending();
      return;
    }

    if (
      inputLanguage === "auto" &&
      selectedModel &&
      !isLargeAutoTranslation &&
      shouldScheduleAutoTranslation(inputText, lastAutoRequestText.current)
    ) {
      const timer = setTimeout(() => {
        if (!shouldScheduleAutoTranslation(inputText, lastAutoRequestText.current))
          return;
        lastAutoRequestText.current = inputText;
        autoRequestSchedulerRef.current?.enqueue(inputText);
      }, AUTO_TRANSLATE_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [
    inputText,
    selectedModel,
    inputLanguage,
    clearTranslation,
    isLargeAutoTranslation,
  ]);

  useEffect(() => {
    if (previousInputTextRef.current !== inputText) cancelTranslation();
    previousInputTextRef.current = inputText;
  }, [inputText, cancelTranslation]);

  useEffect(() => {
    void translationResetKey;
    clearTranslation();
    lastAutoRequestText.current = "";
    autoRequestSchedulerRef.current?.clearPending();
  }, [translationResetKey, clearTranslation]);

  useEffect(
    () => () => {
      cancelTranslation();
      autoRequestSchedulerRef.current?.dispose();
    },
    [cancelTranslation],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "Enter" &&
        (inputLanguage !== "auto" || isLargeAutoTranslation)
      ) {
        e.preventDefault();
        handleTranslateClick();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inputLanguage, isLargeAutoTranslation, handleTranslateClick]);

  useEffect(() => {
    if (modelError) {
      addToast({
        variant: modelError.startsWith("No models found") ? "warning" : "error",
        title: "Model Error",
        message: modelError,
      });
    }
    if (translationError) {
      addToast({
        variant: "error",
        title: "Translation Error",
        message: translationError,
      });
      setTranslationError(null);
    }
  }, [modelError, translationError, addToast, setTranslationError]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setTranslationError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          setInputText(text);
          setTranslatedText("");
        } catch (error) {
          addToast({
            variant: "error",
            title: "File Error",
            message: `Error processing file: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      };

      reader.onerror = () =>
        addToast({
          variant: "error",
          title: "File Error",
          message: `Error reading file: ${file.name}`,
        });

      reader.readAsText(file);
      if (event.target) event.target.value = "";
    },
    [addToast, setTranslatedText, setTranslationError],
  );

  const handleFavoriteToggle = useCallback(() => {
    if (!selectedModel) return;
    setFavoriteModel(isFavoriteModel ? "" : selectedModel);
  }, [isFavoriteModel, selectedModel, setFavoriteModel]);

  const handleCopySuccess = useCallback(
    () =>
      addToast({
        variant: "success",
        title: "Success",
        message: isCorrectMode
          ? "Corrected text copied to clipboard."
          : "Translated text copied to clipboard.",
      }),
    [addToast, isCorrectMode],
  );

  const handleCopyError = useCallback(
    () =>
      addToast({
        variant: "error",
        title: "Copy Failed",
        message: "Could not copy text to clipboard.",
      }),
    [addToast],
  );

  const handleSelectAlternative = useCallback(
    (text: string) => setTranslatedText(text),
    [setTranslatedText],
  );

  const characterCount = inputText.length;
  const wordCount = useMemo(() => countWords(inputText), [inputText]);

  const detectedLanguageLabel = useMemo(
    () =>
      detectedSourceLanguage
        ? (findOptionByValue(languageOptions, detectedSourceLanguage)?.label ??
          detectedSourceLanguage.toUpperCase())
        : null,
    [detectedSourceLanguage],
  );
  const inputLanguageLabel = useMemo(() => {
    const baseLabel =
      findOptionByValue(languageOptions, inputLanguage)?.label ?? "Source";

    if (inputLanguage === "auto" && detectedLanguageLabel) {
      return `${baseLabel} (Detected: ${detectedLanguageLabel})`;
    }

    return baseLabel;
  }, [inputLanguage, detectedLanguageLabel]);
  const outputLanguageLabel = useMemo(
    () =>
      isCorrectMode
        ? "Corrected Text"
        : (findOptionByValue(languageOptions, effectiveOutputLanguage)?.label ??
          "Translation"),
    [effectiveOutputLanguage, isCorrectMode],
  );
  const isModelSelectorDisabled =
    isLoadingModels || !!modelError || ollamaModels.length === 0;

  return (
    <div className="page-container">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept={FILE_INPUT_ACCEPT}
      />
      <AppHeader title="Interlingua" />
      <main className="main-content">
        <div className="controls-container">
          <div className="language-bar">
            <div className="language-selectors">
              <CustomDropdown
                className="language-selectors_dropdown"
                options={languageOptions}
                value={inputLanguage}
                onChange={(value) => setInputLanguage(value as LanguageCode)}
                aria-label="Select input language"
                columns={2}
              />
              <Button
                variant="transparent"
                buttonShape="circular"
                iconOnly
                onClick={handleLanguageSwap}
                aria-label="Swap languages"
                title={
                  isCorrectMode
                    ? "Swap is disabled in Correct mode"
                    : inputLanguage === "auto"
                      ? "Cannot swap with Auto-Detect"
                      : "Swap languages"
                }
                disabled={!hasManualSourceLanguage || isCorrectMode}
              >
                ⇆
              </Button>
              <CustomDropdown
                className="language-selectors_dropdown"
                options={outputLanguageOptions}
                value={effectiveOutputLanguage}
                onChange={(value) => setOutputLanguage(value as LanguageCode)}
                aria-label="Select output language"
                columns={2}
                disabled={isCorrectMode}
              />
            </div>
            <div
              className={`model-selector ${isModelSelectorDisabled ? "model-selector_disabled" : ""}`}
            >
              <CustomDropdown
                className="model-selector_dropdown"
                options={ollamaModels}
                value={selectedModel}
                onChange={setSelectedModel}
                placeholder={dropdownPlaceholder}
                aria-label="Select AI Model"
                disabled={isModelSelectorDisabled}
              />
              <Button
                variant="transparent"
                iconOnly
                buttonShape="circular"
                onClick={handleFavoriteToggle}
                disabled={!selectedModel || isLoadingModels}
                title={
                  isFavoriteModel ? "Unset as favorite model" : "Set as favorite model"
                }
                aria-label={
                  isFavoriteModel ? "Unset as favorite model" : "Set as favorite model"
                }
                className="model-selector_favorite-button"
              >
                {isFavoriteModel ? "★" : "☆"}
              </Button>
            </div>
          </div>
        </div>

        <TranslationIO
          inputText={inputText}
          setInputText={setInputText}
          translatedText={translatedText}
          isTranslating={isTranslating}
          inputLanguageLabel={inputLanguageLabel}
          outputLanguageLabel={outputLanguageLabel}
          characterCount={characterCount}
          wordCount={wordCount}
          onClearInput={handleClearInput}
          translationProgress={translationProgress}
          onCancelTranslation={cancelTranslation}
          onCopySuccess={handleCopySuccess}
          onCopyError={handleCopyError}
          alternativeTranslations={alternativeTranslations}
          onSelectAlternative={handleSelectAlternative}
        />

        <div className="action-buttons">
          <div className="action-buttons_left">
            <div className="mode-toggle" role="tablist" aria-label="Processing mode">
              <Button
                variant="transparent"
                onClick={() => setMode("translate")}
                className={`mode-toggle_button ${!isCorrectMode ? "mode-toggle_button-active" : ""}`}
                aria-label="Translate mode"
                aria-pressed={!isCorrectMode}
              >
                Translate
              </Button>
              <Button
                variant="transparent"
                onClick={() => setMode("correct")}
                className={`mode-toggle_button ${isCorrectMode ? "mode-toggle_button-active" : ""}`}
                aria-label="Correct mode"
                aria-pressed={isCorrectMode}
              >
                Correct
              </Button>
            </div>
          </div>
          <div className="action-buttons_right">
            <Button
              variant={hasManualSourceLanguage ? "secondary" : "primary"}
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranslating}
            >
              {isCorrectMode ? "Correct Document" : "Translate Document"}
            </Button>
            {(hasManualSourceLanguage || isLargeAutoTranslation) && (
              <Button
                variant="primary"
                onClick={handleTranslateClick}
                disabled={
                  !inputText.trim() || isTranslating || !selectedModel || !!modelError
                }
                title={
                  !selectedModel || modelError
                    ? `A model must be selected to ${actionLabelLower}`
                    : `${actionLabel} the input text (Ctrl+Enter)`
                }
              >
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};
