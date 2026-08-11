import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo } from "react";
import { languageOptions, STORAGE_KEYS } from "../data";
import type { LanguageCode } from "../types";
import { filterOutputLanguages } from "../utils/transforms";
import usePersistentState from "./usePersistentState";

export interface LanguageSelectionState {
  inputLanguage: LanguageCode;
  outputLanguage: LanguageCode;
  setInputLanguage: Dispatch<SetStateAction<LanguageCode>>;
  setOutputLanguage: Dispatch<SetStateAction<LanguageCode>>;
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

  const outputLanguageOptions = useMemo(
    () => filterOutputLanguages(languageOptions, inputLanguage),
    [inputLanguage],
  );
  const fallbackOutputLanguage = outputLanguageOptions[0]?.value as
    | LanguageCode
    | undefined;

  useEffect(() => {
    if (
      !fallbackOutputLanguage ||
      outputLanguageOptions.some(({ value }) => value === outputLanguage)
    ) {
      return;
    }

    setOutputLanguage(fallbackOutputLanguage);
  }, [
    outputLanguage,
    outputLanguageOptions,
    fallbackOutputLanguage,
    setOutputLanguage,
  ]);

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
