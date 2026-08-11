import {
  LIMITS,
  LLAMA_CPP_API_BASE_URL,
  OLLAMA_API_BASE_URL,
} from "../config/constants";
import type {
  DropdownOption,
  InferenceProvider,
  LlamaCppChatResponse,
  LlamaCppModelsResponse,
  OllamaChatResponse,
  OllamaMessage,
  OllamaTagsResponse,
} from "../types";
import {
  isAbortError,
  mapLlamaCppModelsToOptions,
  mapOllamaModelsToOptions,
  parseModelReference,
  withInactivityTimeout,
  withTimeout,
} from "../utils/transforms";

const { MODEL_FETCH_TIMEOUT, TRANSLATION_TIMEOUT } = LIMITS;

interface ProviderModelsRequest<T> {
  provider: InferenceProvider;
  endpoint: string;
  mapResponse: (response: T) => DropdownOption[];
  httpErrorMessage: (response: Response) => string;
  timeoutMessage: string;
}

const handleNetworkError = (error: unknown, provider?: InferenceProvider): string => {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    ) {
      if (provider === "ollama")
        return "Could not connect to Ollama. Ensure `ollama serve` is running.";
      if (provider === "llamacpp")
        return "Could not connect to llama.cpp. Ensure `llama-server` is running on port 4256.";
      return "Could not connect to Ollama or llama.cpp.";
    }
  }
  return error instanceof Error ? error.message : "An unknown network error occurred.";
};

const fetchProviderModels = async <T>({
  provider,
  endpoint,
  mapResponse,
  httpErrorMessage,
  timeoutMessage,
}: ProviderModelsRequest<T>): Promise<DropdownOption[]> =>
  withTimeout(async (signal) => {
    const response = await fetch(endpoint, { signal });
    if (!response.ok) throw new Error(httpErrorMessage(response));

    const data = (await response.json()) as T;
    return mapResponse(data);
  }, MODEL_FETCH_TIMEOUT).catch((error) => {
    if (error instanceof Error && error.message.includes("timed out")) {
      throw new Error(timeoutMessage);
    }
    throw new Error(handleNetworkError(error, provider));
  });

const fetchOllamaModels = (): Promise<DropdownOption[]> =>
  fetchProviderModels<OllamaTagsResponse>({
    provider: "ollama",
    endpoint: `${OLLAMA_API_BASE_URL}/tags`,
    mapResponse: mapOllamaModelsToOptions,
    httpErrorMessage: (response) =>
      `Failed to fetch models: ${response.status} ${response.statusText}`,
    timeoutMessage:
      "Ollama server not responding. Ensure it is running and accessible.",
  });

const fetchLlamaCppModels = (): Promise<DropdownOption[]> =>
  fetchProviderModels<LlamaCppModelsResponse>({
    provider: "llamacpp",
    endpoint: `${LLAMA_CPP_API_BASE_URL}/models`,
    mapResponse: mapLlamaCppModelsToOptions,
    httpErrorMessage: (response) =>
      `Failed to fetch llama.cpp models: ${response.status} ${response.statusText}`,
    timeoutMessage:
      "llama.cpp server not responding. Ensure llama-server is running on port 4256.",
  });

export const fetchAvailableModels = async (): Promise<DropdownOption[]> => {
  const results = await Promise.allSettled([
    fetchOllamaModels(),
    fetchLlamaCppModels(),
  ]);
  const models = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  if (models.length > 0) return models;

  const errors = results
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : String(result.reason),
    );
  throw new Error(errors.join(" ") || "No local inference models found.");
};

const readApiError = async (response: Response): Promise<string> => {
  const data = await response.json().catch(() => null);
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") return data.error.message;
  return `HTTP error: ${response.status}`;
};

export type TranslationDeltaHandler = (delta: string) => void;

type StreamingFrame = {
  delta: string;
  terminal: boolean;
};

const getStreamingToken = (payload: unknown, isOllama: boolean): string => {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (isOllama) {
    const message = record.message;
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>).content;
      return typeof content === "string" ? content : "";
    }
    return "";
  }

  const choices = record.choices;
  if (!Array.isArray(choices)) return "";
  const choice = choices[0];
  if (!choice || typeof choice !== "object") return "";
  const choiceRecord = choice as Record<string, unknown>;
  const delta = choiceRecord.delta;
  if (delta && typeof delta === "object") {
    const content = (delta as Record<string, unknown>).content;
    if (typeof content === "string") return content;
  }
  const message = choiceRecord.message;
  if (message && typeof message === "object") {
    const content = (message as Record<string, unknown>).content;
    return typeof content === "string" ? content : "";
  }
  return "";
};

const getStreamingError = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as Record<string, unknown>).error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return null;
};

const hasLlamaFinishReason = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") return false;
  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices)) return false;
  const choice = choices[0];
  if (!choice || typeof choice !== "object") return false;
  return (choice as Record<string, unknown>).finish_reason != null;
};

const parseStreamingFrame = (
  line: string,
  isOllama: boolean,
): StreamingFrame | null => {
  const normalizedLine = line.trim();
  if (!normalizedLine || normalizedLine.startsWith(":")) return null;
  if (/^(?:event|id|retry):/iu.test(normalizedLine)) return null;

  const payload = normalizedLine.startsWith("data:")
    ? normalizedLine.slice("data:".length).trim()
    : normalizedLine;
  if (!payload) return null;
  if (payload === "[DONE]") return { delta: "", terminal: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error("The provider returned an invalid streaming response frame.");
  }

  const providerError = getStreamingError(parsed);
  if (providerError) throw new Error(providerError);

  return {
    delta: getStreamingToken(parsed, isOllama),
    terminal: isOllama
      ? Boolean((parsed as Record<string, unknown>).done)
      : hasLlamaFinishReason(parsed),
  };
};

const readStreamingTranslation = async (
  response: Response,
  isOllama: boolean,
  onDelta: TranslationDeltaHandler,
  onActivity: () => void,
): Promise<string> => {
  if (!response.body) throw new Error("The provider returned an empty streaming body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let buffer = "";
  let content = "";
  let terminal = false;

  const processLine = (line: string): void => {
    if (terminal) return;
    const frame = parseStreamingFrame(line, isOllama);
    if (!frame) return;
    if (frame.delta) {
      content += frame.delta;
      onDelta(frame.delta);
    }
    terminal = frame.terminal;
  };

  try {
    while (!terminal) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      onActivity();
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex >= 0) {
        processLine(buffer.slice(0, newlineIndex));
        buffer = buffer.slice(newlineIndex + 1);
        newlineIndex = buffer.indexOf("\n");
      }
    }

    if (!terminal) {
      buffer += decoder.decode();
      if (buffer.trim()) processLine(buffer);
    }
    if (!terminal) {
      throw new Error(
        "The provider ended the stream before a terminal frame was received.",
      );
    }
    if (!content) throw new Error("The provider returned an empty streaming response.");
    return content;
  } finally {
    reader.releaseLock();
  }
};

export const fetchTranslation = async ({
  model,
  messages,
  options,
  signal,
  onDelta,
}: {
  model: string;
  messages: OllamaMessage[];
  options?: Record<string, unknown>;
  signal?: AbortSignal;
  onDelta?: TranslationDeltaHandler;
}): Promise<string> => {
  const stream = Boolean(onDelta);
  const request = async (requestSignal: AbortSignal, onActivity = (): void => {}) => {
    const reference = parseModelReference(model);
    const isOllama = reference.provider === "ollama";
    const endpoint = isOllama
      ? `${OLLAMA_API_BASE_URL}/chat`
      : `${LLAMA_CPP_API_BASE_URL}/chat/completions`;
    const body = isOllama
      ? { model: reference.model, messages, stream, options }
      : { model: reference.model, messages, ...options, stream };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: requestSignal,
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    if (onDelta)
      return readStreamingTranslation(response, isOllama, onDelta, onActivity);

    if (isOllama) {
      const data: OllamaChatResponse = await response.json();
      return data.message.content;
    }
    const data: LlamaCppChatResponse = await response.json();
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error("llama.cpp returned an empty response.");
    return content;
  };

  const requestWithTimeout = stream
    ? withInactivityTimeout(request, TRANSLATION_TIMEOUT, signal)
    : withTimeout(request, TRANSLATION_TIMEOUT, signal);

  return requestWithTimeout.catch((error) => {
    if (isAbortError(error) || signal?.aborted) throw error;
    if (
      error instanceof Error &&
      error.message.includes("timed out") &&
      error.message.includes(`${TRANSLATION_TIMEOUT}ms`)
    ) {
      throw new Error(
        "Translation request timeout. The model may be taking too long to respond.",
      );
    }
    throw new Error(handleNetworkError(error, parseModelReference(model).provider));
  });
};
