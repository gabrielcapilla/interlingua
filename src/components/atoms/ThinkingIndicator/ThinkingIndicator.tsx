import type { FC } from "react";

export const ThinkingIndicator: FC = () => (
  <div className="thinking-indicator" role="status" aria-label="AI is thinking">
    <div className="thinking-indicator_dot" />
    <div className="thinking-indicator_dot" />
    <div className="thinking-indicator_dot" />
  </div>
);
