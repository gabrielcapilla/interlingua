import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const variantIcons: Record<AlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

/**
 * @description Displays a stylized alert message with a corresponding icon, based on the specified variant.
 * @param {AlertProps} props - The component props.
 * @param {AlertVariant} [props.variant='info'] - The type of alert to display ('info', 'success', 'warning', 'error'). This determines the color and icon.
 * @param {React.ReactNode} props.children - The content of the alert message.
 * @param {string} [props.className] - Optional additional CSS classes to apply to the component.
 * @returns {React.ReactElement} The rendered alert component.
 * @interactions
 * - **CSS:** Uses the `.alert` BEM block and its modifiers (`.alert--{variant}`) from `index.css`.
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  children,
  className,
}) => {
  const classNames = ['alert', `alert--${variant}`, className].filter(Boolean).join(' ');
  const icon = variantIcons[variant];

  return (
    <div className={classNames} role="alert">
      <span className="alert__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="alert__message">{children}</div>
    </div>
  );
};
