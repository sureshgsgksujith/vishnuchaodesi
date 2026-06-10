import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    cssTarget: 'chrome61',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-dom') || id.includes('scheduler')) {
            return 'react-dom-vendor';
          }

          if (id.includes('react-router') || id.includes('@remix-run')) {
            return 'router-vendor';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          if (id.includes('axios')) {
            return 'http-vendor';
          }

          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('redux')) {
            return 'state-vendor';
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-vendor';
          }

          if (id.includes('react-hot-toast')) {
            return 'toast-vendor';
          }

          if (id.includes('react-icons')) {
            return 'icons-vendor';
          }

          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
})
