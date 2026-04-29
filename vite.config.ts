import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'not op_mini all'],
      modernPolyfills: true,
    }),
  ],
  build: {
    cssTarget: 'chrome61',
  },
})
