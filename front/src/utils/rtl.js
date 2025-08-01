/**
 * RTL Utilities for Arabic Support
 * This file contains helper functions for RTL support in the application
 */

/**
 * Check if the current document direction is RTL
 * @returns {boolean} True if the document direction is RTL
 */
export const isRTL = () => {
  return document.documentElement.dir === 'rtl';
};

/**
 * Set the document direction
 * @param {boolean} rtl - True for RTL, false for LTR
 */
export const setDirection = (rtl = true) => {
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = rtl ? 'ar' : 'en';
};

/**
 * Get the opposite direction
 * @param {string} direction - 'left' or 'right'
 * @returns {string} The opposite direction based on current RTL setting
 */
export const getOppositeDirection = (direction) => {
  const isDocRTL = isRTL();
  
  if (direction === 'left') {
    return isDocRTL ? 'right' : 'left';
  }
  
  if (direction === 'right') {
    return isDocRTL ? 'left' : 'right';
  }
  
  return direction;
};

/**
 * Get the start direction based on RTL setting
 * @returns {string} 'right' for RTL, 'left' for LTR
 */
export const getStartDirection = () => {
  return isRTL() ? 'right' : 'left';
};

/**
 * Get the end direction based on RTL setting
 * @returns {string} 'left' for RTL, 'right' for LTR
 */
export const getEndDirection = () => {
  return isRTL() ? 'left' : 'right';
};

/**
 * Convert a CSS property to its RTL equivalent if needed
 * @param {string} property - CSS property name
 * @returns {string} The RTL-aware property name
 */
export const getRTLCSSProperty = (property) => {
  if (!isRTL()) return property;
  
  const rtlMap = {
    'margin-left': 'margin-right',
    'margin-right': 'margin-left',
    'padding-left': 'padding-right',
    'padding-right': 'padding-left',
    'border-left': 'border-right',
    'border-right': 'border-left',
    'border-top-left-radius': 'border-top-right-radius',
    'border-top-right-radius': 'border-top-left-radius',
    'border-bottom-left-radius': 'border-bottom-right-radius',
    'border-bottom-right-radius': 'border-bottom-left-radius',
    'left': 'right',
    'right': 'left',
    'text-align-left': 'text-align-right',
    'text-align-right': 'text-align-left',
  };
  
  return rtlMap[property] || property;
};

/**
 * Flip a number value for RTL if needed (e.g., for transforms)
 * @param {number} value - The value to potentially flip
 * @returns {number} The value, potentially negated for RTL
 */
export const getRTLValue = (value) => {
  return isRTL() ? -value : value;
};

/**
 * Create an RTL-aware style object
 * @param {Object} styles - The style object
 * @returns {Object} RTL-aware style object
 */
export const createRTLStyles = (styles) => {
  if (!isRTL()) return styles;
  
  const rtlStyles = {};
  
  Object.entries(styles).forEach(([key, value]) => {
    const rtlKey = getRTLCSSProperty(key);
    rtlStyles[rtlKey] = value;
  });
  
  return rtlStyles;
};

export default {
  isRTL,
  setDirection,
  getOppositeDirection,
  getStartDirection,
  getEndDirection,
  getRTLCSSProperty,
  getRTLValue,
  createRTLStyles,
}; 