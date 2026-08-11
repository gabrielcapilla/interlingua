# Interlingua

![image](preview.webp)

A locally-run translation application powered by [Ollama](https://ollama.com/) or [llama.cpp](https://github.com/ggml-org/llama.cpp). Private, fast, and accurate translations directly on your machine.

## Prerequisites

- [Bun](https://bun.sh/) (or npm)
- Ollama or llama.cpp installed and running
- A compatible local model

## Installation

```sh
git clone https://github.com/gabrielcapilla/interlingua.git
cd interlingua
bun install
```

## Running

```sh
bun run build
bun run preview
```

Interlingua discovers both providers automatically:

- Ollama: `http://localhost:11434/api`
- llama.cpp: `http://localhost:4256/v1`

Start Ollama with `ollama serve`, or start llama.cpp with an OpenAI-compatible
server, for example:

```sh
llama-server --model /path/to/model.gguf --host 0.0.0.0 --port 4256
```

## Checks and evaluation

Run the deterministic repository checks without a model server:

```sh
bun run check
```

For coverage details:

```sh
bun run test:coverage
bun run format:check
bun run measure:runtime
```

The local TranslateGemma evaluation is opt-in because it requires a running
provider. Set the model path or provider reference before running it:

```sh
INTERLINGUA_EVAL_PROVIDER=llamacpp \
INTERLINGUA_EVAL_MODEL=/path/to/translategemma-4b-it.Q4_K_M.gguf \
bun run benchmark:local
```

The benchmark reports detection accuracy, unknown results, translation
fidelity checks, response-contract violations, format leakage, prompt size,
cache hits, and mean/p50/p95 latency. Add `--strict --compare` to enforce
thresholds and compare the current prompt with the legacy variant. Its
fixtures are regression signals rather than a general translation-quality
score.

## Recommended Models for Translation

[TranslateGemma](https://blog.google/innovation-and-ai/technology/developers-tools/translategemma/) is our recommended model—a new open translation model built on Gemma 3 that supports 55 languages.

**Installation:**

```sh
ollama pull translategemma
```

**Available variants:**

- `translategemma:4b` (~3.3GB) - Fast and efficient for everyday translations
- `translategemma:12b` (~8.1GB) - Best balance of speed and quality
- `translategemma:27b` (~17GB) - Highest quality for complex texts

**All variants support 128K context window and multimodal capabilities.**
