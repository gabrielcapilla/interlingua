# Interlingua

Interlingua is a clean, modern, and locally-run translation application. It leverages the power of local AI models via [Ollama](https://ollama.com/) to provide fast, private, and accurate translations directly on your machine.

![image](/img/light-mode.webp)

## Key Features

*   **Local First AI:** All translations are processed locally by Ollama, ensuring your data remains private.
*   **Dynamic Model Selection:** Automatically detects and lists your available Ollama models. You can select your preferred model and even set a "favorite" for quick access.
*   **Multi-Language Support:** Translate between numerous languages, including an "Auto-Detect" feature for the source language.
*   **Text & File Translation:** Paste text directly or upload entire text-based files (`.txt`, `.md`, etc.) for translation.
*   **Responsive Design:** A clean, intuitive interface that adapts to any screen size.
*   **Dark Mode:** Automatically switches between light and dark themes based on your system preferences.
*   **Clipboard & Error Handling:** Easily copy translations and receive clear feedback on the application's status through non-intrusive toast notifications.

## Tech Stack

*   **Frontend:** [React 19](https://react.dev/) &  [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **AI Backend:** [Ollama](https://ollama.com/)

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **[Node.js](https://nodejs.org/)**: Version 18.x or higher.
2.  **[Ollama](https://ollama.com/)**: The Ollama application must be installed and running on your system.
3.  **An Ollama Model**: You need at least one model pulled to use the application. You can pull a model by running a command like:
    ```sh
    ollama pull gemma3:latest
    ```

## Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/gabrielcapilla/interlingua.git
    cd interlingua
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

## Configuration

The application is configured to connect to the standard Ollama API endpoint (`http://localhost:11434/api`) by default. This is defined in `src/config/constants.ts`. No `.env` file or other configuration is required unless you need to change this endpoint.

**Important:** The Ollama application must be running in the background for Interlingua to function. You can start it by running `ollama serve` in your terminal.

## Running the Application

To start the development server, run:

```sh
npm run dev
```

The application will be available at `http://localhost:5173` (or the next available port).

## Available Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Compiles and bundles the application for production.
*   `npm run preview`: Serves the production build locally for testing.

## Recommended Models for Translation

Below are the recommended translation models, each designed to meet different needs for quality and speed:

- **Fast Translations**: For those who require a fast translation, the `gemma:1b` model is the ideal choice. This model is optimized to deliver results as quickly as possible, although with a focus on speed rather than accuracy.

- **Fast and Accurate Translations**: If you are looking for a balance between speed and accuracy, the `gemma3:latest` and `gemma3n:latest` models are perfect. These models provide translations that are not only fast but also more accurate, making them an excellent option for texts that require greater care.

- **High-Quality Translations**: For those who need the best quality in their translations, the `gemma3:12b` and `gemma3:27b` models are the most recommended. These models are designed to offer high-fidelity translations, ideal for technical or literary documents where every word counts.

## Usage Limits

It is important to be aware of certain limitations to ensure the quality of the translations:

- **Text Length**: The maximum allowed length for texts to be translated is 6400 characters. This restriction has been implemented to ensure optimal results. I have observed that excessively long texts or files can generate errors in the translations. Therefore, to preserve quality, the length of texts has been limited.

- **Language Restriction**: Although the `gemma3` model has the technical capability to understand more than 100 languages, for design reasons, the selection of languages has been restricted to a limited number. If you wish to add more languages to the list, you can do so by modifying the `src/config/constants.ts` file. This will allow you to customize the translation experience according to your specific needs.

With these recommendations and limits, you can choose the translation model that best suits your requirements, ensuring high-quality and efficient results.

---

**Documentation automatically generated by the artificial intelligence model [Gemini CLI](https://github.com/google-gemini/gemini-cli).*
