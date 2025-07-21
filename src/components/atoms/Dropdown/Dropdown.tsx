import React from 'react';
import { DropdownOption } from '../../../types';

interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: DropdownOption[];
  'aria-label'?: string;
  children?: React.ReactNode;
  value?: string;
}

/**
 * @description Renders a stylized HTML select (dropdown) element. It populates its options from a provided array and can also include child elements, such as a placeholder option.
 * @param {DropdownProps} props The props for the component, extending standard HTMLSelectElement attributes.
 * @param {DropdownOption[]} [props.options=[]] An array of objects, each with a `value` and `label`, used to generate the `<option>` elements for the dropdown.
 * @param {string} [props['aria-label']] An accessible label for the select element, crucial for screen readers.
 * @param {React.ReactNode} [props.children] Optional child elements, typically used for a disabled or default `<option>`.
 * @returns {React.ReactElement} The rendered dropdown component.
 * @interactions
 * - **CSS:** Relies on the `.dropdown` class in `index.css` for its brutalist styling, including hover and focus states.
 * - **Types:** Uses the `DropdownOption` interface from `src/types/index.ts` to define the structure of the `options` prop.
 * - **State:** The dropdown's value is typically controlled by parent components, which pass a `value` prop and handle changes via the `onChange` event handler.
 */
export const Dropdown: React.FC<DropdownProps> = ({ options = [], 'aria-label': ariaLabel, children, className, ...props }) => {
  const classNames = ['dropdown', className || ''].filter(Boolean).join(' ');

  return (
    <select {...props} className={classNames} aria-label={ariaLabel}>
      {children}
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
