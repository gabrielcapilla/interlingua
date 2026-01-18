import React, { useCallback } from "react";
import { ThinkingIndicator } from "../../atoms/ThinkingIndicator";
import { Button } from "../../atoms/Button";
import { cn } from "../../../utils/cn";

interface TranslationIOProps {
  inputText: string;
  setInputText: (text: string) => void;
  translatedText: string;
  isTranslating: boolean;
  inputLanguageLabel: string;
  outputLanguageLabel: string;
  characterCount: number;
  wordCount: number;
  onClearInput: () => void;
  isOverLimit: boolean;
  maxCharacters: number;
  onCopySuccess: () => void;
  onCopyError: () => void;
}

interface PanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  isOverLimit?: boolean;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  isOverLimit = false,
  footer,
  actions,
}) => (
  <div
    className={cn(
      "translation-io_panel",
      isOverLimit && "translation-io_panel-error",
    )}
  >
    <div className="translation-io_header">{label}</div>
    <div className="translation-io_text-area-wrapper">
      <textarea
        className="translation-io_text-area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={readOnly ? "Translation" : "Enter text..."}
        readOnly={readOnly}
        aria-label={readOnly ? "Translated text" : "Input text for translation"}
      />
      {actions}
    </div>
    {footer}
  </div>
);

export const TranslationIO: React.FC<TranslationIOProps> = ({
  inputText,
  setInputText,
  translatedText,
  isTranslating,
  inputLanguageLabel,
  outputLanguageLabel,
  characterCount,
  wordCount,
  onClearInput,
  isOverLimit,
  maxCharacters,
  onCopySuccess,
  onCopyError,
}) => {
  const handleCopy = useCallback(async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      onCopySuccess();
    } catch {
      onCopyError();
    }
  }, [translatedText, onCopySuccess, onCopyError]);

  return (
    <div className="translation-io">
      <Panel
        label={inputLanguageLabel}
        value={inputText}
        onChange={setInputText}
        isOverLimit={isOverLimit}
        footer={
          <div className="translation-io_footer">
            <span
              className={isOverLimit ? "translation-io_char-count-error" : ""}
            >
              {characterCount.toLocaleString()} /{" "}
              {maxCharacters.toLocaleString()}
            </span>
            <span>{wordCount} words</span>
          </div>
        }
        actions={
          inputText && (
            <Button
              variant="secondary"
              iconOnly
              buttonShape="circular"
              onClick={onClearInput}
              title="Clear input text"
              className="translation-io_clear-button"
            >
              ✕
            </Button>
          )
        }
      />
      <Panel
        label={outputLanguageLabel}
        value={translatedText}
        onChange={() => {}}
        readOnly
        footer={
          isTranslating ? (
            <div className="translation-io_thinking-wrapper">
              <ThinkingIndicator />
            </div>
          ) : null
        }
        actions={
          !isTranslating &&
          translatedText && (
            <div className="translation-io_copy-button-wrapper">
              <Button
                variant="secondary"
                onClick={handleCopy}
                aria-label="Copy translated text"
              >
                Copy
              </Button>
            </div>
          )
        }
      />
    </div>
  );
};
