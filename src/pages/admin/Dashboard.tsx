import usePageMeta from '@/hooks/usePageMeta';

// Placeholder landing page for signed-in admins; rendered inside AdminLayout.
export default function Dashboard() {
  usePageMeta({ title: 'Admin | AFRIGULF Exchange', description: 'AFRIGULF Exchange admin portal.' });

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-3xl">Admin dashboard</h1>
      <p className="text-muted-foreground">You’re signed in. Admin tools will appear here.</p>
    </section>
  );
}
