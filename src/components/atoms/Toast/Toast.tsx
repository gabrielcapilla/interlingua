import React, { useState, useEffect } from 'react';
import { Button } from '../Button';

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  id: string;
  variant: ToastVariant;
  title: string;
  message: string;
  onDismiss: (id: string) => void;
  duration?: number;
}

const variantIcons: Record<ToastVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

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
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, 300); // Match animation duration from CSS
      return () => clearTimeout(timer);
    }
  }, [isExiting, id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
  };

  const classNames = [
    'toast',
    `toast--${variant}`,
    isExiting ? 'toast--exiting' : '',
  ].filter(Boolean).join(' ');

  const icon = variantIcons[variant];

  return (
    <div className={classNames} role="alert" aria-live="assertive" aria-atomic="true">
      <span className="toast__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="toast__content">
        <div className="toast__title">{title}</div>
        <div className="toast__message">{message}</div>
      </div>
      <Button
        variant="transparent"
        iconOnly
        buttonShape="circular"
        onClick={handleDismiss}
        className="toast__close-button"
        aria-label="Close notification"
      >
        ✕
      </Button>
    </div>
  );
};
