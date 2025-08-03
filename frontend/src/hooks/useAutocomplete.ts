import { useState, useEffect, useCallback } from 'react';
import { Course } from '../types';
import { apiService } from '../services/api';
import { useDebounce } from './useDebounce';

interface UseAutocompleteOptions {
  university?: string;
  limit?: number;
  debounceMs?: number;
  minLength?: number;
}

interface UseAutocompleteResult {
  suggestions: Course[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  selectSuggestion: (course: Course) => void;
  clearSuggestions: () => void;
}

/**
 * Custom hook for course autocomplete functionality
 * Provides debounced search with minimum character requirements
 */
export function useAutocomplete(
  onSelect?: (course: Course) => void,
  options: UseAutocompleteOptions = {}
): UseAutocompleteResult {
  const {
    university,
    limit = 10,
    debounceMs = 300,
    minLength = 3
  } = options;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Clear suggestions if query is too short
      if (!debouncedQuery || debouncedQuery.trim().length < minLength) {
        setSuggestions([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await apiService.searchCourses(
          debouncedQuery,
          university,
          undefined, // department
          undefined, // professor
          limit // limit
        );
        setSuggestions(results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery, university, limit, minLength]);

  const selectSuggestion = useCallback((course: Course) => {
    setQuery(course.name);
    setSuggestions([]);
    onSelect?.(course);
  }, [onSelect]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    loading,
    error,
    query,
    setQuery,
    selectSuggestion,
    clearSuggestions
  };
}