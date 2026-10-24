/**
 * @file useDebounce.js
 * @description Hook to debounce state values, optimizing search inputs and high-frequency UI updates.
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a rapidly changing value.
 * @template T
 * @param {T} value
 * @param {number} [delay=250] - Delay in milliseconds
 * @returns {T} Debounced value
 */
export const useDebounce = (value, delay = 250) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
