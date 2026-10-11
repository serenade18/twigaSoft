import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { downloadBookingsCsv, fetchEventBookings } from '@/adminApi';
import BookingList from '@/components/admin/BookingList';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BOOKING_STATUS_LABELS, BOOKING_STATUSES, type AdminBookingsResponse, type BookingStatus } from '@/lib/schemas';
import { cn } from '@/lib/utils';
import { useEventContext } from '@/pages/admin/EventOverview';

const STATUS_TABS: { value?: BookingStatus; label: string }[] = [
  { value: undefined, label: 'All' },
  ...BOOKING_STATUSES.map(value => ({ value, label: BOOKING_STATUS_LABELS[value] })),
];

/** Attendees tab: the event's bookings, with approve/decline, notes and CSV export. */
export default function EventAttendees() {
  const { event, refresh } = useEventContext();
  const [status, setStatus] = useState<BookingStatus | undefined>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<AdminBookingsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEventBookings(event.id, { status, search })
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load bookings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [event.id, status, search, reload]);

  async function exportCsv() {
    setError('');
    try {
      await downloadBookingsCsv(event.id, `${event.slug}-bookings.csv`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the bookings.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => {
            const count = !data ? undefined : tab.value ? data.statusCounts[tab.value] : data.statusCounts.pending + data.statusCounts.confirmed + data.statusCounts.cancelled;
            return (
              <Button key={tab.label} role="tab" aria-selected={status === tab.value} size="sm" variant={status === tab.value ? 'default' : 'outline'}
                className={cn(status !== tab.value && 'bg-white')} onClick={() => setStatus(tab.value)}>
                {tab.label}{count !== undefined && <span className="tabular-nums opacity-70">{count}</span>}
              </Button>
            );
          })}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name, email, reference…" aria-label="Search bookings" className="bg-white pl-9" />
          </div>
          <Button variant="outline" className="bg-white" onClick={exportCsv} disabled={!data || data.bookings.length === 0}><Download /> Export CSV</Button>
        </div>
      </div>

      {error && <div className="mb-4"><FormAlert tone="error">{error}</FormAlert></div>}

      <BookingList bookings={data?.bookings} loading={loading} onError={setError}
        empty={search || status ? 'No bookings match these filters.' : 'No bookings yet.'}
        onChanged={() => { setReload(n => n + 1); refresh(); }} />
    </div>
  );
}
