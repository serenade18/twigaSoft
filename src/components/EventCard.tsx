import { forwardRef, useEffect, useRef, useState, type CSSProperties } from 'react';
import { mediaUrl } from '@/lib/http';
import type { SiteEvent } from '@/lib/schemas';

interface EventCardProps {
  event: SiteEvent;
  index: number;
  revealClass?: string;
  onOpen: (event: SiteEvent) => void;
}

const EventCard = forwardRef<HTMLElement, EventCardProps>(function EventCard({ event, index, revealClass, onOpen }, ref) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function open() {
    onOpen(event);
    setOpened(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpened(false), 450);
  }

  const imageClass = event.image || (index % 2 ? 'image-three' : 'image-one');
  const classes = ['event-card', revealClass, opened && 'event-opened'].filter(Boolean).join(' ');

  return (
    <article ref={ref} className={classes} style={{ '--event-delay': `${index * 100}ms` } as CSSProperties}
      onClick={e => { if (!(e.target as Element).closest('button')) open(); }}>
      <div className={`event-image ${imageClass}`}
        style={event.imageUrl ? { backgroundImage: `url("${mediaUrl(event.imageUrl)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}></div>
      <div className="event-content">
        <small>{event.organiser}</small>
        <h3>{event.title}</h3>
        <p className="event-place">● {event.location} · {event.period}</p>
        <p>{event.summary}</p>
        <button className="button button-dark" type="button" onClick={open}>{event.label || 'View Event'}</button>
      </div>
    </article>
  );
});

export default EventCard;
