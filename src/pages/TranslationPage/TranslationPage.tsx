import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  useOllamaModels,
  useLanguageSelection,
  useTranslation,
  useToast,
} from "../../hooks";
import { MAX_INPUT_CHARACTERS } from "../../config/constants";
import { languageOptions } from "../../data";
import { TranslationIO } from "../../components/organisms/TranslationIO";
import { AppHeader } from "../../components/molecules/AppHeader";
import { AppFooter } from "../../components/molecules/Footer";
import { Button } from "../../components/atoms/Button";
import { CustomDropdown } from "../../components/molecules/CustomDropdown";
import {
  countWords,
  filterAutoLanguage,
  findOptionByValue,
} from "../../utils/transforms";
import { LanguageCode, ProcessingMode } from "../../types";

const FILE_INPUT_ACCEPT = ".txt,.md,.json,.html,.csv,.xml,.rtf";

export const TranslationPage: React.FC = () => {
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

  const {
    translatedText,
    alternativeTranslations,
    detectedSourceLanguage,
    isTranslating,
    translationError,
    setTranslationError,
    translateText,
    setTranslatedText,
  } = useTranslation({ selectedModel, inputLanguage, outputLanguage, mode });

  const isOverLimit = inputText.length > MAX_INPUT_CHARACTERS;
  const lastAutoRequestText = useRef("");

  const handleTranslateClick = useCallback(() => {
    if (!inputText.trim() || !selectedModel || isTranslating || isOverLimit)
      return;
    translateText(inputText);
  }, [inputText, selectedModel, isTranslating, translateText, isOverLimit]);

  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText("");
      setTranslationError(null);
      lastAutoRequestText.current = "";
      return;
    }

    if (inputLanguage === "auto" && selectedModel && !isOverLimit) {
      if (inputText === lastAutoRequestText.current) return;
      const timer = setTimeout(() => {
        lastAutoRequestText.current = inputText;
        translateText(inputText);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [
    inputText,
    selectedModel,
    inputLanguage,
    translateText,
    setTranslatedText,
    setTranslationError,
    isOverLimit,
  ]);

  useEffect(() => {
    setTranslatedText("");
    setTranslationError(null);
    lastAutoRequestText.current = "";
  }, [
    mode,
    inputLanguage,
    outputLanguage,
    selectedModel,
    setTranslatedText,
    setTranslationError,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "Enter" &&
        inputLanguage !== "auto"
      ) {
        e.preventDefault();
        handleTranslateClick();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inputLanguage, handleTranslateClick]);

  useEffect(() => {
    if (modelError) {
      addToast({
        variant: modelError.startsWith("No Ollama models found")
          ? "warning"
          : "error",
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setTranslationError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (text.length > MAX_INPUT_CHARACTERS) {
            return addToast({
              variant: "error",
              title: "File Too Large",
              message: `File content exceeds the character limit of ${MAX_INPUT_CHARACTERS.toLocaleString()}.`,
            });
          }
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
    [addToast, setInputText, setTranslatedText],
  );

  const characterCount = inputText.length;
  const wordCount = useMemo(() => countWords(inputText), [inputText]);

  const outputLanguageOptions = useMemo(
    () => filterAutoLanguage(languageOptions),
    [],
  );
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
      mode === "correct"
        ? "Corrected Text"
        : (findOptionByValue(languageOptions, outputLanguage)?.label ??
          "Translation"),
    [outputLanguage, mode],
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
                  mode === "correct"
                    ? "Swap is disabled in Correct mode"
                    : inputLanguage === "auto"
                    ? "Cannot swap with Auto-Detect"
                    : "Swap languages"
                }
                disabled={inputLanguage === "auto" || mode === "correct"}
              >
                ⇆
              </Button>
              <CustomDropdown
                className="language-selectors_dropdown"
                options={outputLanguageOptions}
                value={outputLanguage}
                onChange={(value) => setOutputLanguage(value as LanguageCode)}
                aria-label="Select output language"
                columns={2}
                disabled={mode === "correct"}
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
                onClick={() =>
                  selectedModel &&
                  setFavoriteModel(
                    selectedModel === favoriteModel ? "" : selectedModel,
                  )
                }
                disabled={!selectedModel || isLoadingModels}
                title={
                  selectedModel === favoriteModel
                    ? "Unset as favorite model"
                    : "Set as favorite model"
                }
                aria-label={
                  selectedModel === favoriteModel
                    ? "Unset as favorite model"
                    : "Set as favorite model"
                }
                className="model-selector_favorite-button"
              >
                {selectedModel === favoriteModel ? "★" : "☆"}
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
          onClearInput={() => {
            setInputText("");
            setTranslatedText("");
            setTranslationError(null);
          }}
          isOverLimit={isOverLimit}
          maxCharacters={MAX_INPUT_CHARACTERS}
          onCopySuccess={() =>
            addToast({
              variant: "success",
              title: "Success",
              message:
                mode === "correct"
                  ? "Corrected text copied to clipboard."
                  : "Translated text copied to clipboard.",
            })
          }
          onCopyError={() =>
            addToast({
              variant: "error",
              title: "Copy Failed",
              message: "Could not copy text to clipboard.",
            })
          }
          alternativeTranslations={alternativeTranslations}
          onSelectAlternative={(text) => setTranslatedText(text)}
        />

        <div className="action-buttons">
          <div className="action-buttons_left">
            <div
              className="mode-toggle"
              role="tablist"
              aria-label="Processing mode"
            >
              <Button
                variant="transparent"
                onClick={() => setMode("translate")}
                className={`mode-toggle_button ${mode === "translate" ? "mode-toggle_button-active" : ""}`}
                aria-label="Translate mode"
                aria-pressed={mode === "translate"}
              >
                Translate
              </Button>
              <Button
                variant="transparent"
                onClick={() => setMode("correct")}
                className={`mode-toggle_button ${mode === "correct" ? "mode-toggle_button-active" : ""}`}
                aria-label="Correct mode"
                aria-pressed={mode === "correct"}
              >
                Correct
              </Button>
            </div>
          </div>
          <div className="action-buttons_right">
            <Button
              variant={inputLanguage !== "auto" ? "secondary" : "primary"}
              onClick={() => fileInputRef.current?.click()}
              disabled={isTranslating}
            >
              {mode === "correct" ? "Correct Document" : "Translate Document"}
            </Button>
            {inputLanguage !== "auto" && (
              <Button
                variant="primary"
                onClick={handleTranslateClick}
                disabled={
                  !inputText.trim() ||
                  isTranslating ||
                  !selectedModel ||
                  !!modelError ||
                  isOverLimit
                }
                title={
                  isOverLimit
                    ? `Input exceeds character limit of ${MAX_INPUT_CHARACTERS.toLocaleString()}`
                    : !selectedModel || modelError
                      ? `A model must be selected to ${mode === "correct" ? "correct" : "translate"}`
                      : `${mode === "correct" ? "Correct" : "Translate"} the input text (Ctrl+Enter)`
                }
              >
                {mode === "correct" ? "Correct" : "Translate"}
              </Button>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
};
