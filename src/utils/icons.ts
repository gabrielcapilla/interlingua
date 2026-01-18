export const icons = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
} as const;

export type IconVariant = keyof typeof icons;
