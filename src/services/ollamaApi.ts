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
  mapLlamaCppModelsToOptions,
  mapOllamaModelsToOptions,
  parseModelReference,
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

export const fetchTranslation = async ({
  model,
  messages,
  options,
}: {
  model: string;
  messages: OllamaMessage[];
  options?: Record<string, unknown>;
}): Promise<string> =>
  withTimeout(async (signal) => {
    const reference = parseModelReference(model);
    const isOllama = reference.provider === "ollama";
    const endpoint = isOllama
      ? `${OLLAMA_API_BASE_URL}/chat`
      : `${LLAMA_CPP_API_BASE_URL}/chat/completions`;
    const body = isOllama
      ? { model: reference.model, messages, stream: false, options }
      : { model: reference.model, messages, stream: false, ...options };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    if (isOllama) {
      const data: OllamaChatResponse = await response.json();
      return data.message.content;
    }
    const data: LlamaCppChatResponse = await response.json();
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error("llama.cpp returned an empty response.");
    return content;
  }, TRANSLATION_TIMEOUT).catch((error) => {
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
