import { languageOptions } from "../data/constants";

type LanguageClues = {
  tokens: readonly string[];
  uniqueTokens: readonly string[];
  phrases: readonly string[];
};

export type StrongLanguageSignal = {
  language: string;
  confidence: "high";
  score: number;
  margin: number;
  evidence: string[];
};

const STRONG_LANGUAGE_CLUES: Record<string, LanguageClues> = {
  ca: {
    tokens: ["gat", "platja", "vull", "canviïs", "aquesta", "això", "sofà"],
    uniqueTokens: [],
    phrases: ["bon dia", "com estàs"],
  },
  en: {
    tokens: [
      "the",
      "this",
      "that",
      "with",
      "from",
      "you",
      "your",
      "not",
      "do",
      "does",
      "is",
      "are",
      "want",
      "change",
      "date",
      "please",
      "morning",
    ],
    uniqueTokens: ["hello"],
    phrases: ["do not", "good morning", "how are you"],
  },
  es: {
    tokens: ["gato", "playa", "quiero", "cambies", "fecha", "sofá", "esto"],
    uniqueTokens: [],
    phrases: ["buenos días", "cómo estás"],
  },
};

export const SUPPORTED_LANGUAGE_CODES = languageOptions
  .map((option) => option.value)
  .filter((code) => code !== "auto");

const SUPPORTED_LANGUAGE_CODE_SET = new Set(SUPPORTED_LANGUAGE_CODES);
const normalizeLanguageLabel = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const LANGUAGE_CODE_BY_LABEL = new Map(
  languageOptions
    .filter(({ value }) => value !== "auto")
    .map(({ value, label }) => [normalizeLanguageLabel(label), value]),
);

const normalizeForClues = (text: string): string =>
  text.toLowerCase().replace(/[’]/g, "'");

const scoreLanguageClues = (text: string) => {
  const normalized = normalizeForClues(text);
  const tokens = new Set(normalized.match(/[a-zà-ÿ]+/g) ?? []);
  if (!tokens.size) return [];

  return Object.entries(STRONG_LANGUAGE_CLUES).map(([language, clues]) => {
    const tokenEvidence = clues.tokens.filter((token) => tokens.has(token));
    const uniqueEvidence = clues.uniqueTokens.filter((token) => tokens.has(token));
    const phraseEvidence = clues.phrases.filter((phrase) =>
      normalized.includes(phrase),
    );
    return {
      language,
      score:
        tokenEvidence.length + uniqueEvidence.length * 2 + phraseEvidence.length * 2,
      evidence: [...tokenEvidence, ...uniqueEvidence, ...phraseEvidence],
    };
  });
};

export const getStrongLanguageSignal = (text: string): StrongLanguageSignal | null => {
  const scores = scoreLanguageClues(text);

  scores.sort((left, right) => right.score - left.score);
  const [best, runnerUp] = scores;
  if (!best || best.score < 2 || best.score === runnerUp?.score) return null;

  return {
    language: best.language,
    confidence: "high",
    score: best.score,
    margin: best.score - (runnerUp?.score ?? 0),
    evidence: best.evidence,
  };
};

export const detectMixedLanguageSignal = (text: string): boolean => {
  const scores = scoreLanguageClues(text)
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
  const [best, runnerUp] = scores;

  return Boolean(
    best && runnerUp && runnerUp.score > 0 && best.score - runnerUp.score <= 1,
  );
};

export const detectStrongLanguageSignal = (text: string): string | null =>
  getStrongLanguageSignal(text)?.language ?? null;

export const normalizeDetectedLanguageCode = (raw: string): string | null => {
  const cleaned = raw.trim().toLowerCase().replace(/`/g, "");
  if (!cleaned) return null;

  const candidate = cleaned.split(/\s+/)[0].replace(/[^a-z_-]/g, "");
  if (!candidate) return null;

  const base = candidate.split(/[-_]/)[0];
  if (SUPPORTED_LANGUAGE_CODE_SET.has(base)) return base;

  const normalizedLabel = normalizeLanguageLabel(cleaned);
  return (
    LANGUAGE_CODE_BY_LABEL.get(normalizedLabel) ??
    LANGUAGE_CODE_BY_LABEL.get(normalizedLabel.split(" ")[0]) ??
    null
  );
};
