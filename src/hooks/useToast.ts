import { useContext } from "react";
import { ToastContext } from "../providers/ToastProvider";

/**
 * @description A custom hook that provides access to the `addToast` function from the `ToastContext`.
 * @returns {{ addToast: (toast: Omit<import('../providers/ToastProvider').ToastMessage, 'id'>) => void }} The context value, primarily the function to add a new toast.
 * @throws An error if the hook is used outside of a `ToastProvider`, ensuring it's used correctly within the application's component tree.
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
