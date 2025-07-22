import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useOllamaModels, useLanguageSelection, useTranslation } from '../../hooks';
import { languageOptions } from '../../config/constants';
import { TranslationIO } from '../../components/organisms/TranslationIO';
import { AppHeader } from '../../components/molecules/AppHeader';
import { AppFooter } from '../../components/molecules/Footer';
import { Button } from '../../components/atoms/Button';
import { Dropdown } from '../../components/atoms/Dropdown';

const fileInputAccept = '.txt,.md,.json,.html,.csv,.xml,.rtf';

/**
 * @description Renders the main translation page, acting as the primary container and controller for the application. It integrates various hooks for state management and orchestrates the UI components for text input, file uploads, language/model selection, and initiating translations.
 * @returns {React.ReactElement} The fully rendered translation page component.
 * @interactions
 * - **React Hooks:** Utilizes `useState` for `inputText`, `useRef` for the file input, `useMemo` for derived language labels, and `useCallback` for memoizing event handlers.
 * - **Custom Hooks:**
 *   - `useOllamaModels`: Manages all state related to fetching, selecting, and handling errors for AI models.
 *   - `useLanguageSelection`: Manages the source and target language states and their swapping.
 *   - `useTranslation`: Manages the core translation logic, including the API call, loading state, and result.
 * - **Components:**
 *   - `AppHeader`: Renders the static title of the page.
 *   - `Dropdown`: Used for selecting the input language, output language, and AI model.
 *   - `Button`: Used for triggering actions like swapping languages, loading a document, and starting a translation.
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

  const {
    ollamaModels,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    modelError,
    dropdownPlaceholder,
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

  useEffect(() => {
    // If there's no input text, clear everything and do nothing.
    if (!inputText.trim()) {
      setTranslatedText('');
      setTranslationError(null);
      return;
    }

    // Do not proceed if no model is selected. The isTranslating check
    // is handled within the translateText hook itself.
    if (!selectedModel) {
      return;
    }

    // Set a timer to trigger the translation.
    const timerId = setTimeout(() => {
      translateText(inputText);
    }, 750); // 750ms debounce delay

    // Cleanup function: if the component re-renders (e.g., user types again),
    // clear the previously set timer.
    return () => {
      clearTimeout(timerId);
    };
  }, [inputText, selectedModel, translateText, setTranslatedText, setTranslationError]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTranslationError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setInputText(text);
        setTranslatedText('');
      } catch (readError) {
        setTranslationError(`Error processing file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
      }
    };
    reader.onerror = () => {
      setTranslationError(`Error reading file: ${file.name}`);
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
              <Dropdown
                className="language-selectors__dropdown"
                options={languageOptions}
                value={inputLanguage}
                onChange={(e) => setInputLanguage(e.target.value)}
                aria-label="Select input language"
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
              <Dropdown
                className="language-selectors__dropdown"
                options={outputLanguageOptions}
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                aria-label="Select output language"
              />
            </div>
            <Dropdown
              className="model-selector__dropdown"
              options={ollamaModels}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              aria-label="Select AI Model"
              disabled={isLoadingModels || !!modelError || ollamaModels.length === 0}
            >
              <option value="" disabled hidden={!!selectedModel}>
                {dropdownPlaceholder}
              </option>
            </Dropdown>
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
        />

        <div className="action-buttons">
          {translationError && <p className="error-message" role="alert">{translationError}</p>}
          <Button variant="primary" onClick={handleLoadDocument}>
            Translate Document
          </Button>
        </div>

      </main>
      <AppFooter />
    </div>
  );
};
