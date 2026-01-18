# Interlingua

![image](/img/preview.webp)

A locally-run translation application powered by [Ollama](https://ollama.com/). Private, fast, and accurate translations directly on your machine.

## Prerequisites

- [Bun](https://bun.sh/) (or npm)
- [Ollama](https://ollama.com/) installed and running
- An Ollama model installed

## Installation

```sh
git clone https://github.com/gabrielcapilla/interlingua.git
cd interlingua
bun install
```

## Running

```sh
bun run preview
```

**Important:** Ollama must be running in the background (`ollama serve`)

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
