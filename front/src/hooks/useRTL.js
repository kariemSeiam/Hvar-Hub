import { useState, useEffect, useCallback } from 'react';
import { isRTL, setDirection } from '../utils/rtl';

/**
 * React hook for RTL support in the application
 * @param {boolean} initialRTL - Initial RTL state (default: true for Arabic)
 * @returns {Object} RTL state and functions to control it
 */
const useRTL = (initialRTL = true) => {
  const [rtl, setRTL] = useState(initialRTL);

  // Set the initial direction on mount
  useEffect(() => {
    setDirection(rtl);
  }, []);

  // Toggle RTL direction
  const toggleRTL = useCallback(() => {
    const newRTL = !rtl;
    setRTL(newRTL);
    setDirection(newRTL);
  }, [rtl]);

  // Set RTL direction explicitly
  const setRTLDirection = useCallback((value) => {
    setRTL(value);
    setDirection(value);
  }, []);

  return {
    isRTL: rtl,
    toggleRTL,
    setRTL: setRTLDirection,
    dir: rtl ? 'rtl' : 'ltr',
    lang: rtl ? 'ar' : 'en',
  };
};

export default useRTL; 