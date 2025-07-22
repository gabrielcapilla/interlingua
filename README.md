# Interlingua

Interlingua is a clean, modern, and locally-run translation application. It leverages the power of local AI models via [Ollama](https://ollama.com/) to provide fast, private, and accurate translations directly on your machine.

The user interface is built with React and TypeScript, featuring a responsive, neo-brutalist design that works seamlessly across devices and supports your system's native dark mode.

## Key Features

*   **Local First AI:** All translations are processed locally by Ollama, ensuring your data remains private.
*   **Dynamic Model Selection:** Automatically detects and lists your available Ollama models. You can select your preferred model and even set a "favorite" for quick access.
*   **Multi-Language Support:** Translate between numerous languages, including an "Auto-Detect" feature for the source language.
*   **Text & File Translation:** Paste text directly or upload entire text-based files (`.txt`, `.md`, etc.) for translation.
*   **Responsive Design:** A clean, intuitive interface that adapts to any screen size.
*   **Dark Mode:** Automatically switches between light and dark themes based on your system preferences.
*   **Clipboard & Error Handling:** Easily copy translations and receive clear feedback on the application's status through non-intrusive toast notifications.

## Tech Stack

*   **Frontend:** [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **AI Backend:** [Ollama](https://ollama.com/)

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **[Node.js](https://nodejs.org/)**: Version 18.x or higher.
2.  **[Ollama](https://ollama.com/)**: The Ollama application must be installed and running on your system.
3.  **An Ollama Model**: You need at least one model pulled to use the application. You can pull a model by running a command like:
    ```sh
    ollama pull llama3
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

## Project Structure

The project follows a standard React application structure:

```
/src
├── /components   # Reusable UI components (Atoms, Molecules, Organisms)
├── /config       # Application constants (languages, API endpoints)
├── /hooks        # Custom React hooks for state management and logic
├── /pages        # Top-level page components
├── /providers    # React context providers (e.g., ToastProvider)
├── /services     # API communication logic (e.g., ollamaApi.ts)
└── /types        # TypeScript type definitions
```
