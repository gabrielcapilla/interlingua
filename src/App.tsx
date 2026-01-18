import { TranslationPage } from "./pages/TranslationPage";
import { ToastProvider } from "./providers/ToastProvider";

function App() {
  return (
    <ToastProvider>
      <TranslationPage />
    </ToastProvider>
  );
}

export default App;
