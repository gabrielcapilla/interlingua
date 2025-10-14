import {
  OLLAMA_API_BASE_URL,
  OLLAMA_CONNECTION_ERROR_PREFIX,
} from "../config/constants";
import {
  OllamaTagsResponse,
  DropdownOption,
  OllamaChatRequestBody,
  OllamaChatResponse,
  OllamaMessage,
} from "../types";

/**
 * @description Processes caught errors from fetch requests, providing a user-friendly message. It specifically identifies common network errors (e.g., "Failed to fetch") and standardizes them into a message about connecting to Ollama.
 * @param {unknown} error - The error object caught in a try-catch block.
 * @returns {string} A user-friendly error message string.
 * @interactions
 * - **Constants:** Uses `OLLAMA_CONNECTION_ERROR_PREFIX` to construct the standardized connection error message.
 * - **Error Handling:** This is a pure utility function called by other API service functions within this file to normalize error messages before they are propagated to the UI layer.
 */
function handleNetworkError(error: unknown): string {
  if (
    error instanceof TypeError &&
    (error.message.toLowerCase().includes("failed to fetch") ||
      error.message.toLowerCase().includes("networkerror") ||
      error.message.toLowerCase().includes("load failed"))
  ) {
    return `${OLLAMA_CONNECTION_ERROR_PREFIX} Ensure it is running (e.g., \`ollama serve\`) and accessible.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unknown network error occurred.";
}

/**
 * @description Fetches the list of available models from the Ollama API's `/api/tags` endpoint and transforms the raw API response into an array suitable for the `Dropdown` component.
 * @returns {Promise<DropdownOption[]>} A promise that resolves to an array of model options, each with a `value` and `label`.
 * @throws An error with a user-friendly message if the API request fails or if there's a network connection issue.
 * @interactions
 * - **Browser API:** Uses `fetch` to make a GET request.
 * - **Helper Functions:** Calls `handleNetworkError` to process and standardize any caught errors.
 * - **Constants:** Uses `OLLAMA_API_BASE_URL` to construct the request URL.
 * - **Types:** Expects an `OllamaTagsResponse` from the API and returns an array of `DropdownOption`.
 * - **Hooks:** This function is primarily called by the `useOllamaModels` hook.
 */
export async function fetchOllamaModels(): Promise<DropdownOption[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${OLLAMA_API_BASE_URL}/tags`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`,
      );
    }
    const data: OllamaTagsResponse = await response.json();
    return data.models.map((model) => ({
      value: model.name,
      label: model.name,
    }));
  } catch (error) {
    console.error("Error fetching Ollama models:", error);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Request timeout: Ollama server is not responding. Ensure it is running and accessible.",
      );
    }
    throw new Error(handleNetworkError(error));
  }
}

/**
 * @description Sends a chat completion request to the Ollama API's `/api/chat` endpoint to perform a translation.
 * @param {object} params - An object containing the parameters for the translation request.
 * @param {string} params.model - The name of the model to use for the request.
 * @param {OllamaMessage[]} params.messages - The array of messages, including the system prompt and the user's text to be translated.
 * @param {Record<string, unknown>} [params.options] - Optional Ollama parameters (e.g., temperature, seed) to control the generation.
 * @returns {Promise<string>} A promise that resolves to the translated text string from the AI's response content.
 * @throws An error with a user-friendly message if the API request fails, including parsing of the error response from Ollama.
 * @interactions
 * - **Browser API:** Uses `fetch` to make a POST request.
 * - **Helper Functions:** Calls `handleNetworkError` to process and standardize any caught network errors.
 * - **Constants:** Uses `OLLAMA_API_BASE_URL` to construct the request URL.
 * - **Types:** Uses `OllamaChatRequestBody` for the request body and expects an `OllamaChatResponse` from the API.
 * - **Hooks:** This function is primarily called by the `useTranslation` hook.
 */
export async function fetchTranslation({
  model,
  messages,
  options,
}: {
  model: string;
  messages: OllamaMessage[];
  options?: Record<string, unknown>;
}): Promise<string> {
  const requestBody: OllamaChatRequestBody = {
    model,
    messages,
    stream: false,
    options,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for translations

    const response = await fetch(`${OLLAMA_API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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
  } catch (error) {
    console.error("Error communicating with Ollama API:", error);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Translation request timeout. The model may be taking too long to respond.",
      );
    }
    throw new Error(handleNetworkError(error));
  }
}
