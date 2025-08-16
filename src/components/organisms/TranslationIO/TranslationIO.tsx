import React, { useCallback } from 'react';
import { ThinkingIndicator } from '../../atoms/ThinkingIndicator';
import { Button } from '../../atoms/Button';
import { useToast } from '../../../hooks/useToast';

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
}

/**
 * @description A component that provides the primary user interface for text input and translation output. It consists of two side-by-side panels: one for the source text and one for the translated text. It includes features like clearing input, copying output, and displaying character/word counts.
 * @param {TranslationIOProps} props - The props for the component.
 * @param {string} props.inputText - The current text in the input panel.
 * @param {(text: string) => void} props.setInputText - Callback to update the input text in the parent component's state.
 * @param {string} props.translatedText - The translated text to display in the output panel.
 * @param {boolean} props.isTranslating - A flag to determine whether to show the thinking indicator in the output panel.
 * @param {string} props.inputLanguageLabel - The label for the input panel's header (e.g., "English").
 * @param {string} props.outputLanguageLabel - The label for the output panel's header (e.g., "Spanish").
 * @param {number} props.characterCount - The character count of the input text to display in the footer.
 * @param {number} props.wordCount - The word count of the input text to display in the footer.
 * @param {() => void} props.onClearInput - Callback to clear the input text and translation state in the parent.
 * @param {boolean} props.isOverLimit - Flag indicating if the character limit has been exceeded.
 * @param {number} props.maxCharacters - The maximum number of characters allowed.
 * @returns {React.ReactElement} The rendered input/output component.
 * @interactions
 * - **Parent State:** This is a controlled component. It receives its primary data (`inputText`, `translatedText`, etc.) as props and communicates user actions back to the parent (`TranslationPage`) via callbacks (`setInputText`, `onClearInput`).
 * - **Child Components:**
 *   - `ThinkingIndicator`: Rendered in the output panel when `isTranslating` is true.
 *   - `Button`: Used for the "Clear" and "Copy" actions.
 * - **Hooks:** Uses the `useToast` hook to provide user feedback when the copy action is successful or fails.
 * - **Browser API:** Uses `navigator.clipboard.writeText` to copy the translated text to the user's clipboard.
 * - **CSS:** Relies on the `.translation-io` BEM block in `index.css` for its entire layout and styling, including panels, headers, text areas, and footers.
 */
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
}) => {
    const { addToast } = useToast();

    const handleCopy = useCallback(() => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText).then(() => {
            addToast({
                variant: 'success',
                title: 'Success',
                message: 'Translated text copied to clipboard.',
            });
        }).catch(err => {
            addToast({
                variant: 'error',
                title: 'Copy Failed',
                message: 'Could not copy text to clipboard.',
            });
            console.error('Failed to copy text: ', err);
        });
    }, [translatedText, addToast]);

    return (
        <div className="translation-io">
            <div className={`translation-io_panel ${isOverLimit ? 'translation-io_panel-error' : ''}`}>
                <div className="translation-io_header">{inputLanguageLabel}</div>
                <div className="translation-io_text-area-wrapper">
                    <textarea
                        className="translation-io_text-area"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Enter text..."
                        aria-label="Input text for translation"
                    />
                    {inputText && (
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
                    )}
                </div>
                <div className="translation-io_footer">
                    <span className={isOverLimit ? 'translation-io_char-count-error' : ''}>
                        {characterCount.toLocaleString()} / {maxCharacters.toLocaleString()}
                    </span>
                    <span>{wordCount} words</span>
                </div>
            </div>
            <div className="translation-io_panel">
                <div className="translation-io_header">{outputLanguageLabel}</div>
                <div className="translation-io_text-area-wrapper">
                {isTranslating ? (
                    <div className="translation-io_thinking-wrapper">
                        <ThinkingIndicator />
                    </div>
                ) : (
                    <textarea
                        className="translation-io_text-area"
                        value={translatedText}
                        readOnly
                        placeholder="Translation"
                        aria-label="Translated text"
                    />
                )}
                {!isTranslating && translatedText && (
                    <div className="translation-io_copy-button-wrapper">
                        <Button 
                            variant="secondary" 
                            onClick={handleCopy} 
                            aria-label="Copy translated text"
                        >
                            Copy
                        </Button>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};