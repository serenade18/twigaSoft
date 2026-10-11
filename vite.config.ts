import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      // In development the app calls /api on its own origin and Vite forwards it to the backend (no CORS needed).
      proxy: { '/api': env.API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8000' },
    },
  };
});
