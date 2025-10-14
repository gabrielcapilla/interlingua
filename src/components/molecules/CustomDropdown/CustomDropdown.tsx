import React, { useState, useRef, useEffect, KeyboardEvent, useMemo } from "react";
import { DropdownOption } from "../../../types";

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  columns?: 1 | 2;
}

/**
 * @description Renders a fully custom, accessible, and themeable dropdown component, designed to replace the native HTML <select> element. It provides a consistent Neo-Brutalist look and feel for both the trigger and the options panel.
 * @param {CustomDropdownProps} props The props for the component.
 * @returns {React.ReactElement} The rendered custom dropdown component.
 * @interactions
 * - **React Hooks:** Uses `useState` to manage the open/closed state, `useRef` to reference the component for outside click detection, and `useEffect` and `useCallback` for event handling logic.
 * - **State:** Manages an `isOpen` boolean state to toggle the visibility of the options panel.
 * - **Event Handling:**
 *   - Clicking the trigger toggles the dropdown's visibility.
 *   - Clicking an option selects it, calls the `onChange` callback, and closes the panel.
 *   - Clicking outside the component closes the panel.
 *   - Keyboard navigation (Arrow keys, Enter, Escape) is supported for accessibility.
 * - **CSS:** Relies on the `.custom-dropdown` BEM block in `index.css` for all styling.
 * - **Accessibility:** Implements ARIA attributes (`aria-haspopup`, `aria-expanded`, `role`, `aria-selected`) to ensure it's usable with screen readers and other assistive technologies.
 */
export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  "aria-label": ariaLabel,
  className,
  columns = 1,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create a map for O(1) lookups instead of O(n) find operations
  const optionsMap = useMemo(() => {
    const map = new Map<string, DropdownOption>();
    options.forEach((option) => map.set(option.value, option));
    return map;
  }, [options]);

  const selectedOption = useMemo(
    () => optionsMap.get(value) || null,
    [optionsMap, value],
  );

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        handleToggle();
        break;
      case "Escape":
        if (isOpen) setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((o) => o.value === value); // Still need this for navigation
          const nextIndex = Math.min(options.length - 1, currentIndex + 1);
          onChange(options[nextIndex].value);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          const currentIndex = options.findIndex((o) => o.value === value); // Still need this for navigation
          const prevIndex = Math.max(0, currentIndex - 1);
          onChange(options[prevIndex].value);
        }
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const selectedEl = dropdownRef.current?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      selectedEl?.focus();
    }
  }, [isOpen]);

  const containerClasses = ["custom-dropdown", className || ""]
    .filter(Boolean)
    .join(" ");
  const optionsClasses = [
    "custom-dropdown_options",
    columns === 2 ? "custom-dropdown_options-columns-2" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Memoize the options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => options, [options]);

  return (
    <div ref={dropdownRef} className={containerClasses}>
      <button
        type="button"
        className="custom-dropdown_trigger"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span className="custom-dropdown_arrow" aria-hidden="true" />
      </button>

      {isOpen && (
        <ul className={optionsClasses} role="listbox" aria-label={ariaLabel}>
          {memoizedOptions.map((option) => (
            <li
              key={option.value}
              className={`custom-dropdown_option ${option.value === value ? "custom-dropdown_option-selected" : ""}`}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOptionClick(option.value);
                }
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
