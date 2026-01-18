import React, { createContext, useState, useCallback, ReactNode } from "react";
import { Toast } from "../components/atoms/Toast";
import { IconVariant } from "../utils/icons";
import { generateToastId } from "../utils/transforms";

export interface ToastMessage {
  id: string;
  variant: IconVariant;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined,
);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = generateToastId();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
