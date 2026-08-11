import { TRANSLATION_CONFIG } from "../config/constants";

type SplitLevel = "sentence" | "clause" | "word" | "grapheme";

interface SourceUnit {
  text: string;
  separator: string;
}

interface ProtectedRange {
  start: number;
  end: number;
}

interface SegmenterResult {
  segment: string;
  index: number;
}

interface Segmenter {
  segment: (text: string) => Iterable<SegmenterResult>;
}

interface IntlWithSegmenter {
  Segmenter?: new (
    locales?: string | string[],
    options?: { granularity?: "grapheme" },
  ) => Segmenter;
}

export interface TranslationChunk {
  text: string;
  leadingSeparator: string;
  trailingSeparator: string;
  estimatedSourceTokens: number;
}

export class TranslationChunkingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationChunkingError";
  }
}

const PARAGRAPH_SEPARATOR = /\r?\n[ \t]*(?:\r?\n[ \t]*)+/g;
const SENTENCE_PUNCTUATION = /[.!?。！？…]/u;
const CLAUSE_PUNCTUATION = /[,;:，；：—–]/u;
const CLOSING_PUNCTUATION = /["'”’»)\]}]/u;
const WORD_RUN = /[\p{L}\p{N}]+/gu;
const PUNCTUATION_RUN = /[^\p{L}\p{N}\s]/gu;
const CJK_OR_KANA = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const FENCE_LINE = /^[ \t]{0,3}(`{3,}|~{3,})([^\r\n]*)$/u;
const MAX_ATOMIC_PARAGRAPHS = 8;

const COMMON_ABBREVIATIONS = new Set([
  "approx",
  "art",
  "dept",
  "dr",
  "e.g",
  "etc",
  "fig",
  "i.e",
  "jr",
  "mr",
  "mrs",
  "ms",
  "prof",
  "sr",
  "st",
  "u.s",
]);

/**
 * Estimate model tokens without shipping a provider-specific tokenizer to the
 * browser. This is deliberately conservative for punctuation, code, and
 * scripts whose tokenization is not whitespace-based.
 */
export const estimateTokenCount = (text: string): number => {
  const wordRuns = text.match(WORD_RUN) ?? [];
  const wordTokens = wordRuns.reduce((total, word) => {
    if (CJK_OR_KANA.test(word)) return total + word.length;
    return total + Math.max(1, Math.ceil(word.length / 4));
  }, 0);
  const punctuationTokens = (text.match(PUNCTUATION_RUN) ?? []).length;
  const structuralWhitespaceTokens = (text.match(/[\r\n\t]/gu) ?? []).length;

  return wordTokens + punctuationTokens + structuralWhitespaceTokens;
};

const getLines = (
  text: string,
): Array<{ start: number; end: number; content: string }> => {
  const lines: Array<{ start: number; end: number; content: string }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const newlineIndex = text.indexOf("\n", cursor);
    const end = newlineIndex < 0 ? text.length : newlineIndex;
    const content = text.slice(cursor, end).replace(/\r$/u, "");
    lines.push({
      start: cursor,
      end: newlineIndex < 0 ? end : newlineIndex + 1,
      content,
    });
    cursor = newlineIndex < 0 ? text.length : newlineIndex + 1;
  }

  return lines;
};

const findProtectedRanges = (text: string): ProtectedRange[] => {
  const ranges: ProtectedRange[] = [];
  let openFence: { start: number; character: string; length: number } | null = null;

  for (const line of getLines(text)) {
    const match = FENCE_LINE.exec(line.content);
    if (!match) continue;

    const marker = match[1];
    const rest = match[2];
    const character = marker[0];
    if (!character) continue;

    if (!openFence) {
      openFence = { start: line.start, character, length: marker.length };
      continue;
    }

    if (
      character === openFence.character &&
      marker.length >= openFence.length &&
      /^\s*$/u.test(rest)
    ) {
      ranges.push({ start: openFence.start, end: line.start + line.content.length });
      openFence = null;
    }
  }

  if (openFence) ranges.push({ start: openFence.start, end: text.length });
  return ranges;
};

const isProtectedIndex = (index: number, ranges: ProtectedRange[]): boolean =>
  ranges.some((range) => index >= range.start && index < range.end);

const appendTrailingSeparator = (
  units: SourceUnit[],
  trailingSeparator: string,
): SourceUnit[] => {
  const lastUnit = units[units.length - 1];
  if (lastUnit) lastUnit.separator += trailingSeparator;
  return units;
};

const splitParagraphs = (text: string): SourceUnit[] => {
  const units: SourceUnit[] = [];
  const protectedRanges = findProtectedRanges(text);
  let cursor = 0;

  for (const match of text.matchAll(PARAGRAPH_SEPARATOR)) {
    const index = match.index ?? cursor;
    if (isProtectedIndex(index, protectedRanges)) continue;

    const content = text.slice(cursor, index);
    if (content) units.push({ text: content, separator: match[0] });
    cursor = index + match[0].length;
  }

  if (cursor < text.length) units.push({ text: text.slice(cursor), separator: "" });
  return units;
};

const isAbbreviation = (text: string, punctuationIndex: number): boolean => {
  const previousWord = text
    .slice(0, punctuationIndex)
    .match(/[\p{L}]+(?:\.[\p{L}]+)*$/u)?.[0]
    .toLowerCase();
  return previousWord ? COMMON_ABBREVIATIONS.has(previousWord) : false;
};

const getPunctuationBoundaryEnd = (
  text: string,
  index: number,
  punctuation: RegExp,
  protectedRanges: ProtectedRange[],
): number | null => {
  const value = text[index] ?? "";
  if (!punctuation.test(value) || isProtectedIndex(index, protectedRanges)) return null;

  const isCjkBoundary = /[。！？…]/u.test(value);
  if (punctuation === SENTENCE_PUNCTUATION && value === ".") {
    if (isAbbreviation(text, index)) return null;
    if (/\d/u.test(text[index - 1] ?? "") && /\d/u.test(text[index + 1] ?? "")) {
      return null;
    }
  }

  let end = index + 1;
  while (punctuation.test(text[end] ?? "")) end += 1;
  while (CLOSING_PUNCTUATION.test(text[end] ?? "")) end += 1;

  if (end < text.length && !isCjkBoundary && !/\s/u.test(text[end] ?? "")) {
    return null;
  }
  return end;
};

const splitAtPunctuation = (
  text: string,
  punctuation: RegExp,
  trailingSeparator: string,
): SourceUnit[] => {
  const units: SourceUnit[] = [];
  const protectedRanges = findProtectedRanges(text);
  let cursor = 0;

  for (let index = 0; index < text.length; index += 1) {
    const boundaryEnd = getPunctuationBoundaryEnd(
      text,
      index,
      punctuation,
      protectedRanges,
    );
    if (boundaryEnd === null) continue;

    let separatorEnd = boundaryEnd;
    while (/\s/u.test(text[separatorEnd] ?? "")) separatorEnd += 1;
    const content = text.slice(cursor, boundaryEnd);
    if (content) {
      units.push({
        text: content,
        separator: text.slice(boundaryEnd, separatorEnd),
      });
    }
    cursor = separatorEnd;
    index = separatorEnd - 1;
  }

  if (cursor < text.length) units.push({ text: text.slice(cursor), separator: "" });
  return appendTrailingSeparator(units, trailingSeparator);
};

const getGraphemes = (text: string): string[] => {
  const SegmenterConstructor = (Intl as unknown as IntlWithSegmenter).Segmenter;
  if (!SegmenterConstructor) return Array.from(text);
  const segmenter = new SegmenterConstructor(undefined, { granularity: "grapheme" });
  return [...segmenter.segment(text)].map(({ segment }) => segment);
};

const splitAtWords = (text: string, trailingSeparator: string): SourceUnit[] => {
  const ranges = findProtectedRanges(text);
  const spans: Array<{ start: number; end: number }> = [...ranges];
  for (const match of text.matchAll(/\S+/gu)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (!ranges.some((range) => start >= range.start && start < range.end)) {
      spans.push({ start, end });
    }
  }
  spans.sort((left, right) => left.start - right.start);

  const units: SourceUnit[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    const prefix = text.slice(cursor, span.start);
    const previousUnit = units[units.length - 1];
    if (previousUnit) previousUnit.separator += prefix;
    units.push({
      text: units.length
        ? text.slice(span.start, span.end)
        : prefix + text.slice(span.start, span.end),
      separator: "",
    });
    cursor = span.end;
  }

  const lastUnit = units[units.length - 1];
  if (lastUnit) lastUnit.separator += text.slice(cursor);
  return appendTrailingSeparator(units, trailingSeparator);
};

const splitAtGraphemes = (
  text: string,
  trailingSeparator: string,
  maxSourceTokens: number,
) => {
  const units: SourceUnit[] = [];
  let current = "";

  for (const grapheme of getGraphemes(text)) {
    if (current && estimateTokenCount(current + grapheme) > maxSourceTokens) {
      units.push({ text: current, separator: "" });
      current = "";
    }
    current += grapheme;
  }
  if (current) units.push({ text: current, separator: "" });
  return appendTrailingSeparator(units, trailingSeparator);
};

const isProtectedAtomicValue = (text: string): boolean =>
  /^(?:https?:\/\/|wss?:\/\/|www\.|[a-z][a-z\d+.-]*:\/\/|```|~~~)/iu.test(text);

const splitOversizedContent = (
  text: string,
  trailingSeparator: string,
  maxSourceTokens: number,
  levelIndex = 0,
): SourceUnit[] => {
  if (estimateTokenCount(text) <= maxSourceTokens) {
    return [{ text, separator: trailingSeparator }];
  }

  const levels: SplitLevel[] = ["sentence", "clause", "word", "grapheme"];
  const level = levels[levelIndex];
  if (!level) {
    throw new TranslationChunkingError(
      "A protected URL, identifier, or code block is larger than the safe translation context.",
    );
  }

  if (level === "grapheme" && isProtectedAtomicValue(text)) {
    throw new TranslationChunkingError(
      "A protected URL, identifier, or code block is larger than the safe translation context.",
    );
  }

  const units =
    level === "grapheme"
      ? splitAtGraphemes(text, trailingSeparator, maxSourceTokens)
      : level === "sentence"
        ? splitAtPunctuation(text, SENTENCE_PUNCTUATION, trailingSeparator)
        : level === "clause"
          ? splitAtPunctuation(text, CLAUSE_PUNCTUATION, trailingSeparator)
          : splitAtWords(text, trailingSeparator);

  if (units.length === 1 && units[0]?.text === text) {
    return splitOversizedContent(
      text,
      trailingSeparator,
      maxSourceTokens,
      levelIndex + 1,
    );
  }

  return units.flatMap((unit) =>
    estimateTokenCount(unit.text) <= maxSourceTokens
      ? [unit]
      : splitOversizedContent(
          unit.text,
          unit.separator,
          maxSourceTokens,
          levelIndex + 1,
        ),
  );
};

const composeUnits = (units: SourceUnit[]): string =>
  units
    .map((unit, index) => unit.text + (index < units.length - 1 ? unit.separator : ""))
    .join("");

const splitOuterWhitespace = (
  text: string,
): { leading: string; content: string; trailing: string } => {
  const contentStart = text.search(/\S/u);
  if (contentStart < 0) return { leading: text, content: "", trailing: "" };
  const contentEnd = text.search(/\s*$/u);
  return {
    leading: text.slice(0, contentStart),
    content: text.slice(contentStart, contentEnd),
    trailing: text.slice(contentEnd),
  };
};

export const splitIntoTranslationChunks = (
  text: string,
  maxSourceTokens = TRANSLATION_CONFIG.CHUNKING.MAX_SOURCE_TOKENS,
  maxChunks = TRANSLATION_CONFIG.CHUNKING.MAX_CHUNKS,
): TranslationChunk[] => {
  if (!Number.isFinite(maxSourceTokens) || maxSourceTokens < 1) {
    throw new TranslationChunkingError(
      "The translation source-token budget must be positive.",
    );
  }
  if (!Number.isFinite(maxChunks) || maxChunks < 1) {
    throw new TranslationChunkingError("The translation chunk limit must be positive.");
  }

  const { leading, content, trailing } = splitOuterWhitespace(text);
  if (!content) return [];

  const units = splitParagraphs(content);
  const expandedParagraphs = units.map((unit) =>
    estimateTokenCount(unit.text) <= maxSourceTokens
      ? [unit]
      : splitOversizedContent(unit.text, unit.separator, maxSourceTokens),
  );
  const lastParagraph = expandedParagraphs[expandedParagraphs.length - 1];
  const lastUnit = lastParagraph?.[lastParagraph.length - 1];
  if (lastUnit) lastUnit.separator += trailing;

  const chunks: TranslationChunk[] = [];
  let currentUnits: SourceUnit[] = [];
  const keepShortDocumentParagraphsAtomic =
    expandedParagraphs.length <= MAX_ATOMIC_PARAGRAPHS;

  const flush = (): void => {
    if (!currentUnits.length) return;
    const finalUnit = currentUnits[currentUnits.length - 1];
    if (!finalUnit) return;
    const chunkText = composeUnits(currentUnits);
    chunks.push({
      text: chunkText,
      leadingSeparator: chunks.length === 0 ? leading : "",
      trailingSeparator: finalUnit.separator,
      estimatedSourceTokens: estimateTokenCount(chunkText),
    });
    currentUnits = [];
  };

  for (const paragraphUnits of expandedParagraphs) {
    for (const unit of paragraphUnits) {
      if (estimateTokenCount(unit.text) > maxSourceTokens) {
        throw new TranslationChunkingError(
          "A protected URL, identifier, or code block is larger than the safe translation context.",
        );
      }
      const candidateUnits = [...currentUnits, unit];
      if (
        currentUnits.length > 0 &&
        estimateTokenCount(composeUnits(candidateUnits)) > maxSourceTokens
      ) {
        flush();
      }
      currentUnits.push(unit);
    }
    if (keepShortDocumentParagraphsAtomic) flush();
  }
  if (!keepShortDocumentParagraphsAtomic) flush();

  if (chunks.length > maxChunks) {
    throw new TranslationChunkingError(
      `This document requires more than ${maxChunks.toLocaleString()} translation chunks. Reduce the document size or increase the configured safety limit.`,
    );
  }
  return chunks;
};

export const reassembleTranslationChunks = (
  chunks: readonly TranslationChunk[],
  translatedParts: readonly string[],
): string => {
  if (chunks.length !== translatedParts.length) {
    throw new TranslationChunkingError(
      "Translation chunks and responses are out of order.",
    );
  }

  return chunks
    .map((chunk, index) => {
      const translated = translatedParts[index];
      if (translated === undefined) {
        throw new TranslationChunkingError(
          "Translation chunks and responses are out of order.",
        );
      }
      return (
        (index === 0 ? chunk.leadingSeparator : "") +
        translated +
        chunk.trailingSeparator
      );
    })
    .join("");
};

const takePrefixWithinTokenBudget = (text: string, maxSourceTokens: number): string => {
  const graphemes = getGraphemes(text);
  let low = 0;
  let high = graphemes.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = graphemes.slice(0, middle).join("");
    if (estimateTokenCount(candidate) <= maxSourceTokens) low = middle;
    else high = middle - 1;
  }

  return graphemes.slice(0, low).join("");
};

const takeSuffixWithinTokenBudget = (text: string, maxSourceTokens: number): string => {
  const graphemes = getGraphemes(text);
  let low = 0;
  let high = graphemes.length;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = graphemes.slice(-middle).join("");
    if (estimateTokenCount(candidate) <= maxSourceTokens) low = middle;
    else high = middle - 1;
  }

  return graphemes.slice(-low).join("");
};

export const getLanguageDetectionSample = (
  text: string,
  maxSourceTokens = TRANSLATION_CONFIG.CHUNKING.DETECTION_SOURCE_TOKENS,
): string => {
  if (!Number.isFinite(maxSourceTokens) || maxSourceTokens < 3) {
    throw new TranslationChunkingError(
      "The detection source-token budget must be at least 3.",
    );
  }

  const source = text.trim();
  if (!source) return "";
  let partBudget = Math.max(1, Math.floor((maxSourceTokens - 2) / 4));
  const windowSize = Math.max(1, Math.floor(source.length / 3));
  const middleStart = Math.max(0, Math.floor((source.length - windowSize) / 2));
  const tailStart = Math.max(0, source.length - windowSize);

  while (partBudget > 1) {
    const tailBudget = maxSourceTokens - 2 - partBudget * 2;
    if (tailBudget < 1) break;
    const parts = [
      takePrefixWithinTokenBudget(source.slice(0, windowSize), partBudget),
      takePrefixWithinTokenBudget(
        source.slice(middleStart, middleStart + windowSize),
        partBudget,
      ),
      takeSuffixWithinTokenBudget(source.slice(tailStart), tailBudget),
    ].filter(Boolean);
    const sample = parts.join("\n");
    if (estimateTokenCount(sample) <= maxSourceTokens) return sample;
    partBudget -= 1;
  }

  return takePrefixWithinTokenBudget(source, maxSourceTokens);
};
