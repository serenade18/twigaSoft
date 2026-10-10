import { useEffect, useRef, useState } from 'react';
import { heroSlides } from '../data/content';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

function usePageHidden() {
  const [hidden, setHidden] = useState(document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

// Advances only to successfully loaded images; pauses while the page is hidden.
export default function HeroSlideshow() {
  const imageRefs = useRef([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const pageHidden = usePageHidden();
  const frozen = paused || reducedMotion || pageHidden;
  const shown = reducedMotion ? 0 : active;

  useEffect(() => { if (reducedMotion) setActive(0); }, [reducedMotion]);

  useEffect(() => {
    if (frozen) return;
    const timer = setInterval(() => {
      setActive(current => {
        const ready = imageRefs.current
          .map((img, index) => ({ img, index }))
          .filter(({ img }) => img?.complete && img.naturalWidth > 0);
        if (ready.length < 2) return current;
        const position = ready.findIndex(item => item.index === current);
        return ready[(position + 1) % ready.length].index;
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [frozen]);

  const label = paused ? 'Play background slideshow' : 'Pause background slideshow';

  return (
    <>
      <div className={`hero-image hero-slideshow${frozen ? ' is-paused' : ''}`} aria-hidden="true">
        {heroSlides.map((slide, index) => (
          <img key={slide.src} ref={el => { imageRefs.current[index] = el; }}
            className={`hero-slide ${slide.className}${index === shown ? ' is-active' : ''}`}
            src={slide.src} alt="" width={slide.width} height={slide.height}
            fetchpriority={index === 0 ? 'high' : undefined} />
        ))}
      </div>
      <button className="hero-motion-control" type="button" hidden={reducedMotion} aria-label={label} aria-pressed={paused} title={label}
        onClick={() => setPaused(p => !p)}>
        {paused ? 'Play' : 'Pause'}
      </button>
    </>
  );
}
