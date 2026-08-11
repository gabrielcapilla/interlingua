import { getLanguageLabel } from "./translationPrompts";

export const createLanguageMismatchError = (
  selectedLanguage: string,
  detectedLanguage: string,
  languageLabels: Record<string, string>,
): string => {
  const selectedLabel = getLanguageLabel(selectedLanguage, languageLabels);
  const detectedLabel = getLanguageLabel(detectedLanguage, languageLabels);

  return `The text appears to be ${detectedLabel}, but ${selectedLabel} is selected as the input language. Please select ${detectedLabel} or choose Auto-Detect.`;
};

export const createSameLanguageError = (language: string): string =>
  `Source and target are both ${language}. Please choose a different target language.`;
