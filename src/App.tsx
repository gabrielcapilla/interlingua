import React from 'react';
import { TranslationPage } from './pages/TranslationPage';

/**
 * @description The main application component. It serves as the root of the React component tree and is responsible for rendering the primary layout and pages of the application.
 * @returns {React.ReactElement} The rendered `TranslationPage` component.
 * @interactions
 * - Renders the `TranslationPage` component, which contains the application's core functionality.
 * - This component is the entry point rendered by `ReactDOM.createRoot` in `index.tsx`.
 */
function App() {
  return (
    <TranslationPage />
  );
}

export default App;
