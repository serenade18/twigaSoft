import { useEffect, useRef } from 'react';

// detail: { title, description, points } or null when closed.
export default function DetailDialog({ detail, onClose, onEnquire }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (detail && !dialog.open) dialog.showModal();
    if (!detail && dialog.open) dialog.close();
  }, [detail]);

  return (
    <dialog id="detail-dialog" ref={ref} aria-labelledby="detail-title" onClose={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      <button className="dialog-close" type="button" aria-label="Close details" onClick={onClose}>×</button>
      <div className="dialog-content">
        <p className="eyebrow">AFRIGULF EXCHANGE</p>
        <h2 id="detail-title">{detail?.title}</h2>
        <p id="detail-description">{detail?.description}</p>
        <ul id="detail-points">{detail?.points.map(point => <li key={point}>{point}</li>)}</ul>
        <button className="button button-gold" id="detail-enquire" type="button" onClick={() => onEnquire(detail.title)}>Enquire about this →</button>
      </div>
    </dialog>
  );
}
