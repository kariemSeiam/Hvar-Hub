import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'arabic-optimizer',
      configResolved(config) {
        // Optimize for Arabic content
        config.build.rollupOptions = {
          ...config.build.rollupOptions,
          output: {
            ...config.build.rollupOptions.output,
            manualChunks: {
              ...config.build.rollupOptions.output.manualChunks,
              arabic: ['react', 'react-dom']
            }
          }
        };
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@assets': resolve(__dirname, './src/assets'),
      '@contexts': resolve(__dirname, './src/contexts'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@hooks': resolve(__dirname, './src/hooks'),
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    // Optimize for Arabic fonts
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 5173,
    open: false,
  },
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `$rtl: true;`
      }
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __RTL_SUPPORT__: JSON.stringify(true),
    __ARABIC_THEME__: JSON.stringify(true),
  },
  // Optimize for Arabic content
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      'framer-motion'
    ]
  }
});
