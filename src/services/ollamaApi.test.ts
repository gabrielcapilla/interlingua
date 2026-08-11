import { afterEach, describe, expect, it, mock } from "bun:test";
import { fetchAvailableModels, fetchTranslation } from "./ollamaApi";

const originalFetch = globalThis.fetch;

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type FetchHandler = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const mockFetch = (handler: FetchHandler): void => {
  globalThis.fetch = mock(handler) as typeof fetch;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("fetchAvailableModels", () => {
  it("combines namespaced Ollama and llama.cpp models", async () => {
    mockFetch(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/tags")) {
        return jsonResponse({ models: [{ name: "translategemma:4b" }] });
      }
      return jsonResponse({
        object: "list",
        data: [{ id: "translategemma-12b.gguf", object: "model" }],
      });
    });

    await expect(fetchAvailableModels()).resolves.toEqual([
      {
        value: "ollama:translategemma:4b",
        label: "translategemma:4b · Ollama",
      },
      {
        value: "llamacpp:translategemma-12b.gguf",
        label: "translategemma-12b.gguf · llama.cpp",
      },
    ]);
  });

  it("keeps llama.cpp available when Ollama is offline", async () => {
    mockFetch(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/tags")) {
        throw new TypeError("Failed to fetch");
      }
      return jsonResponse({
        object: "list",
        data: [{ id: "local.gguf", object: "model" }],
      });
    });

    const models = await fetchAvailableModels();
    expect(models.map((model) => model.value)).toEqual(["llamacpp:local.gguf"]);
  });

  it("reports both providers when neither is available", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(fetchAvailableModels()).rejects.toThrow("Could not connect to Ollama");
    await expect(fetchAvailableModels()).rejects.toThrow(
      "Could not connect to llama.cpp",
    );
  });
});

describe("fetchTranslation", () => {
  it("uses Ollama's native chat payload", async () => {
    let request: RequestInit | undefined;
    mockFetch(async (_input: RequestInfo | URL, init?: RequestInit) => {
      request = init;
      return jsonResponse({ message: { role: "assistant", content: "Hola" } });
    });

    const result = await fetchTranslation({
      model: "ollama:translategemma:4b",
      messages: [{ role: "user", content: "Hello" }],
      options: { temperature: 0 },
    });

    expect(result).toBe("Hola");
    expect(JSON.parse(String(request?.body))).toEqual({
      model: "translategemma:4b",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
      options: { temperature: 0 },
    });
  });

  it("uses llama.cpp's OpenAI-compatible payload and response", async () => {
    let url = "";
    let request: RequestInit | undefined;
    mockFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
      url = String(input);
      request = init;
      return jsonResponse({
        choices: [{ message: { role: "assistant", content: "Hola" } }],
      });
    });

    const result = await fetchTranslation({
      model: "llamacpp:local.gguf",
      messages: [{ role: "user", content: "Hello" }],
      options: { temperature: 0, seed: 42 },
    });

    expect(result).toBe("Hola");
    expect(url).toBe("http://localhost:4256/v1/chat/completions");
    expect(JSON.parse(String(request?.body))).toEqual({
      model: "local.gguf",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
      temperature: 0,
      seed: 42,
    });
  });
});
