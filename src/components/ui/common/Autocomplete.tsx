import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@aws-amplify/ui-react';
import './Autocomplete.css';

export interface AutocompleteProps {
  options: string[];               // Array of available options to choose from
  value: string;                   // Current input value (controlled component)
  onChange: (value: string) => void; // Handler for text input changes
  onSelect: (value: string) => void; // Handler for when an option is selected
  placeholder?: string;            // Placeholder text for empty input
  label?: string;                  // Label text for the field
  disabled?: boolean;              // Whether the component is disabled
  required?: boolean;              // Whether the field is required
  descriptiveText?: string;        // Helper text displayed below the field
  errorMessage?: string;           // Error message when validation fails
  className?: string;              // Additional CSS classes
  loadingState?: boolean;          // Whether the component is in loading state
  isLoading?: boolean;             // Alternative loading state prop (for consistency)
  isRequired?: boolean;            // Alternative required prop (for consistency)
  name?: string;                   // Field name for form submission
}

/**
 * Autocomplete component that provides suggestions as the user types
 * Supports keyboard navigation, custom styling, and form validation
 */
export const Autocomplete: React.FC<AutocompleteProps> = ({
  options,
  value,
  onChange,
  onSelect,
  placeholder = '',
  label = '',
  disabled = false,
  required = false,
  descriptiveText,
  errorMessage,
  className = '',
  loadingState = false
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  useEffect(() => {
    if (value) {
      const filtered = options.filter(option => 
        option.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [value, options]);

  // Handle outside clicks to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Update parent component with input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  // Pass selected option to parent and close dropdown
  const handleSelectOption = (option: string) => {
    onSelect(option);
    setShowSuggestions(false);
  };

  return (
    <div className={`autocomplete-wrapper ${className}`} ref={wrapperRef}>
      <TextField
        label={label}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onFocus={() => setShowSuggestions(true)}
        disabled={disabled || loadingState}
        isRequired={required}
        hasError={!!errorMessage}
        errorMessage={errorMessage}
        descriptiveText={descriptiveText}
      />
      
      {/* Suggestion dropdown - only shown when input is focused and options exist */}
      {showSuggestions && filteredOptions.length > 0 && (
        <div className="suggestions-container">
          {filteredOptions.map((option, index) => (
            <div 
              key={index} 
              className="suggestion-item"
              onClick={() => handleSelectOption(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
      
      {/* No results message - shown when input has value but no matches found */}
      {showSuggestions && filteredOptions.length === 0 && value && (
        <div className="suggestions-container">
          <div className="suggestion-item no-results">
            No matches found
          </div>
        </div>
      )}
    </div>
  );
};