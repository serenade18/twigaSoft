import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchEnquiries } from '@/adminApi';
import EnquiryDetailSheet, { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import EnquiryStatusBadge, { STATUS_LABELS } from '@/components/admin/EnquiryStatusBadge';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { ENQUIRY_STATUSES, enquiryStatusSchema, type AdminEnquiry, type AdminEnquiriesResponse } from '@/lib/schemas';
import { cn } from '@/lib/utils';

/** Admin inbox of enquiries from the site's forms. Filters, search and page live in the URL. */
export default function Enquiries() {
  usePageMeta({ title: 'Enquiries | AFRIGULF Exchange admin', description: 'AFRIGULF Exchange admin portal.' });
  const [params, setParams] = useSearchParams();
  const status = enquiryStatusSchema.safeParse(params.get('status')).data;
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [data, setData] = useState<AdminEnquiriesResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<AdminEnquiry | null>(null);
  const [searchInput, setSearchInput] = useState(search);

  function updateParams(changes: Record<string, string | undefined>) {
    setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  // Apply the search box to the URL once typing pauses, starting again from page 1.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => updateParams({ search: searchInput.trim() || undefined, page: undefined }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEnquiries({ status, search, page })
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load enquiries.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, search, page, reload]);

  function handleSaved(enquiry: AdminEnquiry) {
    setSelected(enquiry);
    setReload(n => n + 1); // refresh the list and the status counts
  }

  const counts = data?.statusCounts;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;
  const tabs = [{ value: undefined, label: 'All', count: total }, ...ENQUIRY_STATUSES.map(value => ({ value, label: STATUS_LABELS[value], count: counts?.[value] }))];

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl">Enquiries</h1>
          <p className="mb-0 text-muted-foreground">Messages sent through the site’s enquiry and sign-up forms.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name, email, reference…" aria-label="Search enquiries" className="bg-white pl-9" />
        </div>
      </div>

      <div role="tablist" aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {tabs.map(tab => (
          <Button key={tab.label} role="tab" aria-selected={status === tab.value} size="sm" variant={status === tab.value ? 'default' : 'outline'}
            className={cn(status !== tab.value && 'bg-white')} onClick={() => updateParams({ status: tab.value, page: undefined })}>
            {tab.label}{tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mb-4 grid gap-2">
          <FormAlert tone="error">{error}</FormAlert>
          <Button variant="outline" size="sm" className="w-fit bg-white" onClick={() => setReload(n => n + 1)}>Try again</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-white" aria-busy={loading}>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-[#f8fafc] text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Received</th>
              <th scope="col" className="px-4 py-3 font-semibold">From</th>
              <th scope="col" className="px-4 py-3 font-semibold">Interest</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Country</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className={cn(loading && data && 'opacity-60')}>
            {data?.enquiries.map(enquiry => (
              <tr key={enquiry.reference} className="cursor-pointer border-b border-border last:border-0 hover:bg-[#f8fafc]" onClick={() => setSelected(enquiry)}>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatReceived(enquiry.createdAt)}</td>
                <td className="px-4 py-3">
                  {/* The row is clickable for mouse users; this button makes it reachable by keyboard and screen readers. */}
                  <button type="button" className="border-0 bg-transparent p-0 text-left font-semibold hover:underline" onClick={e => { e.stopPropagation(); setSelected(enquiry); }}>
                    {enquiry.name}
                  </button>
                  <div className="text-muted-foreground">{enquiry.email}</div>
                </td>
                <td className="px-4 py-3">{enquiry.interest}</td>
                <td className="hidden px-4 py-3 md:table-cell">{enquiry.country}</td>
                <td className="px-4 py-3"><EnquiryStatusBadge status={enquiry.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !data && <p role="status" className="m-0 px-4 py-10 text-center text-muted-foreground">Loading enquiries…</p>}
        {data && data.enquiries.length === 0 && (
          <p className="m-0 px-4 py-10 text-center text-muted-foreground">{search || status ? 'No enquiries match these filters.' : 'No enquiries yet.'}</p>
        )}
      </div>

      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Page {data.page} of {data.pages} · {data.count} enquiries</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white" disabled={data.page <= 1} onClick={() => updateParams({ page: data.page > 2 ? String(data.page - 1) : undefined })}>Previous</Button>
            <Button variant="outline" size="sm" className="bg-white" disabled={data.page >= data.pages} onClick={() => updateParams({ page: String(data.page + 1) })}>Next</Button>
          </div>
        </nav>
      )}

      <EnquiryDetailSheet enquiry={selected} onClose={() => setSelected(null)} onSaved={handleSaved} />
    </section>
  );
}
