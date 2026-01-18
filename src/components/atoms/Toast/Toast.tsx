import React, { useState, useEffect } from "react";
import { Button } from "../Button";
import { icons } from "../../../utils/icons";

type ToastVariant = keyof typeof icons;

interface ToastProps {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  onDismiss: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  variant,
  title,
  message,
  onDismiss,
  duration = 5000,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), duration);
    return () => clearTimeout(timer);
  }, [id, duration]);

  useEffect(() => {
    if (!isExiting) return;
    const timer = setTimeout(() => onDismiss(id), 300);
    return () => clearTimeout(timer);
  }, [isExiting, id, onDismiss]);

  const handleDismiss = () => setIsExiting(true);

  return (
    <div
      className={["toast", `toast_${variant}`, isExiting && "toast_exiting"]
        .filter(Boolean)
        .join(" ")}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <span className="toast_icon" aria-hidden="true">
        {icons[variant]}
      </span>
      <div className="toast_content">
        <div className="toast_title">{title}</div>
        <div className="toast_message">{message}</div>
      </div>
      <Button
        variant="transparent"
        iconOnly
        buttonShape="circular"
        onClick={handleDismiss}
        className="toast_close-button"
        aria-label="Close notification"
      >
        ✕
      </Button>
    </div>
  );
};
