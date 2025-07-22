import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useOllamaModels, useLanguageSelection, useTranslation, useToast } from '../../hooks';
import { languageOptions, MAX_INPUT_CHARACTERS } from '../../config/constants';
import { TranslationIO } from '../../components/organisms/TranslationIO';
import { AppHeader } from '../../components/molecules/AppHeader';
import { AppFooter } from '../../components/molecules/Footer';
import { Button } from '../../components/atoms/Button';
import { CustomDropdown } from '../../components/molecules/CustomDropdown';

const fileInputAccept = '.txt,.md,.json,.html,.csv,.xml,.rtf';

/**
 * @description Renders the main translation page, acting as the primary container and controller for the application. It integrates various hooks for state management and orchestrates the UI components for text input, file uploads, language/model selection, and initiating translations.
 * @returns {React.ReactElement} The fully rendered translation page component.
 * @interactions
 * - **React Hooks:** Utilizes `useState` for `inputText`, `useRef` for the file input, `useMemo` for derived language labels, and `useCallback` for memoizing event handlers.
 * - **Custom Hooks:**
 *   - `useOllamaModels`: Manages all state related to fetching, selecting, and handling errors for AI models, including a "favorite" model feature.
 *   - `useLanguageSelection`: Manages the source and target language states and their swapping.
 *   - `useTranslation`: Manages the core translation logic, including the API call, loading state, and result.
 *   - `useToast`: Provides a function to trigger global toast notifications for feedback.
 * - **Components:**
 *   - `AppHeader`: Renders the static title of the page.
 *   - `CustomDropdown`: Used for selecting the input language, output language, and AI model.
 *   - `Button`: Used for triggering actions like swapping languages, loading a document, setting a favorite model, and starting a translation.
 *   - `TranslationIO`: The main organism for text input and displaying translation output, which receives state and callbacks from this page.
 *   - `AppFooter`: Renders the application footer with branding and credit information.
 * - **State Management:**
 *   - `inputText`: A local state holding the text to be translated.
 *   - It serves as the source of truth for props passed down to child components and for the arguments passed to the hooks.
 * - **Browser API:**
 *   - `FileReader`: Used within `handleFileChange` to read the content of user-selected text files.
 *   - `HTMLInputElement (type="file")`: A hidden file input, programmatically clicked to open the file dialog.
 * - **Constants:** Imports `languageOptions` and `fileInputAccept` for configuring UI elements.
 */
export const TranslationPage: React.FC = () => {
  const [inputText, setInputText] = useState('');
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
    isTranslating,
    translationError,
    setTranslationError,
    translateText,
    setTranslatedText,
  } = useTranslation({ selectedModel, inputLanguage, outputLanguage });

  const isOverLimit = inputText.length > MAX_INPUT_CHARACTERS;

  const handleTranslateClick = useCallback(() => {
    if (!inputText.trim() || !selectedModel || isTranslating || isOverLimit) {
      return;
    }
    translateText(inputText);
  }, [inputText, selectedModel, isTranslating, translateText, isOverLimit]);

  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText('');
      setTranslationError(null);
      return;
    }

    if (inputLanguage === 'auto') {
      if (!selectedModel || isOverLimit) {
        return;
      }

      const timerId = setTimeout(() => {
        translateText(inputText);
      }, 750);

      return () => {
        clearTimeout(timerId);
      };
    }
  }, [inputText, selectedModel, inputLanguage, translateText, setTranslatedText, setTranslationError, isOverLimit]);

  useEffect(() => {
    if (inputLanguage !== 'auto') {
      setTranslatedText('');
      setTranslationError(null);
    }
  }, [inputLanguage, outputLanguage, setTranslatedText, setTranslationError]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Enter or Cmd+Enter for manual translation
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (inputLanguage !== 'auto') {
          event.preventDefault();
          handleTranslateClick();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputLanguage, handleTranslateClick]);

  useEffect(() => {
    if (modelError) {
      addToast({
        variant: modelError.startsWith('No Ollama models found') ? 'warning' : 'error',
        title: 'Model Error',
        message: modelError,
      });
    }
  }, [modelError, addToast]);

  useEffect(() => {
    if (translationError) {
      addToast({
        variant: 'error',
        title: 'Translation Error',
        message: translationError,
      });
      // Clear the error after showing it so it doesn't re-appear on re-render.
      setTranslationError(null);
    }
  }, [translationError, addToast, setTranslationError]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTranslationError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (text.length > MAX_INPUT_CHARACTERS) {
          addToast({
            variant: 'error',
            title: 'File Too Large',
            message: `File content exceeds the character limit of ${MAX_INPUT_CHARACTERS.toLocaleString()}.`,
          });
          return;
        }
        setInputText(text);
        setTranslatedText('');
      } catch (readError) {
        const message = `Error processing file: ${readError instanceof Error ? readError.message : 'Unknown error'}`;
        addToast({ variant: 'error', title: 'File Error', message });
      }
    };
    reader.onerror = () => {
      const message = `Error reading file: ${file.name}`;
      addToast({ variant: 'error', title: 'File Error', message });
    };
    reader.readAsText(file);

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleLoadDocument = () => {
    fileInputRef.current?.click();
  };

  const handleClear = useCallback(() => {
    setInputText('');
    setTranslatedText('');
    setTranslationError(null);
  }, [setTranslatedText, setTranslationError]);

  const handleFavoriteClick = () => {
    if (!selectedModel) return;
    const newFavorite = selectedModel === favoriteModel ? '' : selectedModel;
    setFavoriteModel(newFavorite);
    // Perhaps this is redundant??
    // addToast({
    //   variant: 'info',
    //   title: 'Favorite Model',
    //   message: newFavorite ? `Set '${newFavorite}' as favorite.` : 'Favorite model cleared.',
    //   duration: 3000,
    // });
  };

  const characterCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const outputLanguageOptions = useMemo(() =>
    languageOptions.filter(option => option.value !== 'auto'),
    []
  );

  const inputLanguageLabel = useMemo(() =>
    languageOptions.find(l => l.value === inputLanguage)?.label || 'Source',
    [inputLanguage]
  );

  const outputLanguageLabel = useMemo(() =>
    languageOptions.find(l => l.value === outputLanguage)?.label || 'Translation',
    [outputLanguage]
  );

  const isModelSelectorDisabled = isLoadingModels || !!modelError || ollamaModels.length === 0;

  const getTranslateButtonTitle = () => {
    if (isOverLimit) return `Input exceeds character limit of ${MAX_INPUT_CHARACTERS.toLocaleString()}`;
    if (!selectedModel || !!modelError) return "A model must be selected to translate";
    return "Translate the input text (Ctrl+Enter)";
  };

  return (
    <div className="page-container">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept={fileInputAccept}
      />
      <AppHeader title="Interlingua" />
      <main className="main-content">
        <div className="controls-container">
          <div className="language-bar">
            <div className="language-selectors">
              <CustomDropdown
                className="language-selectors__dropdown"
                options={languageOptions}
                value={inputLanguage}
                onChange={(value) => setInputLanguage(value)}
                aria-label="Select input language"
                columns={2}
              />
              <Button
                variant="transparent"
                buttonShape="circular"
                iconOnly
                onClick={handleLanguageSwap}
                aria-label="Swap languages"
                title={inputLanguage === 'auto' ? "Cannot swap with Auto-Detect" : "Swap languages"}
                disabled={inputLanguage === 'auto'}
              >
                ⇆
              </Button>
              <CustomDropdown
                className="language-selectors__dropdown"
                options={outputLanguageOptions}
                value={outputLanguage}
                onChange={(value) => setOutputLanguage(value)}
                aria-label="Select output language"
                columns={2}
              />
            </div>
            <div className={`model-selector ${isModelSelectorDisabled ? 'model-selector--disabled' : ''}`}>
              <CustomDropdown
                className="model-selector__dropdown"
                options={ollamaModels}
                value={selectedModel}
                onChange={(value) => setSelectedModel(value)}
                placeholder={dropdownPlaceholder}
                aria-label="Select AI Model"
                disabled={isModelSelectorDisabled}
              />
              <Button
                variant="transparent"
                iconOnly
                buttonShape="circular"
                onClick={handleFavoriteClick}
                disabled={!selectedModel || isLoadingModels}
                title={selectedModel === favoriteModel ? "Unset as favorite model" : "Set as favorite model"}
                aria-label={selectedModel === favoriteModel ? "Unset as favorite model" : "Set as favorite model"}
                className="model-selector__favorite-button"
              >
                {selectedModel && selectedModel === favoriteModel ? '★' : '☆'}
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
          onClearInput={handleClear}
          isOverLimit={isOverLimit}
          maxCharacters={MAX_INPUT_CHARACTERS}
        />

        <div className="action-buttons">
          <Button
            variant={inputLanguage !== 'auto' ? 'secondary' : 'primary'}
            onClick={handleLoadDocument}
            disabled={isTranslating}
          >
            Translate Document
          </Button>
          {inputLanguage !== 'auto' && (
            <Button
              variant="primary"
              onClick={handleTranslateClick}
              disabled={!inputText.trim() || isTranslating || !selectedModel || !!modelError || isOverLimit}
              title={getTranslateButtonTitle()}
            >
              Translate
            </Button>
          )}
        </div>

      </main>
      <AppFooter />
    </div>
  );
};
