/**
 * Custom hook for managing search parameter state with URL persistence
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useSearchParamState = (initialValue: string = ''): [string, (value: string) => void] => {
  const [searchParams] = useSearchParams();
  const [value, setValue] = useState(() => {
    // Get search parameter from URL or use initial value
    const urlValue = searchParams.get('search') ?? '';
    return urlValue.trim() || initialValue;
  });

  // Update the state when URL search parameter changes
  useEffect(() => {
    const urlValue = searchParams.get('search') ?? '';
    setValue(urlValue.trim() || initialValue);
  }, [searchParams, initialValue]);

  return [value, setValue];
};