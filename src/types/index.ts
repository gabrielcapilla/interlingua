export interface DropdownOption {
  value: string;
  label: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaChatRequestBody {
  model: string;
  messages: OllamaMessage[];
  stream: false;
  options?: Record<string, unknown>;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}
