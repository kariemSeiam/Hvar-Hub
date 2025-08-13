import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-cairo transition-colors border
                 bg-white text-gray-700 hover:bg-gray-50 border-gray-200
                 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:border-gray-600"
   >
      {isDark ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3v2m0 14v2m7-9h2M3 12H1m15.364-6.364l1.414 1.414M6.222 17.778l-1.414 1.414m0-12.728l1.414 1.414M18.778 17.778l-1.414-1.414" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
      <span>{isDark ? 'فاتح' : 'داكن'}</span>
    </button>
  );
};

export default ThemeToggle;


