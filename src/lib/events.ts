import { useEffect, useState } from 'react';
import { fetchEvents } from '@/api';
import { fallbackEvents } from '@/data/content';
import type { SiteEvent } from '@/lib/schemas';
import type { Detail } from '@/store/useSiteStore';

export const CATEGORY_LABELS: Record<SiteEvent['category'], string> = {
  summit: 'Summits',
  conference: 'Conferences',
  exhibition: 'Exhibitions',
  trade_mission: 'Trade missions',
  workshop: 'Workshops',
  networking: 'Networking',
};

/** Singular names, for a single event's type. */
export const CATEGORY_NAMES: Record<SiteEvent['category'], string> = {
  summit: 'Summit',
  conference: 'Conference',
  exhibition: 'Exhibition',
  trade_mission: 'Trade mission',
  workshop: 'Workshop',
  networking: 'Networking',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Same text the API generates for a blank period (events/models.py `format_period`), e.g. "10–11 March 2027". */
export function formatPeriod(start: string, end?: string | null): string {
  const [sy, sm, sd] = start.split('-').map(Number);
  if (!end || end === start) return `${sd} ${MONTHS[sm - 1]} ${sy}`;
  const [ey, em, ed] = end.split('-').map(Number);
  if (sy === ey && sm === em) return `${sd}–${ed} ${MONTHS[em - 1]} ${ey}`;
  if (sy === ey) return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]} ${ey}`;
  return `${formatPeriod(start)} – ${formatPeriod(end)}`;
}

/** Today as YYYY-MM-DD in the visitor's time zone, to compare with the API's dates. */
export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** An event is past once its last day has gone by. Events without confirmed dates count as upcoming. */
export function isPast(event: SiteEvent, today = todayIso()) {
  const lastDay = event.endDate || event.startDate;
  return !!lastDay && lastDay < today;
}

/**
 * Upcoming events soonest first (unconfirmed dates after dated ones), then past events most recent first.
 * Ties keep the API's order.
 */
export function sortEvents(events: SiteEvent[], today = todayIso()) {
  const rank = (e: SiteEvent) => (isPast(e, today) ? 2 : e.startDate ? 0 : 1);
  return [...events].sort((a, b) => {
    const byGroup = rank(a) - rank(b);
    if (byGroup || !a.startDate || !b.startDate) return byGroup;
    return rank(a) === 2 ? b.startDate.localeCompare(a.startDate) : a.startDate.localeCompare(b.startDate);
  });
}

/** Published events from the API, or the built-in ones when the API is unreachable or empty. `null` while loading. */
export function useEvents() {
  const [events, setEvents] = useState<SiteEvent[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then(list => { if (!cancelled) setEvents(list.length ? list : fallbackEvents); })
      .catch(() => { if (!cancelled) setEvents(fallbackEvents); });
    return () => { cancelled = true; };
  }, []);
  return events;
}

/** Content for the site's details dialog. */
export function eventDetail(event: SiteEvent): Detail {
  return {
    title: event.title,
    description: event.summary,
    points: [`${event.location} · ${event.period}`, event.organiser, 'Register your interest to receive confirmed participation details.'],
  };
}
