import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import usePageMeta from '@/hooks/usePageMeta';
import { useAuthStore } from '@/store/useAuthStore';

// Placeholder landing page for signed-in admins.
export default function Dashboard() {
  usePageMeta({ title: 'Admin | AFRIGULF Exchange', description: 'AFRIGULF Exchange admin portal.' });
  const navigate = useNavigate();
  const admin = useAuthStore(s => s.admin);
  const signOut = useAuthStore(s => s.signOut);

  return (
    <main id="main" className="min-h-svh bg-[#f3f7fb]">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
        <img src="/assets/twb-footer-logo.png" alt="TWB Global Tourism" width="140" height="84" className="h-10 w-auto" />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{admin?.name || admin?.email}</span>
          <Button variant="outline" size="sm" onClick={() => { signOut(); navigate('/admin/login', { replace: true }); }}>Sign out</Button>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl">Admin dashboard</h1>
        <p className="text-muted-foreground">You’re signed in. Admin tools will appear here.</p>
      </section>
    </main>
  );
}
