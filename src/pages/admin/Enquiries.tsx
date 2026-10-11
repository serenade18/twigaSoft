import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Mail, PlayCircle, RotateCcw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchEnquiries, updateEnquiry } from '@/adminApi';
import EnquiryDetailSheet, { formatReceived } from '@/components/admin/EnquiryDetailSheet';
import EnquiryStatusBadge, { STATUS_LABELS } from '@/components/admin/EnquiryStatusBadge';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { ENQUIRY_STATUSES, enquiryStatusSchema, type AdminEnquiry, type AdminEnquiriesResponse, type EnquiryStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');

// The quick action on each card moves an enquiry along: new → in progress → closed (→ reopened).
const NEXT_STATUS = {
  new: { status: 'in_progress', label: 'Start', Icon: PlayCircle },
  in_progress: { status: 'closed', label: 'Close', Icon: CheckCircle2 },
  closed: { status: 'new', label: 'Reopen', Icon: RotateCcw },
} as const satisfies Record<EnquiryStatus, { status: EnquiryStatus; label: string; Icon: unknown }>;

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
  const [changing, setChanging] = useState<string | null>(null);

  async function changeStatus(enquiry: AdminEnquiry, next: EnquiryStatus) {
    setChanging(enquiry.reference);
    setError('');
    try {
      await updateEnquiry(enquiry.reference, { status: next });
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the enquiry.');
    } finally {
      setChanging(null);
    }
  }

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

      {loading && !data && <p role="status" className="py-10 text-center text-muted-foreground">Loading enquiries…</p>}
      {data && data.enquiries.length === 0 && (
        <p className="rounded-lg border border-border bg-white px-4 py-10 text-center text-muted-foreground">
          {search || status ? 'No enquiries match these filters.' : 'No enquiries yet.'}
        </p>
      )}
      <ul className={cn('m-0 grid list-none gap-3 p-0 transition-opacity', loading && data && 'opacity-60')} aria-label="Enquiries" aria-busy={loading}>
        {data?.enquiries.map(enquiry => {
          const next = NEXT_STATUS[enquiry.status];
          return (
            <li key={enquiry.reference} aria-label={`Enquiry from ${enquiry.name}`} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-4 pr-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fcf3e4] text-sm font-bold text-[#8a5a12]" aria-hidden="true">{initials(enquiry.name)}</span>
              <div className="min-w-0 flex-1">
                <button type="button" className="mb-0.5 block border-0 bg-transparent p-0 text-left text-base font-semibold hover:underline" onClick={() => setSelected(enquiry)}>
                  {enquiry.name}
                </button>
                <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{enquiry.email}</span>
                  <span className="font-medium text-foreground">{enquiry.interest}</span>
                  <span>{enquiry.country}</span>
                  <span>Received {formatReceived(enquiry.createdAt)}</span>
                </div>
                <p className="mb-2 line-clamp-1 text-sm text-muted-foreground">“{enquiry.message}”</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <EnquiryStatusBadge status={enquiry.status} />
                  <span className="font-mono">{enquiry.reference}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2.5" disabled={changing === enquiry.reference}
                  onClick={() => changeStatus(enquiry, next.status)} aria-label={`${next.label} enquiry from ${enquiry.name}`}>
                  <next.Icon /> {next.label}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2.5" asChild>
                  <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: your enquiry ${enquiry.reference}`)}`} aria-label={`Reply to ${enquiry.name}`}><Mail /> Reply</a>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2.5" onClick={() => setSelected(enquiry)} aria-label={`View enquiry from ${enquiry.name}`}>
                  <Eye /> View
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

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
