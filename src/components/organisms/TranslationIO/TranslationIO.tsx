import type { FC, ReactNode } from "react";
import { useCallback } from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../atoms/Button";
import { ThinkingIndicator } from "../../atoms/ThinkingIndicator";

interface TranslationIOProps {
  inputText: string;
  setInputText: (text: string) => void;
  translatedText: string;
  alternativeTranslations: string[];
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
  onSelectAlternative: (text: string) => void;
}

interface PanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  isOverLimit?: boolean;
  footer?: ReactNode;
  actions?: ReactNode;
  overlay?: ReactNode;
}

const ignoreChange = (): void => undefined;

const Panel: FC<PanelProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  isOverLimit = false,
  footer,
  actions,
  overlay,
}) => (
  <div
    className={cn("translation-io_panel", isOverLimit && "translation-io_panel-error")}
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
      {overlay}
      {actions}
    </div>
    {footer}
  </div>
);

export const TranslationIO: FC<TranslationIOProps> = ({
  inputText,
  setInputText,
  translatedText,
  alternativeTranslations,
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
  onSelectAlternative,
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

  const hasAlternatives = !isTranslating && alternativeTranslations.length > 0;
  const canCopy = !isTranslating && Boolean(translatedText);

  return (
    <div className="translation-io">
      <Panel
        label={inputLanguageLabel}
        value={inputText}
        onChange={setInputText}
        isOverLimit={isOverLimit}
        footer={
          <div className="translation-io_footer">
            <span className={isOverLimit ? "translation-io_char-count-error" : ""}>
              {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
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
        onChange={ignoreChange}
        readOnly
        overlay={
          isTranslating ? (
            <div className="translation-io_overlay" aria-live="polite">
              <ThinkingIndicator />
            </div>
          ) : null
        }
        footer={
          hasAlternatives ? (
            <div className="translation-io_footer translation-io_footer-output">
              <div className="translation-io_alternatives">
                <span className="translation-io_alternatives-label">Alternatives</span>
                <div className="translation-io_alternatives-list">
                  {alternativeTranslations.map((alternative) => (
                    <Button
                      key={alternative}
                      variant="subtle"
                      className="translation-io_alt-button"
                      onClick={() => onSelectAlternative(alternative)}
                      title="Use this alternative translation"
                    >
                      {alternative}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : null
        }
        actions={
          canCopy && (
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
