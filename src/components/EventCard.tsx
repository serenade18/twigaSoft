import { forwardRef, useEffect, useRef, useState } from 'react';

const EventCard = forwardRef(function EventCard({ event, index, revealClass, onOpen }, ref) {
  const [opened, setOpened] = useState(false);
  const timer = useRef();
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
    <article ref={ref} className={classes} style={{ '--event-delay': `${index * 100}ms` }}
      onClick={e => { if (!e.target.closest('button')) open(); }}>
      <div className={`event-image ${imageClass}`}></div>
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
