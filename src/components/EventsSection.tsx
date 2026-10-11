import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import EventCard from '@/components/EventCard';
import usePrefersReducedMotion from '@/hooks/usePrefersReducedMotion';
import { isPast, useEvents } from '@/lib/events';
import type { SiteEvent } from '@/lib/schemas';

// The home page features the first few upcoming events (in the order set in the CMS); the rest live on /events.
const FEATURED_COUNT = 4;

// Tracks which observed elements are on screen so they can fade in and out.
function useRevealState(count: number, enabled: boolean) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const active = enabled && 'IntersectionObserver' in window;

  useEffect(() => {
    if (!active) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(prev => {
        const next = { ...prev };
        entries.forEach(entry => { next[(entry.target as HTMLElement).dataset.reveal!] = entry.isIntersecting; });
        return next;
      });
    }, { threshold: 0.12 });
    refs.current.slice(0, count).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count, active]);

  const revealClass = (index: number) => (active ? `event-reveal${visible[index] ? ' event-visible' : ''}` : undefined);
  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
    if (el) el.dataset.reveal = String(index);
  };
  return { revealClass, setRef };
}

interface EventsSectionProps {
  onOpen: (event: SiteEvent) => void;
}

export default function EventsSection({ onOpen }: EventsSectionProps) {
  const all = useEvents();
  const events = all && all.filter(event => !isPast(event)).slice(0, FEATURED_COUNT);
  const reducedMotion = usePrefersReducedMotion();

  const { revealClass, setRef } = useRevealState(events ? events.length + 1 : 0, !!events && !reducedMotion);

  return (
    <section className="section events" id="events">
      <div className="container">
        <div ref={setRef(0)} className={['center-heading', revealClass(0)].filter(Boolean).join(' ')}>
          <p className="eyebrow">FEATURED EVENTS</p>
          <h2>Featured Summits | Events &amp; Updates</h2>
          <p>High-level platforms that bring together business leaders, investors and change-makers.</p>
        </div>
        <div className="event-grid" id="event-grid">
          {events
            ? events.map((event, i) => (
              <EventCard key={event.slug || event.title} ref={setRef(i + 1)} event={event} index={i} revealClass={revealClass(i + 1)} onOpen={onOpen} />
            ))
            : <p className="loading">Loading featured events…</p>}
          {events?.length === 0 && <p>New events will be announced soon.</p>}
        </div>
        <p className="event-note">Event details and registration are subject to confirmation.</p>
        <p className="mt-6 mb-0 text-center">
          <Link className="button button-dark" to="/events">View all summits &amp; events →</Link>
        </p>
      </div>
    </section>
  );
}
