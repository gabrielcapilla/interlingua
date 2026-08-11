import { TRANSLATION_CONFIG } from "../config/constants";

export const isShortExpression = (text: string): boolean => {
  const compact = text.trim();
  if (!compact) return false;

  const words = compact.split(/\s+/).filter(Boolean).length;
  const lineCount = compact.split(/\r?\n/).filter((line) => line.trim()).length;

  return (
    lineCount <= 1 &&
    compact.length <= TRANSLATION_CONFIG.ALTERNATIVES.MAX_INPUT_CHARACTERS &&
    words <= TRANSLATION_CONFIG.ALTERNATIVES.MAX_INPUT_WORDS
  );
};

const stripTranslationPrefix = (value: string): string =>
  value.replace(/^(translation|translated text|traduccion|traducción)\s*:\s*/i, "");

const cleanPrefix = (value: string): string => stripTranslationPrefix(value).trim();

const isEchoedAlternativesInstruction = (line: string): boolean => {
  const normalizedLine = line.trim().replace(/\s+/g, " ");

  return /^for short expressions, if a natural colloquial alternative is genuinely useful, add up to \d+ extra lines after the primary translation, each prefixed with ["']alt:\s*["']\. do not change or repeat the primary translation\.$/i.test(
    normalizedLine,
  );
};

export const normalizeTranslationResponse = (
  raw: string,
  maxAlternatives: number,
  allowAlternatives: boolean,
  sourceHasCodeFences: boolean,
): { primary: string; alternatives: string[] } => {
  const text = raw.replace(/^\uFEFF/, "");
  if (!text.trim()) return { primary: "", alternatives: [] };

  const allLines = text.split(/\r?\n/);
  const altCandidates: string[] = [];
  const primaryLines: string[] = [];
  let primaryStarted = false;

  for (const line of allLines) {
    if (allowAlternatives && primaryStarted && /^\s*ALT:\s*/i.test(line)) {
      altCandidates.push(cleanPrefix(line.replace(/^\s*ALT:\s*/i, "")));
      continue;
    }
    if (isEchoedAlternativesInstruction(line)) continue;
    primaryLines.push(line);
    if (line.trim()) primaryStarted = true;
  }

  const taggedAlternatives = altCandidates.filter(Boolean).slice(0, maxAlternatives);
  const alternatives = allowAlternatives ? taggedAlternatives : [];
  const rebuiltPrimary = primaryLines.join("\n");
  const withoutLeadingBlankLines = rebuiltPrimary.replace(/^(?:[ \t]*\r?\n)+/, "");
  let primary = stripTranslationPrefix(withoutLeadingBlankLines).replace(/\s+$/g, "");

  if (!sourceHasCodeFences) {
    const fencedMatch = primary.match(/^```[^\n]*\n([\s\S]*?)\n```$/);
    if (fencedMatch) primary = fencedMatch[1];

    const withoutFenceLines = primary
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "```")
      .join("\n");
    primary = withoutFenceLines;
  }

  if (sourceHasCodeFences && primary && !primary.includes("```")) {
    primary = "```\n" + primary + "\n```";
  }

  if (primary.includes("```")) {
    return { primary, alternatives };
  }

  if (
    allowAlternatives &&
    !taggedAlternatives.length &&
    !primary.includes("\n") &&
    primary.includes(" / ")
  ) {
    const parts = primary
      .split(/\s*\/\s*/)
      .map((part) => cleanPrefix(part))
      .filter(Boolean);

    if (parts.length > 1) {
      return {
        primary: parts[0],
        alternatives: parts.slice(1, 1 + maxAlternatives),
      };
    }
  }

  return { primary, alternatives };
};
