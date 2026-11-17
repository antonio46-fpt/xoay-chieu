import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Khi phát triển, /api được chuyển tiếp sang backend ở cổng 3000.
 * Nhờ vậy cookie phiên nằm cùng origin và không vướng CORS.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
