import type { FC, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { icons } from "../../../utils/icons";

type AlertVariant = keyof typeof icons;

interface AlertProps {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}

export const Alert: FC<AlertProps> = ({ variant = "info", children, className }) => (
  <div className={cn("alert", `alert_${variant}`, className)} role="alert">
    <span className="alert_icon" aria-hidden="true">
      {icons[variant]}
    </span>
    <div className="alert_message">{children}</div>
  </div>
);
