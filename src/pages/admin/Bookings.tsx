import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchAllBookings } from '@/adminApi';
import BookingsTable from '@/components/admin/BookingsTable';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { BOOKING_STATUSES, type AllBookingsResponse } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const STATUS_LABELS = { confirmed: 'Confirmed', cancelled: 'Cancelled' } as const;

/** Every booking across events. Filters, search and page live in the URL. */
export default function Bookings() {
  usePageMeta({ title: 'Bookings | AFRIGULF Exchange admin', description: 'AFRIGULF Exchange admin portal.' });
  const [params, setParams] = useSearchParams();
  const status = BOOKING_STATUSES.find(s => s === params.get('status'));
  const event = params.get('event') ?? '';
  const search = params.get('search') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [data, setData] = useState<AllBookingsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [searchInput, setSearchInput] = useState(search);

  function update(changes: Record<string, string | undefined>) {
    setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => update({ search: searchInput.trim() || undefined, page: undefined }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchAllBookings({ event, status, search, page })
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load bookings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [event, status, search, page, reload]);

  const counts = data?.statusCounts;
  const tabs = [
    { value: undefined, label: 'All', count: counts && counts.confirmed + counts.cancelled },
    ...BOOKING_STATUSES.map(value => ({ value, label: STATUS_LABELS[value], count: counts?.[value] })),
  ];

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="mb-1 text-3xl">Bookings</h1>
        <p className="mb-0 text-muted-foreground">Seats booked for events on the site. No payment is taken.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <Button key={tab.label} role="tab" aria-selected={status === tab.value} size="sm" variant={status === tab.value ? 'default' : 'outline'}
              className={cn(status !== tab.value && 'bg-white')} onClick={() => update({ status: tab.value, page: undefined })}>
              {tab.label}{tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
            </Button>
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <select aria-label="Event" value={event} onChange={e => update({ event: e.target.value || undefined, page: undefined })}
            className="h-9 max-w-64 rounded-md border border-input bg-white px-3 text-sm">
            <option value="">All events</option>
            {data?.events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name, email, reference…" aria-label="Search bookings" className="bg-white pl-9" />
          </div>
        </div>
      </div>

      {error && <div className="mb-4"><FormAlert tone="error">{error}</FormAlert></div>}

      <BookingsTable bookings={data?.bookings} loading={loading} showEvent onError={setError} onChanged={() => setReload(n => n + 1)}
        empty={search || status || event ? 'No bookings match these filters.' : 'No bookings yet.'} />

      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Page {data.page} of {data.pages} · {data.count} bookings</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-white" disabled={data.page <= 1} onClick={() => update({ page: data.page > 2 ? String(data.page - 1) : undefined })}>Previous</Button>
            <Button variant="outline" size="sm" className="bg-white" disabled={data.page >= data.pages} onClick={() => update({ page: String(data.page + 1) })}>Next</Button>
          </div>
        </nav>
      )}
    </section>
  );
}
