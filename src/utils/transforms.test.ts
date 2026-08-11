import { describe, expect, it } from "bun:test";
import {
  countWords,
  filterOutputLanguages,
  isAbortError,
  isSourceLanguageMismatch,
  parseModelReference,
  selectInitialModel,
  shouldScheduleAutoTranslation,
  withInactivityTimeout,
  withTimeout,
} from "./transforms";

const availableModels = [
  { value: "ollama:small", label: "small · Ollama" },
  { value: "llamacpp:large.gguf", label: "large.gguf · llama.cpp" },
];

describe("withTimeout", () => {
  it("returns completed work", async () => {
    await expect(withTimeout(async () => "done", 50)).resolves.toBe("done");
  });

  it("aborts and rejects work that exceeds the deadline", async () => {
    let aborted = false;
    const work = withTimeout(
      (signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      5,
    );

    await expect(work).rejects.toThrow("Operation timed out after 5ms");
    expect(aborted).toBe(true);
  });

  it("propagates a caller cancellation signal", async () => {
    const controller = new AbortController();
    const work = withTimeout(
      (signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      100,
      controller.signal,
    );

    controller.abort();
    try {
      await work;
      expect.unreachable();
    } catch (error) {
      expect(isAbortError(error)).toBe(true);
    }
  });
});

describe("withInactivityTimeout", () => {
  it("resets the deadline when streaming work receives activity", async () => {
    await expect(
      withInactivityTimeout(async (_signal, onActivity) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        onActivity();
        await new Promise((resolve) => setTimeout(resolve, 5));
        return "done";
      }, 20),
    ).resolves.toBe("done");
  });

  it("aborts and rejects when streaming becomes inactive", async () => {
    let aborted = false;
    const work = withInactivityTimeout(
      (signal) =>
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      5,
    );

    await expect(work).rejects.toThrow("Operation timed out after 5ms");
    expect(aborted).toBe(true);
  });
});

describe("model and text transforms", () => {
  it("filters auto-detect and the selected input language from targets", () => {
    const options = [
      { value: "auto", label: "Auto-Detect" },
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" },
    ];

    expect(filterOutputLanguages(options, "es")).toEqual([
      { value: "en", label: "English" },
    ]);
    expect(filterOutputLanguages(options, "auto")).toEqual([
      { value: "en", label: "English" },
      { value: "es", label: "Spanish" },
    ]);
  });

  it("rejects detected text that conflicts with a manual source language", () => {
    expect(isSourceLanguageMismatch("es", "en")).toBe(true);
    expect(isSourceLanguageMismatch("es", "es")).toBe(false);
    expect(isSourceLanguageMismatch("auto", "en")).toBe(false);
    expect(isSourceLanguageMismatch("es", null)).toBe(false);
  });

  it("preserves provider namespaces and model names", () => {
    expect(parseModelReference("ollama:translategemma:4b")).toEqual({
      provider: "ollama",
      model: "translategemma:4b",
    });
    expect(parseModelReference("llamacpp:local.gguf")).toEqual({
      provider: "llamacpp",
      model: "local.gguf",
    });
  });

  it("selects the current model, then favorite, then first available", () => {
    expect(
      selectInitialModel("ollama:small", "llamacpp:large.gguf", availableModels),
    ).toBe("ollama:small");
    expect(selectInitialModel("missing", "llamacpp:large.gguf", availableModels)).toBe(
      "llamacpp:large.gguf",
    );
    expect(selectInitialModel("missing", "", availableModels)).toBe("ollama:small");
  });

  it("counts words without changing whitespace semantics", () => {
    expect(countWords("  one\n two  ")).toBe(2);
    expect(countWords("   ")).toBe(0);
  });

  it("keeps the newest auto-translation request eligible after a busy request", () => {
    expect(shouldScheduleAutoTranslation("second", "first")).toBe(true);
    expect(shouldScheduleAutoTranslation("first", "first")).toBe(false);
  });
});
