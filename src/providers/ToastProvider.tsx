import React, { createContext, useState, useCallback, ReactNode } from "react";
import { Toast } from "../components/atoms/Toast";

type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * @description A React provider that manages the state and rendering of toast notifications for the entire application.
 * @param {ToastProviderProps} props - The component props.
 * @param {ReactNode} props.children - The child components that will have access to the toast context.
 * @returns {React.ReactElement} The provider component.
 * @interactions
 * - **React Hooks:** Uses `useState` to maintain an array of active toasts and `useCallback` to memoize the `addToast` and `removeToast` functions.
 * - **Context API:** Creates and provides `ToastContext`, which exposes the `addToast` function to child components via the `useToast` hook.
 * - **Component Rendering:** Renders a `div` with the `.toast-container` class, which is a portal-like container for all active `Toast` components. It maps over the `toasts` state array to render each `Toast` component.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
