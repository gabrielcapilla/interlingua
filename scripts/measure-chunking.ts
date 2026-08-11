import { performance } from "node:perf_hooks";
import {
  estimateTokenCount,
  reassembleTranslationChunks,
  splitIntoTranslationChunks,
} from "../src/services/translationChunking";

const ITERATIONS = Math.max(
  3,
  Math.floor(Number(process.env.INTERLINGUA_CHUNKING_ITERATIONS ?? 5)),
);
const TARGET_CHARACTERS = [100_000, 1_000_000];

const percentile = (values: number[], percentage: number): number => {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentage / 100) * sorted.length) - 1,
  );
  return Math.round((sorted[Math.max(0, index)] ?? 0) * 100) / 100;
};

const createDocument = (targetCharacters: number): string => {
  const paragraph =
    "This representative paragraph preserves names, numbers 42, URLs https://example.com/path, and punctuation. It contains several complete sentences so the chunker can measure safe boundaries.\n\n";
  const repetitions = Math.ceil(targetCharacters / paragraph.length);
  return paragraph.repeat(repetitions).slice(0, targetCharacters);
};

const measure = (text: string) => {
  const baselineDurations: number[] = [];
  const candidateDurations: number[] = [];
  let chunks = splitIntoTranslationChunks(text);

  for (let index = 0; index < 2; index += 1) splitIntoTranslationChunks(text);
  for (let index = 0; index < ITERATIONS; index += 1) {
    let started = performance.now();
    const baseline = text.slice(0);
    baselineDurations.push(performance.now() - started);
    if (baseline.length !== text.length)
      throw new Error("Baseline changed the source text.");

    started = performance.now();
    chunks = splitIntoTranslationChunks(text);
    candidateDurations.push(performance.now() - started);
  }

  const reconstructed = reassembleTranslationChunks(
    chunks,
    chunks.map((chunk) => chunk.text),
  );
  const heapUsed =
    typeof process.memoryUsage === "function" ? process.memoryUsage().heapUsed : 0;

  return {
    inputCharacters: text.length,
    estimatedInputTokens: estimateTokenCount(text),
    chunkCount: chunks.length,
    roundTripPreserved: reconstructed === text,
    baselineNoOpMs: {
      mean:
        Math.round(
          (baselineDurations.reduce((sum, value) => sum + value, 0) / ITERATIONS) * 100,
        ) / 100,
      p50: percentile(baselineDurations, 50),
      p95: percentile(baselineDurations, 95),
    },
    candidateChunkingMs: {
      mean:
        Math.round(
          (candidateDurations.reduce((sum, value) => sum + value, 0) / ITERATIONS) *
            100,
        ) / 100,
      p50: percentile(candidateDurations, 50),
      p95: percentile(candidateDurations, 95),
    },
    heapUsedBytesAfter: heapUsed,
  };
};

console.log(
  JSON.stringify(
    {
      status: "complete",
      iterations: ITERATIONS,
      measurements: TARGET_CHARACTERS.map((size) => measure(createDocument(size))),
    },
    null,
    2,
  ),
);
