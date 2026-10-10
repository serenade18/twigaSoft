import { useEffect, useRef, useState } from 'react';
import { fetchEvents } from '../api';
import { fallbackEvents } from '../data/content';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import EventCard from './EventCard';

// Tracks which of the observed elements are on screen; returns null when reveal is disabled.
function useRevealState(count, enabled) {
  const refs = useRef([]);
  const [visible, setVisible] = useState({});
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      setVisible(prev => {
        const next = { ...prev };
        entries.forEach(entry => { next[entry.target.dataset.reveal] = entry.isIntersecting; });
        return next;
      });
    }, { threshold: 0.12 });
    refs.current.slice(0, count).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count, enabled]);
  const active = enabled && 'IntersectionObserver' in window;
  const revealClass = key => (active ? `event-reveal${visible[key] ? ' event-visible' : ''}` : undefined);
  const setRef = index => el => { refs.current[index] = el; if (el) el.dataset.reveal = index; };
  return { revealClass, setRef };
}

export default function EventsSection({ onOpen }) {
  const [events, setEvents] = useState(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then(list => { if (!cancelled) setEvents(list?.length ? list : fallbackEvents); })
      .catch(() => { if (!cancelled) setEvents(fallbackEvents); });
    return () => { cancelled = true; };
  }, []);

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
        </div>
        <p className="event-note">Event details and registration are subject to confirmation.</p>
      </div>
    </section>
  );
}
