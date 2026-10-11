import { useEffect, useState } from 'react';
import { CalendarDays, CalendarPlus, Eye, MapPin, Pencil, Search, Trash2 } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteEvent, fetchAdminEvents, updateEventFlags } from '@/adminApi';
import EventStatusBadge from '@/components/admin/EventStatusBadge';
import EventThumb from '@/components/admin/EventThumb';
import FormAlert from '@/components/admin/FormAlert';
import Switch from '@/components/admin/Switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_LABELS, CATEGORY_NAMES } from '@/lib/events';
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
  const [deleting, setDeleting] = useState<AdminEvent | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deletedNotice, setDeletedNotice] = useState('');

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

  async function confirmDelete() {
    if (!deleting) return;
    setConfirming(true);
    setError('');
    try {
      await deleteEvent(deleting.id);
      setDeletedNotice(`“${deleting.title}” was deleted.`);
      setDeleting(null);
      setReload(n => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the event.');
      setDeleting(null);
    } finally {
      setConfirming(false);
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

      {(deletedNotice || notice) && <div className="mb-4"><FormAlert tone="success">{deletedNotice || notice}</FormAlert></div>}
      {error && (
        <div className="mb-4 grid gap-2">
          <FormAlert tone="error">{error}</FormAlert>
          <Button variant="outline" size="sm" className="w-fit bg-white" onClick={() => setReload(n => n + 1)}>Try again</Button>
        </div>
      )}

      {loading && !data && <p role="status" className="py-10 text-center text-muted-foreground">Loading events…</p>}
      {data && data.events.length === 0 && (
        <p className="rounded-lg border border-border bg-white px-4 py-10 text-center text-muted-foreground">
          {search || status || category ? 'No events match these filters.' : 'No events yet. Create your first one.'}
        </p>
      )}
      <ul className={cn('m-0 grid list-none gap-3 p-0 transition-opacity', loading && data && 'opacity-60')} aria-label="Events" aria-busy={loading}>
        {data?.events.map(event => (
          <li key={event.id} aria-label={event.title} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-3 pr-5">
            <Link to={`/admin/events/${event.id}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
              <EventThumb imageUrl={event.imageUrl} image={event.image} className="h-20 w-24" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/admin/events/${event.id}`} className="mb-1 block truncate text-base font-semibold hover:underline">{event.title}</Link>
              <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden="true" />{event.period}</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{event.location}</span>
                <span>{CATEGORY_NAMES[event.category]}</span>
                <Link to={`/admin/events/${event.id}/attendees`} className="hover:underline">
                  {event.stats.bookings} {event.stats.bookings === 1 ? 'booking' : 'bookings'} · {event.capacity ? `${event.stats.seatsBooked}/${event.capacity} seats` : `${event.stats.seatsBooked} seats`}
                </Link>
                <span>{event.stats.views.toLocaleString()} views</span>
              </div>
              <EventStatusBadge event={event} />
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <div className="mr-3">
                <Switch checked={event.isPublished} disabled={toggling === event.id} onChange={() => togglePublished(event)}
                  label={event.isPublished ? 'Published' : 'Draft'} ariaLabel={`Published: ${event.title}`} />
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/admin/events/${event.id}`} aria-label={`View ${event.title}`}><Eye /> View</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/admin/events/${event.id}/edit`} aria-label={`Edit ${event.title}`}><Pencil /> Edit</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-[#b42318] hover:bg-[#fdf1f0] hover:text-[#b42318]"
                onClick={() => setDeleting(event)} aria-label={`Delete ${event.title}`}>
                <Trash2 /> Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans! tracking-normal!">Delete this event?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” will be removed from the site and can’t be recovered
              {deleting && deleting.stats.bookings > 0 ? `, along with its ${deleting.stats.bookings} booking${deleting.stats.bookings === 1 ? '' : 's'}` : ''}.
              To hide it instead, switch it to draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button className="bg-[#b42318] hover:bg-[#912018]" disabled={confirming} onClick={confirmDelete}>{confirming ? 'Deleting…' : 'Delete event'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
