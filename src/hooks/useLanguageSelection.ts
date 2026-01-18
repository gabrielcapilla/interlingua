import { STORAGE_KEYS } from "../data";
import { LanguageCode } from "../types";
import usePersistentState from "./usePersistentState";

export interface LanguageSelectionState {
  inputLanguage: LanguageCode;
  outputLanguage: LanguageCode;
  setInputLanguage: React.Dispatch<React.SetStateAction<LanguageCode>>;
  setOutputLanguage: React.Dispatch<React.SetStateAction<LanguageCode>>;
  handleLanguageSwap: () => void;
}

const useLanguageSelection = (): LanguageSelectionState => {
  const [inputLanguage, setInputLanguage] = usePersistentState<LanguageCode>(
    STORAGE_KEYS.INPUT_LANG,
    "auto",
  );
  const [outputLanguage, setOutputLanguage] = usePersistentState<LanguageCode>(
    STORAGE_KEYS.OUTPUT_LANG,
    "es",
  );

  const handleLanguageSwap = () => {
    if (inputLanguage === "auto") return;
    setInputLanguage(outputLanguage);
    setOutputLanguage(inputLanguage);
  };

  return {
    inputLanguage,
    setInputLanguage,
    outputLanguage,
    setOutputLanguage,
    handleLanguageSwap,
  };
};

export default useLanguageSelection;
