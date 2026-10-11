import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchCurrentAdmin } from '@/adminApi';
import { useAuthStore } from '@/store/useAuthStore';

/** Guards admin pages: redirects to sign-in without a session, and checks a saved session with the API first. */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const token = useAuthStore(s => s.token);
  const location = useLocation();
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token || token === verifiedToken) return;
    let cancelled = false;
    setCheckFailed(false);
    fetchCurrentAdmin()
      .then(() => { if (!cancelled) setVerifiedToken(token); })
      .catch(() => { if (!cancelled) setCheckFailed(true); }); // a 401 also clears the token, which redirects below
    return () => { cancelled = true; };
  }, [token, verifiedToken, attempt]);

  if (!token) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (token !== verifiedToken) {
    return (
      <main id="main" className="grid min-h-svh place-items-center bg-[#f3f7fb] px-4 text-center text-muted-foreground" aria-busy={!checkFailed}>
        {checkFailed
          ? <p role="alert">We couldn’t confirm your session. <button type="button" className="font-semibold text-[#986115] underline" onClick={() => setAttempt(a => a + 1)}>Try again</button></p>
          : <p role="status">Checking your session…</p>}
      </main>
    );
  }
  return children;
}
