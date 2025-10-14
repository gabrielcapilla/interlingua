import React from "react";

/**
 * @description Renders a visual indicator with a pulsing animation to signify a loading or "thinking" state. This component is purely presentational.
 * @returns {React.ReactElement} A set of `div` elements that create the thinking indicator animation.
 * @interactions
 * - **CSS:** Relies entirely on classes and keyframes defined in `index.css` for its appearance and animation:
 *   - `.thinking-indicator`: The flex container for the dots.
 *   - `.thinking-indicator_dot`: Styles for the individual dots.
 *   - `@keyframes pulse`: The animation that creates the pulsing effect.
 */
export const ThinkingIndicator: React.FC = () => (
  <div className="thinking-indicator" aria-label="AI is thinking">
    <div className="thinking-indicator_dot" />
    <div className="thinking-indicator_dot" />
    <div className="thinking-indicator_dot" />
  </div>
);
