import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          /%VITE_GA_MEASUREMENT_ID%/g,
          process.env.VITE_GA_MEASUREMENT_ID || ''
        );
      }
    }
  ],
  server: {
    proxy: {
      '/api/tts': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom'
  }
});
