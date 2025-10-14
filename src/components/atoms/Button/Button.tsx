import React, { forwardRef, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "subtle" | "transparent";
  buttonShape?: "rounded" | "circular";
  iconOnly?: boolean;
}

/**
 * @description Renders a stylized, reusable button element, designed with a brutalist aesthetic. This component is highly versatile, supporting multiple visual variants, shapes, and an icon-only mode. It forwards its ref to the underlying native HTML button element, allowing for direct DOM manipulation.
 * @param {ButtonProps} props The props for the component, extending standard HTMLButtonElement attributes.
 * @param {React.ReactNode} props.children The content to be displayed inside the button (e.g., text, an icon).
 * @param {'primary' | 'secondary' | 'subtle' | 'transparent'} [props.variant='secondary'] The visual style of the button.
 * @param {'rounded' | 'circular'} [props.buttonShape='rounded'] The shape of the button.
 * @param {boolean} [props.iconOnly=false] A flag to apply styles for an icon-only button, which typically affects padding and dimensions.
 * @param {React.Ref<HTMLButtonElement>} ref A forwarded ref that points to the native button element.
 * @returns {React.ReactElement} The rendered button component.
 * @interactions
 * - **CSS:** This component's appearance is heavily dependent on a set of BEM-style CSS classes defined in `index.css`:
 *   - `.button`: Base styles.
 *   - `.button_{variant}`: Variant-specific styles (e.g., `.button_primary`).
 *   - `.button_shape-{buttonShape}`: Shape-specific styles (e.g., `.button_shape-circular`).
 *   - `.button_icon-only`: Styles for icon-only buttons.
 *   - Hover, active, focus, and disabled states are also managed via CSS.
 */
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
  ) => {
    const classNames = [
      "button",
      `button_${variant}`,
      `button_shape-${buttonShape}`,
      iconOnly ? "button_icon-only" : "",
      className || "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classNames} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
