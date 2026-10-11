import { useEffect, useState } from 'react';
import { CalendarPlus, Search } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAdminEvents, updateEventFlags } from '@/adminApi';
import EventThumb from '@/components/admin/EventThumb';
import FormAlert from '@/components/admin/FormAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_LABELS, CATEGORY_NAMES, isPast } from '@/lib/events';
import { EVENT_CATEGORIES, type AdminEvent, type AdminEventsResponse } from '@/lib/schemas';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: undefined, label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
] as const;

/** The event engine's list: every event, drafts included, with quick publish/unpublish. */
export default function AdminEvents() {
  usePageMeta({ title: 'Events | AFRIGULF Exchange admin', description: 'AFRIGULF Exchange admin portal.' });
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // A "saved" message from the editor; kept locally so it neither reappears on refresh nor vanishes when filtering.
  const [notice] = useState((location.state as { notice?: string } | null)?.notice);
  useEffect(() => {
    if (location.state) navigate({ search: location.search }, { replace: true, state: null });
  }, [location.state, location.search, navigate]);
  const status = STATUS_TABS.find(t => t.value && t.value === params.get('status'))?.value;
  const category = EVENT_CATEGORIES.find(c => c === params.get('category'));
  const search = params.get('search') ?? '';

  const [data, setData] = useState<AdminEventsResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [searchInput, setSearchInput] = useState(search);
  const [toggling, setToggling] = useState<string | null>(null);

  function update(changes: Record<string, string | undefined>) {
    setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value); else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  // Apply the search box once typing pauses.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => update({ search: searchInput.trim() || undefined }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchAdminEvents({ status, category, search })
      .then(result => { if (!cancelled) setData(result); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load events.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, category, search, reload]);

  async function togglePublished(event: AdminEvent) {
    setToggling(event.id);
    setError('');
    try {
      await updateEventFlags(event.id, { isPublished: !event.isPublished });
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the event.');
    } finally {
      setToggling(null);
    }
  }

  const counts = data?.statusCounts;
  const countFor = (value: (typeof STATUS_TABS)[number]['value']) =>
    !counts ? undefined : value === 'published' ? counts.published : value === 'draft' ? counts.draft : counts.published + counts.draft;

  return (
    <section className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl">Events</h1>
          <p className="mb-0 text-muted-foreground">Summits and events shown on the site. Drafts stay hidden until you publish them.</p>
        </div>
        <Button asChild><Link to="/admin/events/new" className="text-primary-foreground!"><CalendarPlus /> New event</Link></Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_TABS.map(tab => (
            <Button key={tab.label} role="tab" aria-selected={status === tab.value} size="sm" variant={status === tab.value ? 'default' : 'outline'}
              className={cn(status !== tab.value && 'bg-white')} onClick={() => update({ status: tab.value })}>
              {tab.label}{countFor(tab.value) !== undefined && <span className="tabular-nums opacity-70">{countFor(tab.value)}</span>}
            </Button>
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <select aria-label="Event type" value={category ?? ''} onChange={e => update({ category: e.target.value || undefined })}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm">
            <option value="">All types</option>
            {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <div className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search title, city, organiser…" aria-label="Search events" className="bg-white pl-9" />
          </div>
        </div>
      </div>

      {notice && <div className="mb-4"><FormAlert tone="success">{notice}</FormAlert></div>}
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
              <th scope="col" className="px-4 py-3 font-semibold">Event</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Type</th>
              <th scope="col" className="px-4 py-3 font-semibold">When &amp; where</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Views</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Bookings</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className={cn(loading && data && 'opacity-60')}>
            {data?.events.map(event => (
              <tr key={event.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EventThumb imageUrl={event.imageUrl} image={event.image} className="h-11 w-16 shrink-0" />
                    <div className="min-w-0">
                      <Link to={`/admin/events/${event.id}`} className="font-semibold hover:underline">{event.title}</Link>
                      <div className="truncate text-muted-foreground">{event.organiser}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{CATEGORY_NAMES[event.category]}</td>
                <td className="px-4 py-3">
                  <div>{event.period}</div>
                  <div className="text-muted-foreground">{event.location}{isPast(event) && ' · Past'}</div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{event.stats.views.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <Link to={`/admin/events/${event.id}/attendees`} className="font-semibold hover:underline" aria-label={`${event.stats.bookings} bookings for ${event.title}`}>
                    {event.stats.bookings.toLocaleString()}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {event.capacity ? `${event.stats.seatsBooked}/${event.capacity} seats` : `${event.stats.seatsBooked} seats`}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', event.isPublished
                    ? 'border-[#cfe7d6] bg-[#f0f9f3] text-[#1e6b3a]' : 'border-[#d5dde5] bg-[#f3f5f7] text-[#52667a]')}>
                    {event.isPublished ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={toggling === event.id} onClick={() => togglePublished(event)}
                      aria-label={`${event.isPublished ? 'Unpublish' : 'Publish'} ${event.title}`}>
                      {event.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button variant="outline" size="sm" asChild><Link to={`/admin/events/${event.id}/edit`} aria-label={`Edit ${event.title}`}>Edit</Link></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !data && <p role="status" className="m-0 px-4 py-10 text-center text-muted-foreground">Loading events…</p>}
        {data && data.events.length === 0 && (
          <p className="m-0 px-4 py-10 text-center text-muted-foreground">{search || status || category ? 'No events match these filters.' : 'No events yet. Create your first one.'}</p>
        )}
      </div>
    </section>
  );
}
