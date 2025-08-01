import React, { createContext, useContext, useState, useEffect } from 'react';
import useRTL from '../hooks/useRTL';

// Create the theme context
const ThemeContext = createContext(null);

// Theme provider component
export const ThemeProvider = ({ children, initialTheme = 'dark', initialRTL = true }) => {
  // Theme state (light/dark)
  const [theme, setTheme] = useState(initialTheme);
  
  // RTL support
  const rtlSupport = useRTL(initialRTL);
  
  // Update theme class on document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };
  
  // Set theme explicitly
  const setThemeExplicitly = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);
    }
  };
  
  // Context value
  const contextValue = {
    theme,
    toggleTheme,
    setTheme: setThemeExplicitly,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    ...rtlSupport
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext; 