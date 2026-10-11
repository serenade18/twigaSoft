import usePageMeta from '@/hooks/usePageMeta';

// Stand-in for admin sections that haven't been built yet, so the sidebar links have somewhere to go.
export default function ComingSoon({ title }: { title: string }) {
  usePageMeta({ title: `${title} | AFRIGULF Exchange admin`, description: 'AFRIGULF Exchange admin portal.' });

  return (
    <section className="mx-auto max-w-5xl">
      <h1 className="text-3xl">{title}</h1>
      <p className="text-muted-foreground">This section is coming soon.</p>
    </section>
  );
}
