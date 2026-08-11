import type { FC, ReactNode, Ref } from "react";
import { useCallback, useEffect, useRef } from "react";
import type { TranslationProgress } from "../../../types";
import { Button } from "../../atoms/Button";

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
  translationProgress: TranslationProgress | null;
  onCancelTranslation: () => void;
  onCopySuccess: () => void;
  onCopyError: () => void;
  onSelectAlternative: (text: string) => void;
}

interface PanelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
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
  placeholder,
  textareaRef,
  footer,
  actions,
  overlay,
}) => (
  <div className="translation-io_panel">
    <div className="translation-io_header">{label}</div>
    <div className="translation-io_text-area-wrapper">
      <textarea
        className="translation-io_text-area"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? (readOnly ? "Translation" : "Enter text...")}
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
  translationProgress,
  onCancelTranslation,
  onCopySuccess,
  onCopyError,
  onSelectAlternative,
}) => {
  const outputTextAreaRef = useRef<HTMLTextAreaElement>(null);

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
  const isIndeterminateProgress = translationProgress?.totalChunks === 1;
  const translationProgressPercent =
    translationProgress && translationProgress.totalChunks > 1
      ? Math.round(
          (translationProgress.completedChunks / translationProgress.totalChunks) * 100,
        )
      : 0;

  useEffect(() => {
    if (!isTranslating || !outputTextAreaRef.current) return;
    outputTextAreaRef.current.scrollTop =
      translatedText.length > 0 ? outputTextAreaRef.current.scrollHeight : 0;
  }, [translatedText, isTranslating]);

  return (
    <div className="translation-io">
      <Panel
        label={inputLanguageLabel}
        value={inputText}
        onChange={setInputText}
        footer={
          <div className="translation-io_footer">
            <span>{characterCount.toLocaleString()} characters</span>
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
        placeholder={isTranslating ? "" : "Translation"}
        textareaRef={outputTextAreaRef}
        overlay={
          isTranslating && translationProgress ? (
            <div className="translation-io_progress-overlay">
              <div
                className="translation-io_progress-bar"
                role="progressbar"
                aria-label="Translation in progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  isIndeterminateProgress ? undefined : translationProgressPercent
                }
              >
                <span
                  className={`translation-io_progress-fill${
                    isIndeterminateProgress
                      ? " translation-io_progress-fill-indeterminate"
                      : ""
                  }`}
                  style={{
                    width: isIndeterminateProgress
                      ? undefined
                      : `${translationProgressPercent}%`,
                  }}
                />
              </div>
              <Button
                variant="secondary"
                iconOnly
                buttonShape="circular"
                onClick={onCancelTranslation}
                className="translation-io_cancel-button"
                title="Cancel translation"
                aria-label="Cancel translation"
              >
                ✕
              </Button>
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
