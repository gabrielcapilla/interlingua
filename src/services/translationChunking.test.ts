import { describe, expect, it } from "bun:test";
import {
  estimateTokenCount,
  getLanguageDetectionSample,
  reassembleTranslationChunks,
  splitIntoTranslationChunks,
  TranslationChunkingError,
} from "./translationChunking";

describe("translation chunking", () => {
  it("reassembles source text without losing outer or paragraph separators", () => {
    const source = "  First paragraph.\n\nSecond paragraph with more words.  ";
    const chunks = splitIntoTranslationChunks(source, 6);

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      reassembleTranslationChunks(
        chunks,
        chunks.map((chunk) => chunk.text),
      ),
    ).toBe(source);
    expect(chunks.every((chunk) => chunk.estimatedSourceTokens <= 6)).toBe(true);
  });

  it("keeps a paragraph together when it fits the source budget", () => {
    const source = "One short sentence. Another short sentence.";
    const chunks = splitIntoTranslationChunks(source, estimateTokenCount(source));

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe(source);
  });

  it("keeps adjacent paragraphs in separate chunks when both fit", () => {
    const source =
      "First paragraph with enough context.\n\nSecond paragraph with enough context.";
    const chunks = splitIntoTranslationChunks(source, estimateTokenCount(source));

    expect(chunks).toHaveLength(2);
    expect(
      reassembleTranslationChunks(
        chunks,
        chunks.map((chunk) => chunk.text),
      ),
    ).toBe(source);
  });

  it("falls back from sentences to clauses and then whole words", () => {
    const source = "One two three four five. Six seven eight nine ten.";
    const chunks = splitIntoTranslationChunks(source, 5);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.estimatedSourceTokens <= 5)).toBe(true);
    expect(
      reassembleTranslationChunks(
        chunks,
        chunks.map((chunk) => chunk.text),
      ),
    ).toBe(source);
    expect(chunks.every((chunk) => !/\s$/u.test(chunk.text))).toBe(true);
  });

  it("handles CJK sentences and grapheme fallback without throwing", () => {
    const source = "这是一个很长的中文句子没有空格。これは長い日本語の文です。";
    const chunks = splitIntoTranslationChunks(source, 6);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.estimatedSourceTokens <= 6)).toBe(true);
    expect(
      reassembleTranslationChunks(
        chunks,
        chunks.map((chunk) => chunk.text),
      ),
    ).toBe(source);
  });

  it("keeps fenced code blocks atomic across blank lines", () => {
    const source =
      "Introductory text.\n\n```ts\nconst value = 1;\n\nreturn value;\n```\n\nClosing text.";
    const chunks = splitIntoTranslationChunks(source, 24);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.some((chunk) => chunk.text.includes("```ts"))).toBe(true);
    expect(chunks.some((chunk) => chunk.text.includes("return value"))).toBe(true);
    expect(
      reassembleTranslationChunks(
        chunks,
        chunks.map((chunk) => chunk.text),
      ),
    ).toBe(source);
  });

  it("preserves a safe failure for an oversized protected URL", () => {
    const source = `https://${"a".repeat(100)}.example/path`;

    expect(() => splitIntoTranslationChunks(source, 5)).toThrow(
      TranslationChunkingError,
    );
  });

  it("samples language evidence from the beginning, middle, and end within budget", () => {
    const source = [
      "HEAD evidence for the language.",
      ...Array.from({ length: 20 }, (_, index) => `filler paragraph ${index}.`),
      "TAIL evidence for the language.",
    ].join("\n\n");
    const sample = getLanguageDetectionSample(source, 18);

    expect(estimateTokenCount(sample)).toBeLessThanOrEqual(18);
    expect(sample).toContain("HEAD");
    expect(sample).toContain("TAIL");
  });
});
