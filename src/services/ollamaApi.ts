import {
  OLLAMA_API_BASE_URL,
  OLLAMA_CONNECTION_ERROR_PREFIX,
  LIMITS,
} from "../config/constants";
import {
  OllamaTagsResponse,
  DropdownOption,
  OllamaChatResponse,
  OllamaMessage,
} from "../types";
import { mapOllamaModelsToOptions, withTimeout } from "../utils/transforms";

const { MODEL_FETCH_TIMEOUT, TRANSLATION_TIMEOUT } = LIMITS;

const handleNetworkError = (error: unknown): string => {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("load failed")
    ) {
      return `${OLLAMA_CONNECTION_ERROR_PREFIX} Ensure it is running (e.g., \`ollama serve\`) and accessible.`;
    }
  }
  return error instanceof Error
    ? error.message
    : "An unknown network error occurred.";
};

export const fetchOllamaModels = async (): Promise<DropdownOption[]> =>
  withTimeout(async () => {
    const response = await fetch(`${OLLAMA_API_BASE_URL}/tags`);
    if (!response.ok)
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`,
      );

    const data: OllamaTagsResponse = await response.json();
    return mapOllamaModelsToOptions(data);
  }, MODEL_FETCH_TIMEOUT).catch((error) => {
    if (error instanceof Error && error.message.includes("timed out")) {
      throw new Error(
        "Ollama server not responding. Ensure it is running and accessible.",
      );
    }
    throw new Error(handleNetworkError(error));
  });

export const fetchTranslation = async ({
  model,
  messages,
  options,
}: {
  model: string;
  messages: OllamaMessage[];
  options?: Record<string, unknown>;
}): Promise<string> =>
  withTimeout(async () => {
    const response = await fetch(`${OLLAMA_API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false, options }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP error: ${response.status}` }));
      throw new Error(
        errorData.error || `Failed to get response from AI: ${response.status}`,
      );
    }

    const data: OllamaChatResponse = await response.json();
    return data.message.content;
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
    throw new Error(handleNetworkError(error));
  });
