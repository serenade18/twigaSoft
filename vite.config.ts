import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8000';
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    // Production build goes into the API project, which serves it (twigaSoftApi/frontend/dist).
    build: { outDir: path.resolve(__dirname, '../twigaSoftApi/frontend/dist'), emptyOutDir: true },
    server: {
      // In development the app calls /api on its own origin and Vite forwards it to the backend (no CORS needed).
      // Uploaded files (/media) come from the backend too.
      proxy: { '/api': backend, '/media': backend },
    },
  };
});
