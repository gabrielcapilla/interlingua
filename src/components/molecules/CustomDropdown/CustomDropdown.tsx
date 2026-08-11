import {
  type FC,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DropdownOption } from "../../../types";
import { cn } from "../../../utils/cn";

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

const findOptionIndex = (options: DropdownOption[], value: string): number =>
  options.findIndex((o) => o.value === value);

export const CustomDropdown: FC<CustomDropdownProps> = ({
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

  const currentIndex = useMemo(() => findOptionIndex(options, value), [options, value]);
  const selectedOption = useMemo(
    () => options[currentIndex] || null,
    [options, currentIndex],
  );

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => !disabled && setIsOpen((prev) => !prev);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        handleToggle();
        break;
      case "Escape":
        isOpen && setIsOpen(false);
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        else if (currentIndex < options.length - 1) {
          const nextOption = options[currentIndex + 1];
          if (nextOption) onChange(nextOption.value);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen && currentIndex > 0) {
          const previousOption = options[currentIndex - 1];
          if (previousOption) onChange(previousOption.value);
        }
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
      dropdownRef.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn("custom-dropdown", className)}>
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
        <div
          className={cn(
            "custom-dropdown_options",
            columns === 2 && "custom-dropdown_options-columns-2",
          )}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "custom-dropdown_option",
                option.value === value && "custom-dropdown_option-selected",
              )}
              onClick={() => handleOptionClick(option.value)}
              role="option"
              aria-selected={option.value === value}
              tabIndex={0}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
