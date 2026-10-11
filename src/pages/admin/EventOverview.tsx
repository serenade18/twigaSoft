import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, Copy, ExternalLink, MapPin, Pencil, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { fetchAdminEvent, updateEventFlags } from '@/adminApi';
import EventStatusBadge from '@/components/admin/EventStatusBadge';
import EventThumb from '@/components/admin/EventThumb';
import FormAlert from '@/components/admin/FormAlert';
import Switch from '@/components/admin/Switch';
import { Button } from '@/components/ui/button';
import usePageMeta from '@/hooks/usePageMeta';
import { CATEGORY_NAMES } from '@/lib/events';
import type { AdminEvent } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export interface EventOutletContext {
  event: AdminEvent;
  /** Reload the event (e.g. after a booking changes) so the header and tab counts stay current. */
  refresh: () => void;
}

export const useEventContext = () => useOutletContext<EventOutletContext>();

/** `/admin/events/:id` — the event at a glance (switches, links) with Performance and Attendees tabs below. */
export default function EventOverview() {
  const { id } = useParams() as { id: string };
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '');
  const [saving, setSaving] = useState(false);
  usePageMeta({ title: `${event?.title ?? 'Event'} | AFRIGULF Exchange admin`, description: 'AFRIGULF Exchange admin portal.' });

  // Show the editor's "saved" message once, without it coming back on refresh.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const refresh = useCallback(() => {
    fetchAdminEvent(id).then(setEvent).catch(err => setError(err instanceof Error ? err.message : 'Could not load this event.'));
  }, [id]);
  useEffect(refresh, [refresh]);

  async function setFlag(flags: { bookingsOpen?: boolean; isFeatured?: boolean }) {
    setSaving(true);
    setError('');
    try {
      setEvent(await updateEventFlags(id, flags));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the event.');
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = event ? `${window.location.origin}/events/${event.slug}` : '';
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setNotice('Link copied.');
    } catch {
      setNotice(`Copy this link: ${publicUrl}`);
    }
  }

  if (!event) {
    return error
      ? <section className="mx-auto max-w-6xl"><FormAlert tone="error">{error}</FormAlert></section>
      : <p role="status" className="py-16 text-center text-muted-foreground">Loading event…</p>;
  }

  const tab = 'rounded-md px-4 py-1.5 text-sm font-semibold';

  return (
    <section className="mx-auto max-w-6xl">
      <Link to="/admin/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Events</Link>

      <div className="mb-6 grid gap-6 rounded-xl border border-border bg-white p-5 md:grid-cols-[200px_1fr]">
        <EventThumb imageUrl={event.imageUrl} image={event.image} className="h-40 w-full md:h-full md:min-h-48" />
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <EventStatusBadge event={event} />
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{CATEGORY_NAMES[event.category]}</span>
            {event.isFeatured && <span className="text-xs font-semibold tracking-wide text-[#8a5a12] uppercase">· Featured</span>}
          </div>
          <h1 className="mb-3 text-[clamp(24px,3vw,34px)] leading-tight">{event.title}</h1>
          <ul className="m-0 mb-4 grid list-none gap-1 p-0 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" />{event.period}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden="true" />{event.location}</li>
            <li className="flex items-center gap-2"><UserRound className="size-4" aria-hidden="true" />{event.organiser}</li>
          </ul>
          <div className="mb-4 flex flex-wrap gap-x-10 gap-y-3 rounded-lg border border-border bg-[#f8fafc] px-4 py-3">
            <Switch checked={event.bookingsOpen} disabled={saving} onChange={next => setFlag({ bookingsOpen: next })} label="Bookings open"
              description={event.bookingsOpen ? 'Visitors can book seats' : 'Booking is switched off'} />
            <Switch checked={event.isFeatured} disabled={saving} onChange={next => setFlag({ isFeatured: next })} label="Featured"
              description={event.isFeatured ? 'Leads the home page' : 'Not featured'} />
          </div>
          {(notice || error) && <div className="mb-3">{error ? <FormAlert tone="error">{error}</FormAlert> : <FormAlert tone="success">{notice}</FormAlert>}</div>}
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link to={`/admin/events/${id}/edit`} className="text-primary-foreground!"><Pencil /> Edit event</Link></Button>
            {event.isPublished && (
              <Button variant="outline" asChild><a href={`/events/${event.slug}`} target="_blank" rel="noreferrer"><ExternalLink /> Public page</a></Button>
            )}
            <Button variant="outline" onClick={copyLink} disabled={!event.isPublished} title={event.isPublished ? undefined : 'Publish the event to share it'}><Copy /> Copy link</Button>
          </div>
        </div>
      </div>

      <nav aria-label="Event sections" className="mb-5 inline-flex rounded-lg bg-[#e8eef5] p-1">
        <NavLink to={`/admin/events/${id}`} end className={({ isActive }) => cn(tab, isActive ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Performance</NavLink>
        <NavLink to={`/admin/events/${id}/attendees`} className={({ isActive }) => cn(tab, isActive ? 'bg-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          Attendees ({event.stats.bookings})
        </NavLink>
      </nav>

      <Outlet context={{ event, refresh } satisfies EventOutletContext} />
    </section>
  );
}
