/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  // HVAR Hub - Advanced Arabic RTL Theme System
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors - HVAR Theme
        'brand-red': {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        
        // Secondary Colors - Modern Blue Palette
        'brand-blue': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        
        // Accent Colors - Rich Palette
        'accent-green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        'accent-amber': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        'accent-purple': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        
        // UI Colors - Professional System
        'ui-success': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        'ui-warning': {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        'ui-danger': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        'ui-info': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        
        // Background Colors - Modern System
        'bg-light': '#f9fafb',
        'bg-dark': '#111827',
        'bg-card-dark': '#1f2937',
        'bg-card-light': '#ffffff',
        
        // Status Colors - Hub Scanning Theme
        'status-shipping': '#8b5cf6',
        'status-maintenance': '#f97316',
        'status-completed': '#10b981',
        'status-failed': '#ef4444',
        'status-pending': '#64748b',
        'status-processing': '#3b82f6',
        'status-active': '#22c55e',
        'status-busy': '#f59e0b',
        'status-offline': '#6b7280',
      },
      fontFamily: {
        'cairo': ['Cairo', 'sans-serif'],
        'cairo-play': ['"Cairo Play"', 'sans-serif'],
        'tajawal': ['Tajawal', 'sans-serif'],
        'roboto': ['Roboto', 'sans-serif'],
        'sans': ['"Cairo Play"', 'Cairo', 'Tajawal', 'sans-serif'],
        'display': ['"Cairo Play"', 'Cairo', 'Tajawal', 'sans-serif'],
        'mono': ['"Roboto Mono"', 'monospace'],
      },
      fontSize: {
        // Fluid typography using clamp - Optimized for Arabic
        'xs': ['clamp(0.75rem, 0.7rem + 0.1vw, 0.8rem)', { lineHeight: '1.5' }],
        'sm': ['clamp(0.875rem, 0.8rem + 0.15vw, 0.9rem)', { lineHeight: '1.5' }],
        'base': ['clamp(1rem, 0.95rem + 0.2vw, 1.1rem)', { lineHeight: '1.6' }],
        'lg': ['clamp(1.125rem, 1.05rem + 0.25vw, 1.2rem)', { lineHeight: '1.6' }],
        'xl': ['clamp(1.25rem, 1.2rem + 0.3vw, 1.4rem)', { lineHeight: '1.5' }],
        '2xl': ['clamp(1.5rem, 1.4rem + 0.4vw, 1.7rem)', { lineHeight: '1.4' }],
        '3xl': ['clamp(1.875rem, 1.7rem + 0.5vw, 2.1rem)', { lineHeight: '1.3' }],
        '4xl': ['clamp(2.25rem, 2rem + 0.6vw, 2.5rem)', { lineHeight: '1.2' }],
        '5xl': ['clamp(3rem, 2.5rem + 0.7vw, 3.5rem)', { lineHeight: '1.1' }],
        '6xl': ['clamp(3.75rem, 3rem + 0.8vw, 4.5rem)', { lineHeight: '1.1' }],
      },
      spacing: {
        // Fluid spacing using clamp - Optimized for Arabic UI
        '1': 'clamp(0.25rem, 0.2rem + 0.1vw, 0.3rem)',
        '2': 'clamp(0.5rem, 0.4rem + 0.2vw, 0.6rem)',
        '3': 'clamp(0.75rem, 0.6rem + 0.3vw, 0.9rem)',
        '4': 'clamp(1rem, 0.8rem + 0.4vw, 1.2rem)',
        '5': 'clamp(1.25rem, 1rem + 0.5vw, 1.5rem)',
        '6': 'clamp(1.5rem, 1.2rem + 0.6vw, 1.8rem)',
        '7': 'clamp(1.75rem, 1.4rem + 0.7vw, 2.1rem)',
        '8': 'clamp(2rem, 1.6rem + 0.8vw, 2.4rem)',
        '9': 'clamp(2.25rem, 1.8rem + 0.9vw, 2.7rem)',
        '10': 'clamp(2.5rem, 2rem + 1vw, 3rem)',
        '12': 'clamp(3rem, 2.4rem + 1.2vw, 3.6rem)',
        '16': 'clamp(4rem, 3.2rem + 1.6vw, 4.8rem)',
        '20': 'clamp(5rem, 4rem + 2vw, 6rem)',
        '24': 'clamp(6rem, 4.8rem + 2.4vw, 7.2rem)',
        '32': 'clamp(8rem, 6.4rem + 3.2vw, 9.6rem)',
        '40': 'clamp(10rem, 8rem + 4vw, 12rem)',
        '48': 'clamp(12rem, 9.6rem + 4.8vw, 14.4rem)',
        '56': 'clamp(14rem, 11.2rem + 5.6vw, 16.8rem)',
        '64': 'clamp(16rem, 12.8rem + 6.4vw, 19.2rem)',
      },
      borderRadius: {
        'sm': 'clamp(0.125rem, 0.1rem + 0.05vw, 0.15rem)',
        'md': 'clamp(0.375rem, 0.3rem + 0.15vw, 0.45rem)',
        'lg': 'clamp(0.5rem, 0.4rem + 0.2vw, 0.6rem)',
        'xl': 'clamp(0.75rem, 0.6rem + 0.3vw, 0.9rem)',
        '2xl': 'clamp(1rem, 0.8rem + 0.4vw, 1.2rem)',
        '3xl': 'clamp(1.5rem, 1.2rem + 0.6vw, 1.8rem)',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner-light': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'inner-dark': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)',
        // Brand-specific shadows
        'red': '0 4px 14px 0 rgba(244, 63, 94, 0.2)',
        'blue': '0 4px 14px 0 rgba(14, 165, 233, 0.2)',
        'green': '0 4px 14px 0 rgba(34, 197, 94, 0.2)',
        'amber': '0 4px 14px 0 rgba(249, 115, 22, 0.2)',
        'purple': '0 4px 14px 0 rgba(168, 85, 247, 0.2)',
        'brand-red': '0 4px 14px 0 rgba(244, 63, 94, 0.25)',
        'brand-blue': '0 4px 14px 0 rgba(14, 165, 233, 0.25)',
        'accent-green': '0 4px 14px 0 rgba(34, 197, 94, 0.25)',
        'accent-purple': '0 4px 14px 0 rgba(168, 85, 247, 0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-right': 'slideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-left': 'slideLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse': 'pulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'bounce 1s infinite cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'scan-pulse': 'scanPulse 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(244, 63, 94, 0.7)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(244, 63, 94, 0)',
            transform: 'scale(1.05)'
          },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(244, 63, 94, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(244, 63, 94, 0.8)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          md: '2rem',
          lg: '2rem',
          xl: '2rem',
        },
        screens: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px',
          '2xl': '1536px',
        },
      },
      // RTL Support - Enhanced for Arabic
      textAlign: {
        start: 'start',
        end: 'end',
      },
      inset: {
        'start': 'var(--start)',
        'end': 'var(--end)',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'bounce-out': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      aspectRatio: {
        'square': '1 / 1',
        'video': '16 / 9',
        'portrait': '3 / 4',
        'landscape': '4 / 3',
        'qr': '1 / 1',
        'card': '4 / 3',
      },
      // Custom gradients for Arabic UI
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        'gradient-blue': 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
        'gradient-purple': 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
        'gradient-green': 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gradient-amber': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function({ addBase, addUtilities, theme }) {
      addBase({
        'html[dir="rtl"]': {
          '--start': 'right',
          '--end': 'left',
        },
        'html[dir="ltr"]': {
          '--start': 'left',
          '--end': 'right',
        },
        'html': {
          fontFamily: '"Cairo Play", Cairo, Tajawal, sans-serif',
          scrollBehavior: 'smooth',
          textRendering: 'optimizeLegibility',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        'body': {
          fontFamily: '"Cairo Play", Cairo, Tajawal, sans-serif',
          lineHeight: '1.6',
          textRendering: 'optimizeLegibility',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
          direction: 'rtl',
        },
        'h1, h2, h3, h4, h5, h6': {
          fontFamily: '"Cairo Play", Cairo, Tajawal, sans-serif',
          fontWeight: '700',
          lineHeight: '1.3',
        },
        'p, span, div': {
          fontFamily: '"Cairo Play", Cairo, Tajawal, sans-serif',
        },
        // Arabic-specific optimizations
        '.arabic-text': {
          fontFamily: '"Cairo Play", Cairo, sans-serif',
          textAlign: 'right',
          direction: 'rtl',
        },
        '.arabic-number': {
          fontFamily: 'Roboto, sans-serif',
          direction: 'ltr',
          unicodeBidi: 'embed',
        },
      });
      
      // Custom utilities for Arabic UI
      addUtilities({
        '.text-balance': {
          textWrap: 'balance',
        },
        '.text-pretty': {
          textWrap: 'pretty',
        },
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.mask-radial-faded': {
          'mask-image': 'radial-gradient(circle at center, black 55%, transparent 80%)',
        },
        '.mask-linear-faded-x': {
          'mask-image': 'linear-gradient(to right, black 70%, transparent 95%)',
        },
        '.mask-linear-faded-y': {
          'mask-image': 'linear-gradient(to bottom, black 70%, transparent 95%)',
        },
        '.rtl-space-x-reverse': {
          '& > * + *': {
            '--tw-space-x-reverse': '1',
          },
        },
        '.ml-reverse': {
          'margin-right': 'var(--ml)',
          'margin-left': '0',
        },
        '.mr-reverse': {
          'margin-left': 'var(--mr)',
          'margin-right': '0',
        },
        // Arabic-specific utilities
        '.arabic-card': {
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          },
        },
        '.arabic-button': {
          fontFamily: '"Cairo Play", sans-serif',
          fontWeight: '600',
          borderRadius: '0.75rem',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        '.arabic-input': {
          fontFamily: '"Cairo Play", sans-serif',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:focus': {
            outline: 'none',
            borderColor: '#0ea5e9',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
          },
        },
        '.glass-effect': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.scan-frame': {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            border: '2px solid #f43f5e',
            borderRadius: '1rem',
            animation: 'scanPulse 2s ease-in-out infinite',
          },
        },
      });
    },
  ],
}