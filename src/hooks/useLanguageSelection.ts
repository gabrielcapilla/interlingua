import usePersistentState from './usePersistentState';
import { LOCAL_STORAGE_INPUT_LANG_KEY, LOCAL_STORAGE_OUTPUT_LANG_KEY } from '../config/constants';
import { LanguageCode } from '../types';

interface UseLanguageSelectionReturn {
  inputLanguage: string;
  setInputLanguage: (lang: string) => void;
  outputLanguage: string;
  setOutputLanguage: (lang: string) => void;
  handleLanguageSwap: () => void;
}

/**
 * @description Manages the state for input and output language selections, persisting them to localStorage. It also provides a utility function to swap the selected languages.
 * @param {string} [defaultInputLang='auto'] - The default language code for the input language if none is stored in localStorage.
 * @param {string} [defaultOutputLang='es'] - The default language code for the output language if none is stored in localStorage.
 * @returns {UseLanguageSelectionReturn} An object containing language states, their setters, and a swap function.
 * @property {string} inputLanguage - The current input language code (e.g., 'en', 'auto').
 * @property {(lang: string) => void} setInputLanguage - State setter for the input language.
 * @property {string} outputLanguage - The current output language code (e.g., 'es').
 * @property {(lang: string) => void} setOutputLanguage - State setter for the output language.
 * @property {() => void} handleLanguageSwap - A function that swaps the current input and output languages.
 * @interactions
 * - **Custom Hooks:** Leverages `usePersistentState` to manage and persist both `inputLanguage` and `outputLanguage` state.
 * - **State:** Manages the `inputLanguage` and `outputLanguage` states.
 * - **Constants:** Uses `LOCAL_STORAGE_INPUT_LANG_KEY` and `LOCAL_STORAGE_OUTPUT_LANG_KEY` as keys for `localStorage`.
 */
function useLanguageSelection(defaultInputLang: LanguageCode = 'auto', defaultOutputLang: LanguageCode = 'es'): UseLanguageSelectionReturn {
  const [inputLanguage, setInputLanguage] = usePersistentState<string>(
    LOCAL_STORAGE_INPUT_LANG_KEY,
    defaultInputLang
  );
  const [outputLanguage, setOutputLanguage] = usePersistentState<string>(
    LOCAL_STORAGE_OUTPUT_LANG_KEY,
    defaultOutputLang
  );

  const handleLanguageSwap = () => {
    // Swapping is disabled when 'auto' is selected, as it's not a valid output language.
    if (inputLanguage === 'auto') {
      return;
    }
    const currentInputLang = inputLanguage;
    setInputLanguage(outputLanguage);
    setOutputLanguage(currentInputLang);
  };

  return {
    inputLanguage,
    setInputLanguage,
    outputLanguage,
    setOutputLanguage,
    handleLanguageSwap,
  };
}

export default useLanguageSelection;
