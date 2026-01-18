import React from "react";
import { icons } from "../../../utils/icons";

type AlertVariant = keyof typeof icons;

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  children,
  className,
}) => (
  <div
    className={["alert", `alert_${variant}`, className]
      .filter(Boolean)
      .join(" ")}
    role="alert"
  >
    <span className="alert_icon" aria-hidden="true">
      {icons[variant]}
    </span>
    <div className="alert_message">{children}</div>
  </div>
);
