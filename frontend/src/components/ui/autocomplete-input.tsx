"use client";

import React from 'react';
import { Input } from './input';

interface AutocompleteInputProps {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function AutocompleteInput({
  placeholder = "Search courses... (min 3 characters)",
  className = "",
  value,
  onChange,
  onKeyDown
}: AutocompleteInputProps) {
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange?.(newValue);
  };

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={handleInputChange}
      onKeyDown={onKeyDown}
      className={`w-full ${className}`}
    />
  );
}