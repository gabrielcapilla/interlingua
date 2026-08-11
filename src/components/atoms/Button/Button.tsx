import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "subtle" | "transparent";
  buttonShape?: "rounded" | "circular";
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      buttonShape = "rounded",
      iconOnly = false,
      className,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "button",
        `button_${variant}`,
        `button_shape-${buttonShape}`,
        iconOnly && "button_icon-only",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
