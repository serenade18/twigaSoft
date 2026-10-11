import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// The suite runs the real Django API (../twigaSoftApi, MySQL database `<name>_e2e`) and the Vite dev server
// on their own ports, so it doesn't interfere with `npm run dev` or the API's dev server.
export const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), process.env.E2E_API_DIR ?? '../twigaSoftApi');
const API_PORT = 8001;
const WEB_PORT = 5174;
const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // Tests share one database and reset it, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Migrate first: Playwright starts web servers before globalSetup, and the readiness check queries the database.
      command: `.venv/bin/python manage.py migrate --noinput && .venv/bin/python manage.py runserver 127.0.0.1:${API_PORT} --noreload`,
      cwd: API_DIR,
      url: `http://127.0.0.1:${API_PORT}/api/events`,
      env: { DJANGO_SETTINGS_MODULE: 'config.settings_e2e', FRONTEND_URL: WEB_URL, PYTHONUNBUFFERED: '1' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`, VITE_API_BASE_URL: '' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
