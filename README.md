# twigaSoft

AFRIGULF Exchange website — React 18 + TypeScript + Vite, with shadcn/ui (Tailwind v4), Zod and Zustand.

```bash
npm install
npm run dev        # http://localhost:5173, /api proxied to API_PROXY_TARGET (default http://localhost:8000, the Django API in ../twigaSoftApi)
npm run typecheck
npm run build      # typechecks, then outputs dist/ (includes .htaccess for Apache SPA routing)
npm run preview
```

- Routes: `/` (home) and `/about-twb-global`.
- API: `GET /api/events`, `POST /api/enquiries` — request/response shapes live in `src/lib/schemas.ts`.
- Shared UI state (selected enquiry interest, details dialog) lives in `src/store/useSiteStore.ts`.
- `src/styles/styles.css` and `twb.css` are the original site styles; `src/styles/index.css` loads Tailwind
  utilities (no preflight) and the shadcn theme tokens. Add shadcn components with `npx shadcn@latest add <name>`.

## Admin authentication

Routes: `/admin/login`, `/admin/forgot-password`, `/admin/reset-password?token=…`, and `/admin` (requires sign-in).

API contract the screens expect (errors return a non-2xx status with `{ "error": "Message shown to the user" }`):

| Method & path | Body | Success response |
| --- | --- | --- |
| `POST /api/admin/auth/login` | `{ email, password }` | `{ token, admin: { email, name?, id? } }` |
| `POST /api/admin/auth/forgot-password` | `{ email }` | any 2xx — respond the same whether or not the account exists |
| `POST /api/admin/auth/reset-password` | `{ token, password }` | any 2xx |

The reset email should link to `https://<site>/admin/reset-password?token=<one-time token>`.
Admin requests use `adminFetch` (`src/adminApi.ts`), which sends `Authorization: Bearer <token>` and signs out on `401`.
