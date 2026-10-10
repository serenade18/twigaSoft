# twigaSoft

AFRIGULF Exchange website, built with React + Vite.

```bash
npm install
npm run dev      # http://localhost:5173, /api proxied to API_PROXY_TARGET (default http://localhost:3000)
npm run build    # outputs dist/ (includes .htaccess for Apache SPA routing)
npm run preview
```

Routes: `/` (home) and `/about-twb-global`. The app calls `GET /api/events` and `POST /api/enquiries`.
