/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API origin when it differs from the site's, e.g. https://api.example.com. Empty means same origin (/api). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
