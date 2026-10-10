# twigaSoft

AFRIGULF Exchange website — React 18 + TypeScript + Vite, with shadcn/ui (Tailwind v4), Zod and Zustand.

```bash
npm install
npm run dev        # http://localhost:5173, /api proxied to API_PROXY_TARGET (default http://localhost:3000)
npm run typecheck
npm run build      # typechecks, then outputs dist/ (includes .htaccess for Apache SPA routing)
npm run preview
```

- Routes: `/` (home) and `/about-twb-global`.
- API: `GET /api/events`, `POST /api/enquiries` — request/response shapes live in `src/lib/schemas.ts`.
- Shared UI state (selected enquiry interest, details dialog) lives in `src/store/useSiteStore.ts`.
- `src/styles/styles.css` and `twb.css` are the original site styles; `src/styles/index.css` loads Tailwind
  utilities (no preflight) and the shadcn theme tokens. Add shadcn components with `npx shadcn@latest add <name>`.
