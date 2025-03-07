import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@aws-amplify/ui-react';
import './Autocomplete.css';

export interface AutocompleteProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  descriptiveText?: string;
  errorMessage?: string;
  className?: string;
  loadingState?: boolean;
  isLoading?: boolean;
  isRequired?: boolean;
  name?: string;
}

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

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